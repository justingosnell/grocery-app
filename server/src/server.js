const http = require('node:http');
const {
  createItem,
  createList,
  deleteItem,
  deleteList,
  getList,
  listLists,
  updateItem,
  updateList,
} = require('./lists');
const { requireAuth } = require('./auth');
const { methodNotAllowed, notFound, parseJson, send } = require('./http');
const { pool } = require('./db');

const port = Number(process.env.PORT || 8080);

function corsHeaders(request) {
  const origin = request.headers.origin;
  const allowed = (process.env.CORS_ORIGIN || '*')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const allowOrigin = allowed.includes('*') || !origin
    ? '*'
    : allowed.includes(origin)
      ? origin
      : allowed[0] || '*';

  return {
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-max-age': '86400',
  };
}

function pathParts(request) {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  return url.pathname.split('/').filter(Boolean);
}

async function route(request, response) {
  const headers = corsHeaders(request);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  const parts = pathParts(request);

  if (parts.length === 1 && parts[0] === 'health') {
    send(response, 200, {
      ok: true,
      service: 'grocery-app-server',
      databaseConfigured: Boolean(process.env.DATABASE_URL),
    }, headers);
    return;
  }

  if (parts[0] !== 'api') {
    notFound(response);
    return;
  }

  const auth = await requireAuth(request);
  const ownerScope = { ownerClerkId: auth.userId };

  if (parts.length === 2 && parts[1] === 'lists') {
    if (request.method === 'GET') {
      send(response, 200, {
        lists: await listLists(ownerScope),
      }, headers);
      return;
    }

    if (request.method === 'POST') {
      const payload = await parseJson(request);
      send(response, 201, {
        list: await createList({
          ...payload,
          ownerClerkId: auth.userId,
          ownerEmail: auth.email || payload.ownerEmail,
        }),
      }, headers);
      return;
    }

    methodNotAllowed(response);
    return;
  }

  if (parts.length === 3 && parts[1] === 'lists') {
    const id = parts[2];

    if (request.method === 'GET') {
      const list = await getList(id, ownerScope);
      if (!list) {
        notFound(response);
        return;
      }
      send(response, 200, { list }, headers);
      return;
    }

    if (request.method === 'PUT' || request.method === 'PATCH') {
      const payload = await parseJson(request);
      const list = await updateList(id, { ...payload, ...ownerScope });
      if (!list) {
        notFound(response);
        return;
      }
      send(response, 200, { list }, headers);
      return;
    }

    if (request.method === 'DELETE') {
      const deleted = await deleteList(id, ownerScope);
      if (!deleted) {
        notFound(response);
        return;
      }
      send(response, 200, { ok: true }, headers);
      return;
    }

    methodNotAllowed(response);
    return;
  }

  if (parts.length === 4 && parts[1] === 'lists' && parts[3] === 'items') {
    if (request.method !== 'POST') {
      methodNotAllowed(response);
      return;
    }

    const payload = await parseJson(request);
    const item = await createItem(parts[2], { ...payload, ...ownerScope });
    if (!item) {
      notFound(response);
      return;
    }
    send(response, 201, { item }, headers);
    return;
  }

  if (parts.length === 3 && parts[1] === 'items') {
    const id = parts[2];

    if (request.method === 'PUT' || request.method === 'PATCH') {
      const payload = await parseJson(request);
      const item = await updateItem(id, { ...payload, ...ownerScope });
      if (!item) {
        notFound(response);
        return;
      }
      send(response, 200, { item }, headers);
      return;
    }

    if (request.method === 'DELETE') {
      const deleted = await deleteItem(id, ownerScope);
      if (!deleted) {
        notFound(response);
        return;
      }
      send(response, 200, { ok: true }, headers);
      return;
    }

    methodNotAllowed(response);
    return;
  }

  notFound(response);
}

const server = http.createServer((request, response) => {
  route(request, response).catch((error) => {
    const statusCode = error.statusCode || 500;
    const message = statusCode >= 500
      ? 'Internal server error.'
      : error.publicMessage || error.message;
    console.error(error);
    send(response, statusCode, { error: message }, corsHeaders(request));
  });
});

server.listen(port, '0.0.0.0', () => {
  process.stdout.write(`Grocery API listening on ${port}\n`);
});

process.on('SIGTERM', async () => {
  server.close();
  await pool.end();
});
