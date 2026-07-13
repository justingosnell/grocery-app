const { pool } = require('./db');

const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com';
const SPOONACULAR_IMAGE_BASE_URL = 'https://img.spoonacular.com';
const OPEN_FOOD_FACTS_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';

const CATEGORY_FALLBACK_IMAGES = {
  Produce: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
  Dairy: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=400&q=80',
  Bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
  Meat: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=400&q=80',
  Seafood: 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=400&q=80',
  Frozen: 'https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?auto=format&fit=crop&w=400&q=80',
  Pantry: 'https://images.unsplash.com/photo-1584473457409-ae5c91d7d8b3?auto=format&fit=crop&w=400&q=80',
  Drinks: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=400&q=80',
  Snacks: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=400&q=80',
  Household: 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=400&q=80',
  Other: 'https://images.unsplash.com/photo-1601599963565-b7ba29c8c84f?auto=format&fit=crop&w=400&q=80',
};

let spoonacularQueue = Promise.resolve();
let lastSpoonacularRequestAt = 0;

function normalizeName(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(value = '', maxLength = 120) {
  return String(value || '').trim().slice(0, maxLength);
}

function cleanImageUrl(value = '') {
  const url = String(value || '').trim();
  if (!/^https:\/\//i.test(url)) return '';
  return url;
}

function cacheRowToResult(row, cache = 'hit') {
  if (!row) return null;
  return {
    name: row.display_name,
    normalizedName: row.normalized_name,
    category: row.category || null,
    imageUrl: row.image_url,
    source: row.source,
    sourceId: row.source_id || null,
    confidence: Number(row.confidence || 0.5),
    cache,
  };
}

async function findCachedImage(normalizedName) {
  if (!process.env.DATABASE_URL) return null;
  const result = await pool.query(`
    update grocery_image_cache
    set lookup_count = lookup_count + 1,
        last_used_at = now()
    where normalized_name = $1
    returning normalized_name, display_name, category, image_url, source, source_id, confidence
  `, [normalizedName]);
  return cacheRowToResult(result.rows[0]);
}

async function saveCachedImage(payload) {
  if (!process.env.DATABASE_URL || !payload?.imageUrl) return payload;
  const result = await pool.query(`
    insert into grocery_image_cache (
      normalized_name, display_name, category, image_url, source, source_id, confidence
    )
    values ($1, $2, $3, $4, $5, $6, $7)
    on conflict (normalized_name) do update
      set display_name = excluded.display_name,
          category = coalesce(excluded.category, grocery_image_cache.category),
          image_url = excluded.image_url,
          source = excluded.source,
          source_id = excluded.source_id,
          confidence = excluded.confidence,
          lookup_count = grocery_image_cache.lookup_count + 1,
          last_used_at = now()
    returning normalized_name, display_name, category, image_url, source, source_id, confidence
  `, [
    payload.normalizedName,
    payload.name,
    payload.category || null,
    payload.imageUrl,
    payload.source,
    payload.sourceId || null,
    payload.confidence || 0.5,
  ]);
  return cacheRowToResult(result.rows[0], 'stored') || payload;
}

async function throttledSpoonacularFetch(url) {
  const run = async () => {
    const elapsed = Date.now() - lastSpoonacularRequestAt;
    if (elapsed < 1100) {
      await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed));
    }
    lastSpoonacularRequestAt = Date.now();
    return fetch(url);
  };

  const next = spoonacularQueue.then(run, run);
  spoonacularQueue = next.catch(() => {});
  return next;
}

async function lookupSpoonacularImage({ name, normalizedName, category }) {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return null;

  const productUrl = new URL('/food/products/search', SPOONACULAR_BASE_URL);
  productUrl.searchParams.set('query', name);
  productUrl.searchParams.set('number', '1');
  productUrl.searchParams.set('apiKey', apiKey);

  const productResponse = await throttledSpoonacularFetch(productUrl);
  if (productResponse.ok) {
    const data = await productResponse.json();
    const product = data.products?.find((candidate) => cleanImageUrl(candidate.image));
    if (product) {
      return {
        name,
        normalizedName,
        category,
        imageUrl: cleanImageUrl(product.image),
        source: 'spoonacular',
        sourceId: product.id ? String(product.id) : null,
        confidence: 0.92,
      };
    }
  }

  const ingredientUrl = new URL('/food/ingredients/search', SPOONACULAR_BASE_URL);
  ingredientUrl.searchParams.set('query', name);
  ingredientUrl.searchParams.set('number', '1');
  ingredientUrl.searchParams.set('apiKey', apiKey);

  const ingredientResponse = await throttledSpoonacularFetch(ingredientUrl);
  if (!ingredientResponse.ok) return null;
  const data = await ingredientResponse.json();
  const ingredient = data.results?.find((candidate) => candidate.image);
  if (!ingredient) return null;

  return {
    name,
    normalizedName,
    category,
    imageUrl: `${SPOONACULAR_IMAGE_BASE_URL}/ingredients_250x250/${encodeURIComponent(ingredient.image)}`,
    source: 'spoonacular',
    sourceId: ingredient.id ? String(ingredient.id) : null,
    confidence: 0.84,
  };
}

async function lookupOpenFoodFactsImage({ name, normalizedName, category }) {
  const url = new URL(OPEN_FOOD_FACTS_SEARCH_URL);
  url.searchParams.set('search_terms', name);
  url.searchParams.set('search_simple', '1');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page_size', '8');
  url.searchParams.set('fields', 'code,product_name,brands,image_front_url,image_url');

  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  const product = (data.products || []).find((candidate) => cleanImageUrl(candidate.image_front_url || candidate.image_url));
  const imageUrl = cleanImageUrl(product?.image_front_url || product?.image_url);
  if (!imageUrl) return null;

  return {
    name,
    normalizedName,
    category,
    imageUrl,
    source: 'openfoodfacts',
    sourceId: product.code || null,
    confidence: 0.68,
  };
}

function fallbackImage({ name, normalizedName, category }) {
  const imageUrl = CATEGORY_FALLBACK_IMAGES[category] || CATEGORY_FALLBACK_IMAGES.Other;
  return {
    name,
    normalizedName,
    category,
    imageUrl,
    source: 'fallback',
    sourceId: category || 'Other',
    confidence: 0.3,
  };
}

async function resolveImage({ name, category }) {
  const cleanName = cleanText(name);
  const normalizedName = normalizeName(cleanName);
  const cleanCategory = cleanText(category || 'Other', 60) || 'Other';
  if (!normalizedName) {
    const error = new Error('Item name is required.');
    error.statusCode = 400;
    error.publicMessage = 'Item name is required.';
    throw error;
  }

  const cached = await findCachedImage(normalizedName);
  if (cached) return cached;

  let resolved = null;
  try {
    resolved = await lookupSpoonacularImage({ name: cleanName, normalizedName, category: cleanCategory });
  } catch (error) {
    console.warn('Spoonacular image lookup failed:', error.message);
  }

  if (!resolved) {
    try {
      resolved = await lookupOpenFoodFactsImage({ name: cleanName, normalizedName, category: cleanCategory });
    } catch (error) {
      console.warn('Open Food Facts image lookup failed:', error.message);
    }
  }

  return saveCachedImage(resolved || fallbackImage({ name: cleanName, normalizedName, category: cleanCategory }));
}

module.exports = {
  resolveImage,
};
