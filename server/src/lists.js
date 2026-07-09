const { withClient, withTransaction } = require('./db');

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mapItem(row) {
  return {
    id: row.id,
    listId: row.list_id,
    name: row.name,
    quantity: Number(row.quantity),
    unit: row.unit,
    emoji: row.emoji,
    category: row.category,
    estimatedPrice: row.estimated_price === null ? null : Number(row.estimated_price),
    imageUrl: row.image_url,
    brand: row.brand,
    barcode: row.barcode,
    notes: row.notes,
    sortOrder: row.sort_order,
    completed: row.completed,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapList(row, items = []) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  };
}

function normalizeListPayload(payload) {
  const name = String(payload.name || '').trim();
  if (!name) {
    throw Object.assign(new Error('List name is required.'), { statusCode: 400 });
  }

  return {
    name,
    description: payload.description ? String(payload.description).trim() : null,
    ownerId: payload.ownerId || null,
    ownerClerkId: payload.ownerClerkId ? String(payload.ownerClerkId).trim() : null,
    ownerEmail: payload.ownerEmail ? String(payload.ownerEmail).trim().toLowerCase() : null,
    ownerName: payload.ownerName ? String(payload.ownerName).trim() : null,
  };
}

function normalizeItemPayload(payload) {
  const name = String(payload.name || '').trim();
  if (!name) {
    throw Object.assign(new Error('Item name is required.'), { statusCode: 400 });
  }

  return {
    name,
    quantity: toNumber(payload.quantity) || 1,
    unit: payload.unit ? String(payload.unit).trim() : null,
    emoji: payload.emoji ? String(payload.emoji).trim().slice(0, 16) : null,
    category: payload.category ? String(payload.category).trim() : 'Other',
    estimatedPrice: toNumber(payload.estimatedPrice ?? payload.price),
    imageUrl: payload.imageUrl ? String(payload.imageUrl).trim() : null,
    brand: payload.brand ? String(payload.brand).trim() : null,
    barcode: payload.barcode ? String(payload.barcode).trim() : null,
    notes: payload.notes ? String(payload.notes).trim() : null,
    sortOrder: Number.isInteger(Number(payload.sortOrder)) ? Number(payload.sortOrder) : 0,
    completed: Boolean(payload.completed),
  };
}

async function resolveOwnerId(client, payload) {
  if (payload.ownerId) return payload.ownerId;
  if (!payload.ownerClerkId && !payload.ownerEmail) return null;

  const result = await client.query(`
    insert into app_users (clerk_user_id, email, display_name)
    values ($1, $2, $3)
    on conflict (clerk_user_id) do update
    set email = coalesce(excluded.email, app_users.email),
        display_name = coalesce(excluded.display_name, app_users.display_name)
    returning id
  `, [payload.ownerClerkId, payload.ownerEmail, payload.ownerName]);

  return result.rows[0].id;
}

async function listLists(filters = {}) {
  return withClient(async (client) => {
    const ownerEmail = filters.ownerEmail ? String(filters.ownerEmail).trim().toLowerCase() : null;
    const ownerClerkId = filters.ownerClerkId ? String(filters.ownerClerkId).trim() : null;
    const ownerId = filters.ownerId || null;
    const values = [];
    const where = ['l.is_archived = false'];

    if (ownerClerkId) {
      values.push(ownerClerkId);
      where.push(`u.clerk_user_id = $${values.length}`);
    }

    if (ownerEmail) {
      values.push(ownerEmail);
      where.push(`u.email = $${values.length}`);
    }

    if (ownerId) {
      values.push(ownerId);
      where.push(`l.owner_id = $${values.length}`);
    }

    const lists = await client.query(`
      select l.*
      from grocery_lists
      l left join app_users u on u.id = l.owner_id
      where ${where.join(' and ')}
      order by l.updated_at desc
    `, values);

    if (lists.rows.length === 0) return [];

    const items = await client.query(`
      select *
      from grocery_items
      where list_id = any($1::uuid[])
      order by sort_order asc, created_at asc
    `, [lists.rows.map((row) => row.id)]);

    const itemsByList = new Map();
    for (const item of items.rows) {
      const bucket = itemsByList.get(item.list_id) || [];
      bucket.push(mapItem(item));
      itemsByList.set(item.list_id, bucket);
    }

    return lists.rows.map((row) => mapList(row, itemsByList.get(row.id) || []));
  });
}

function ownerWhere(filters = {}, values = []) {
  const clauses = [];
  if (filters.ownerClerkId) {
    values.push(String(filters.ownerClerkId).trim());
    clauses.push(`u.clerk_user_id = $${values.length}`);
  }
  if (filters.ownerEmail) {
    values.push(String(filters.ownerEmail).trim().toLowerCase());
    clauses.push(`u.email = $${values.length}`);
  }
  if (filters.ownerId) {
    values.push(filters.ownerId);
    clauses.push(`l.owner_id = $${values.length}`);
  }
  return clauses.length ? ` and ${clauses.join(' and ')}` : '';
}

async function getList(id, filters = {}) {
  return withClient(async (client) => {
    const values = [id];
    const list = await client.query(`
      select l.*
      from grocery_lists l
      left join app_users u on u.id = l.owner_id
      where l.id = $1${ownerWhere(filters, values)}
    `, values);
    if (list.rows.length === 0) return null;

    const items = await client.query(`
      select *
      from grocery_items
      where list_id = $1
      order by sort_order asc, created_at asc
    `, [id]);

    return mapList(list.rows[0], items.rows.map(mapItem));
  });
}

async function createList(payload) {
  const listPayload = normalizeListPayload(payload);
  const rawItems = Array.isArray(payload.items) ? payload.items : [];

  return withTransaction(async (client) => {
    const ownerId = await resolveOwnerId(client, listPayload);
    let list;

    if (ownerId) {
      list = await client.query(`
        select *
        from grocery_lists
        where owner_id = $1
          and lower(name) = lower($2)
          and is_archived = false
        limit 1
      `, [ownerId, listPayload.name]);

      if (list.rows.length > 0) {
        list = await client.query(`
          update grocery_lists
          set name = $2, description = $3
          where id = $1
          returning *
        `, [list.rows[0].id, listPayload.name, listPayload.description]);
      } else {
        list = await client.query(`
          insert into grocery_lists (owner_id, name, description)
          values ($1, $2, $3)
          returning *
        `, [ownerId, listPayload.name, listPayload.description]);
      }

      await client.query('delete from grocery_items where list_id = $1', [list.rows[0].id]);
    } else {
      list = await client.query(`
        insert into grocery_lists (owner_id, name, description)
        values ($1, $2, $3)
        returning *
      `, [ownerId, listPayload.name, listPayload.description]);
    }

    const items = [];
    for (const [index, rawItem] of rawItems.entries()) {
      const item = normalizeItemPayload({ ...rawItem, sortOrder: rawItem.sortOrder ?? index });
      const inserted = await insertItem(client, list.rows[0].id, item);
      items.push(mapItem(inserted));
    }

    return mapList(list.rows[0], items);
  });
}

async function updateList(id, payload) {
  return withClient(async (client) => {
    const fields = [];
    const values = [];

    if (payload.name !== undefined) {
      const name = String(payload.name || '').trim();
      if (!name) throw Object.assign(new Error('List name cannot be blank.'), { statusCode: 400 });
      values.push(name);
      fields.push(`name = $${values.length}`);
    }

    if (payload.description !== undefined) {
      values.push(payload.description ? String(payload.description).trim() : null);
      fields.push(`description = $${values.length}`);
    }

    if (payload.isArchived !== undefined) {
      values.push(Boolean(payload.isArchived));
      fields.push(`is_archived = $${values.length}`);
    }

    const filters = {
      ownerClerkId: payload.ownerClerkId,
      ownerEmail: payload.ownerEmail,
      ownerId: payload.ownerId,
    };

    if (fields.length === 0) return getList(id, filters);

    values.push(id);
    const ownerValues = [...values];
    const result = await client.query(`
      update grocery_lists l
      set ${fields.join(', ')}
      from app_users u
      where l.id = $${values.length}
        and u.id = l.owner_id${ownerWhere(filters, ownerValues)}
      returning l.*
    `, ownerValues);

    if (result.rows.length === 0) return null;
    return getList(id, filters);
  });
}

async function deleteList(id, filters = {}) {
  return withClient(async (client) => {
    const values = [id];
    const result = await client.query(`
      delete from grocery_lists l
      using app_users u
      where l.id = $1
        and u.id = l.owner_id${ownerWhere(filters, values)}
      returning l.id
    `, values);
    return result.rows.length > 0;
  });
}

function itemValues(listId, item) {
  return [
    listId,
    item.name,
    item.quantity,
    item.unit,
    item.emoji,
    item.category,
    item.estimatedPrice,
    item.imageUrl,
    item.brand,
    item.barcode,
    item.notes,
    item.sortOrder,
    item.completed,
  ];
}

async function insertItem(client, listId, item) {
  const result = await client.query(`
    insert into grocery_items (
      list_id, name, quantity, unit, emoji, category, estimated_price,
      image_url, brand, barcode, notes, sort_order, completed
    )
    values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    returning *
  `, itemValues(listId, item));

  return result.rows[0];
}

async function createItem(listId, payload) {
  const item = normalizeItemPayload(payload);
  return withClient(async (client) => {
    const filters = {
      ownerClerkId: payload.ownerClerkId,
      ownerEmail: payload.ownerEmail,
      ownerId: payload.ownerId,
    };
    const values = [listId];
    const exists = await client.query(`
      select l.id
      from grocery_lists l
      left join app_users u on u.id = l.owner_id
      where l.id = $1${ownerWhere(filters, values)}
    `, values);
    if (exists.rows.length === 0) return null;
    return mapItem(await insertItem(client, listId, item));
  });
}

async function updateItem(id, payload) {
  return withClient(async (client) => {
    const fields = [];
    const values = [];
    const allowed = {
      name: 'name',
      quantity: 'quantity',
      unit: 'unit',
      emoji: 'emoji',
      category: 'category',
      estimatedPrice: 'estimated_price',
      price: 'estimated_price',
      imageUrl: 'image_url',
      brand: 'brand',
      barcode: 'barcode',
      notes: 'notes',
      sortOrder: 'sort_order',
      completed: 'completed',
    };
    const filters = {
      ownerClerkId: payload.ownerClerkId,
      ownerEmail: payload.ownerEmail,
      ownerId: payload.ownerId,
    };

    for (const [key, column] of Object.entries(allowed)) {
      if (payload[key] === undefined) continue;
      let value = payload[key];
      if (key === 'name') {
        value = String(value || '').trim();
        if (!value) throw Object.assign(new Error('Item name cannot be blank.'), { statusCode: 400 });
      }
      if (key === 'quantity' || key === 'estimatedPrice' || key === 'price') value = toNumber(value);
      if (key === 'sortOrder') value = Number(value) || 0;
      if (key === 'completed') value = Boolean(value);
      values.push(value === '' ? null : value);
      fields.push(`${column} = $${values.length}`);
    }

    if (fields.length === 0) {
      const ownerValues = [id];
      const current = await client.query(`
        select i.*
        from grocery_items i
        join grocery_lists l on l.id = i.list_id
        left join app_users u on u.id = l.owner_id
        where i.id = $1${ownerWhere(filters, ownerValues)}
      `, ownerValues);
      return current.rows[0] ? mapItem(current.rows[0]) : null;
    }

    values.push(id);
    const ownerValues = [...values];
    const result = await client.query(`
      update grocery_items i
      set ${fields.join(', ')}
      from grocery_lists l
      left join app_users u on u.id = l.owner_id
      where i.id = $${values.length}
        and l.id = i.list_id${ownerWhere(filters, ownerValues)}
      returning i.*
    `, ownerValues);

    return result.rows[0] ? mapItem(result.rows[0]) : null;
  });
}

async function deleteItem(id, filters = {}) {
  return withClient(async (client) => {
    const values = [id];
    const result = await client.query(`
      delete from grocery_items i
      using grocery_lists l, app_users u
      where i.id = $1
        and l.id = i.list_id
        and u.id = l.owner_id${ownerWhere(filters, values)}
      returning i.id
    `, values);
    return result.rows.length > 0;
  });
}

module.exports = {
  createItem,
  createList,
  deleteItem,
  deleteList,
  getList,
  listLists,
  updateItem,
  updateList,
};
