const STORAGE_KEYS = {
  currentList: 'currentList',
  savedLists: 'savedLists',
  purchaseMemory: 'groceryPurchaseMemory',
  productImageCache: 'groceryProductImageCache',
};

const DEFAULT_CATEGORIES = ['Produce', 'Dairy', 'Meat', 'Bakery', 'Seafood', 'Frozen', 'Pantry', 'Drinks', 'Snacks', 'Personal Care', 'Household', 'Other'];
const CATEGORY_ORDER = new Map(DEFAULT_CATEGORIES.map((category, index) => [category, index]));
const CATEGORY_COLORS = {
  Produce: '#4CAF50',
  Dairy: '#64B5F6',
  Bakery: '#D4A373',
  Meat: '#C62828',
  Seafood: '#26A69A',
  Frozen: '#81D4FA',
  Pantry: '#FFB74D',
  Beverages: '#7E57C2',
  Drinks: '#7E57C2',
  Snacks: '#FBC02D',
};
const COMMON_STORES = [
  'Aldi', 'Costco', 'Food Lion', 'Harris Teeter', 'H-E-B', 'Ingles', 'Kroger', 'Meijer',
  'Publix', 'Safeway', 'Sam\'s Club', 'Sprouts', 'Target', 'Trader Joe\'s', 'Walmart',
  'Wegmans', 'Whole Foods',
];
const PRODUCT_CATALOG = [
  { name: 'Milk', category: 'Dairy', emoji: '🥛', aliases: ['whole milk', '2 percent milk', 'oat milk'] },
  { name: 'Eggs', category: 'Dairy', emoji: '🥚', aliases: ['large eggs', 'dozen eggs'] },
  { name: 'Bread', category: 'Bakery', emoji: '🍞', aliases: ['sandwich bread', 'sourdough'] },
  { name: 'Butter', category: 'Dairy', emoji: '🧈', aliases: ['salted butter'] },
  { name: 'Cheese', category: 'Dairy', emoji: '🧀', aliases: ['cheddar', 'mozzarella'] },
  { name: 'Yogurt', category: 'Dairy', emoji: '🥣', aliases: ['greek yogurt'] },
  { name: 'Apples', category: 'Produce', emoji: '🍎', aliases: ['honeycrisp apples'] },
  { name: 'Bananas', category: 'Produce', emoji: '🍌', aliases: ['banana'] },
  { name: 'Strawberries', category: 'Produce', emoji: '🍓', aliases: ['berries'] },
  { name: 'Spinach', category: 'Produce', emoji: '🥬', aliases: ['baby spinach'] },
  { name: 'Lettuce', category: 'Produce', emoji: '🥬', aliases: ['romaine'] },
  { name: 'Carrots', category: 'Produce', emoji: '🥕', aliases: ['baby carrots'] },
  { name: 'Tomatoes', category: 'Produce', emoji: '🍅', aliases: ['cherry tomatoes'] },
  { name: 'Onions', category: 'Produce', emoji: '🧅', aliases: ['yellow onions'] },
  { name: 'Potatoes', category: 'Produce', emoji: '🥔', aliases: ['russet potatoes'] },
  { name: 'Chicken breast', category: 'Meat', emoji: '🍗', aliases: ['chicken'] },
  { name: 'Ground beef', category: 'Meat', emoji: '🥩', aliases: ['beef'] },
  { name: 'Salmon', category: 'Meat', emoji: '🐟', aliases: ['fish'] },
  { name: 'Pasta', category: 'Pantry', emoji: '🍝', aliases: ['spaghetti', 'penne'] },
  { name: 'Pasta sauce', category: 'Pantry', emoji: '🍅', aliases: ['marinara', 'tomato sauce'] },
  { name: 'Rice', category: 'Pantry', emoji: '🍚', aliases: ['white rice', 'brown rice'] },
  { name: 'Cereal', category: 'Pantry', emoji: '🥣', aliases: ['breakfast cereal'] },
  { name: 'Peanut butter', category: 'Pantry', emoji: '🥜', aliases: ['pb'] },
  { name: 'Coffee', category: 'Drinks', emoji: '☕', aliases: ['ground coffee'] },
  { name: 'Orange juice', category: 'Drinks', emoji: '🍊', aliases: ['oj'] },
  { name: 'Sparkling water', category: 'Drinks', emoji: '🥤', aliases: ['seltzer'] },
  { name: 'Snack bars', category: 'Snacks', emoji: '🍫', aliases: ['granola bars', 'protein bars'] },
  { name: 'Chips', category: 'Snacks', emoji: '🥔', aliases: ['tortilla chips', 'potato chips'] },
  { name: 'Ice cream', category: 'Frozen', emoji: '🍨', aliases: ['frozen dessert'] },
  { name: 'Frozen pizza', category: 'Frozen', emoji: '🍕', aliases: ['pizza'] },
  { name: 'Paper towels', category: 'Household', emoji: '🧻', aliases: ['kitchen roll'] },
  { name: 'Toilet paper', category: 'Household', emoji: '🧻', aliases: ['bath tissue'] },
  { name: 'Dish soap', category: 'Household', emoji: '🧼', aliases: ['dish detergent'] },
];
const LIST_NAME_PLACEHOLDERS = [
  "Joe's Publix trip",
  'Whole Foods',
  'Walmart Groceries',
];
const clerkPublishableKey = import.meta.env?.VITE_CLERK_PUBLISHABLE_KEY || window.CLERK_PUBLISHABLE_KEY || '';
const apiBaseUrl = (import.meta.env?.VITE_API_URL || window.GROCERY_API_URL || '').replace(/\/+$/, '');
let clerkClient = null;
let clerkClientPromise = null;
let mountedAuthMode = null;
let autocompleteBlurTimeout = null;
let productLookupTimer = null;
let listNamePlaceholderTimer = null;
let stopListNamePlaceholderAnimation = null;

const elements = {
  itemInput: document.getElementById('itemInput'),
  itemAutocomplete: document.getElementById('itemAutocomplete'),
  quantityInput: document.getElementById('quantityInput'),
  emojiInput: document.getElementById('emojiInput'),
  categoryInput: document.getElementById('categoryInput'),
  priceInput: document.getElementById('priceInput'),
  imageUrlInput: document.getElementById('imageUrlInput'),
  lookupImageBtn: document.getElementById('lookupImageBtn'),
  productImagePreview: document.getElementById('productImagePreview'),
  productImageEmpty: document.getElementById('productImageEmpty'),
  productImageStatus: document.getElementById('productImageStatus'),
  notesInput: document.getElementById('notesInput'),
  addItemBtn: document.getElementById('addItemBtn'),
  addItemForm: document.getElementById('addItemForm'),
  addItemModal: document.getElementById('addItemModal'),
  cancelAddBtn: document.getElementById('cancelAddBtn'),
  currentList: document.getElementById('currentList'),
  listNameInput: document.getElementById('listNameInput'),
  storeAutocomplete: document.getElementById('storeAutocomplete'),
  saveListActionBtn: document.getElementById('saveListActionBtn'),
  savedListsContainer: document.getElementById('savedListsContainer'),
  savedSearchInput: document.getElementById('savedSearchInput'),
  savedDrawer: document.getElementById('savedDrawer'),
  savedDrawerOverlay: document.getElementById('savedDrawerOverlay'),
  closeSavedDrawerBtn: document.getElementById('closeSavedDrawerBtn'),
  bottomSavedListsToggleBtn: document.getElementById('bottomSavedListsToggleBtn'),
  bottomUserProfile: document.getElementById('bottomUserProfile'),
  bottomUserAvatar: document.getElementById('bottomUserAvatar'),
  bottomUserName: document.getElementById('bottomUserName'),
  quickAddForm: document.getElementById('quickAddForm'),
  quickAddInput: document.getElementById('quickAddInput'),
  authStatusPill: document.getElementById('authStatusPill'),
  clearListLink: document.getElementById('clearListLink'),
  messageAlert: document.getElementById('messageAlert'),
  ariaLive: document.getElementById('ariaLive'),
  itemSearchInput: document.getElementById('itemSearchInput'),
  categoryFilter: document.getElementById('categoryFilter'),
  sortSelect: document.getElementById('sortSelect'),
  staplesRail: document.getElementById('staplesRail'),
  exportDataBtn: document.getElementById('exportDataBtn'),
  importDataInput: document.getElementById('importDataInput'),
  authModal: document.getElementById('authModal'),
  closeAuthModalBtn: document.getElementById('closeAuthModalBtn'),
  authForm: document.getElementById('authForm'),
  authNameInput: document.getElementById('authNameInput'),
  authEmailInput: document.getElementById('authEmailInput'),
  authPasswordInput: document.getElementById('authPasswordInput'),
  authSubmitBtn: document.getElementById('authSubmitBtn'),
  authModeToggleBtn: document.getElementById('authModeToggleBtn'),
  authModalTitle: document.getElementById('authModalTitle'),
  authModalSubtitle: document.getElementById('authModalSubtitle'),
  authClerkMount: document.getElementById('authClerkMount'),
  accountPanel: document.getElementById('accountPanel'),
  accountEmailText: document.getElementById('accountEmailText'),
  accountSignOutBtn: document.getElementById('accountSignOutBtn'),
};

let state = {
  currentList: [],
  savedLists: {},
  purchaseMemory: {},
  productImageCache: {},
  session: null,
  user: null,
  authMode: 'sign-in',
  authLoading: false,
  editingId: null,
  search: '',
  category: 'all',
  sort: 'smart',
  savedSearch: '',
  savedListsRendered: false,
};

function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadData(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error(`Could not load ${key}`, error);
    return fallback;
  }
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function categoryColorFor(category = '') {
  return CATEGORY_COLORS[category] || '#66BB6A';
}

function readableTextColor(hex = '') {
  const value = hex.replace('#', '');
  if (value.length !== 6) return '#1F2937';
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 145 ? '#1F2937' : '#FFFFFF';
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? `$${number.toFixed(2)}` : '';
}

function normalizeText(value = '') {
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

function titleCase(value = '') {
  return normalizeText(value).replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function catalogMatchFor(name = '') {
  const normalized = normalizeText(name);
  if (!normalized) return null;
  return PRODUCT_CATALOG.find((item) => {
    const names = [item.name, ...(item.aliases || [])].map(normalizeText);
    return names.some((candidate) => candidate === normalized || candidate.startsWith(normalized) || normalized.startsWith(candidate));
  }) || null;
}

function inferCategory(name = '') {
  return catalogMatchFor(name)?.category || 'Other';
}

function inferEmoji(name = '') {
  return catalogMatchFor(name)?.emoji || '';
}

function upsertPurchaseMemory(item) {
  const key = normalizeText(item.name);
  if (!key) return;
  const existing = state.purchaseMemory[key] || {};
  state.purchaseMemory[key] = {
    name: item.name,
    category: item.category || existing.category || inferCategory(item.name),
    emoji: item.emoji || existing.emoji || inferEmoji(item.name),
    imageUrl: item.imageUrl || existing.imageUrl || '',
    price: item.price || existing.price || '',
    quantity: item.quantity || existing.quantity || 1,
    count: (Number(existing.count) || 0) + 1,
    lastUsed: new Date().toISOString(),
  };
  saveData(STORAGE_KEYS.purchaseMemory, state.purchaseMemory);
}

function hydratePurchaseMemory() {
  const remembered = { ...state.purchaseMemory };
  const absorb = (item) => {
    const key = normalizeText(item.name);
    if (!key) return;
    const existing = remembered[key] || {};
    remembered[key] = {
      name: item.name,
      category: item.category || existing.category || inferCategory(item.name),
      emoji: item.emoji || existing.emoji || inferEmoji(item.name),
      imageUrl: item.imageUrl || existing.imageUrl || '',
      price: item.price || existing.price || '',
      quantity: item.quantity || existing.quantity || 1,
      count: Math.max(Number(existing.count) || 0, 1),
      lastUsed: existing.lastUsed || new Date().toISOString(),
    };
  };

  state.currentList.forEach(absorb);
  Object.values(state.savedLists).forEach((list) => (list.items || []).forEach(absorb));
  state.purchaseMemory = remembered;
  saveData(STORAGE_KEYS.purchaseMemory, state.purchaseMemory);
}

function schedulePurchaseMemoryHydration() {
  const hydrate = () => hydratePurchaseMemory();
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(hydrate, { timeout: 2500 });
  } else {
    setTimeout(hydrate, 500);
  }
}

function suggestionSubtitle(suggestion) {
  const pieces = [];
  if (suggestion.category) pieces.push(suggestion.category);
  if (suggestion.count) pieces.push(`${suggestion.count}x`);
  if (suggestion.source) pieces.push(suggestion.source);
  return pieces.join(' • ');
}

function itemSuggestions(query = '') {
  const normalized = normalizeText(query);
  const memorySuggestions = Object.values(state.purchaseMemory)
    .filter((item) => !normalized || normalizeText(item.name).includes(normalized))
    .map((item) => ({ ...item, source: 'remembered' }))
    .sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0) || new Date(b.lastUsed || 0) - new Date(a.lastUsed || 0));

  const catalogSuggestions = PRODUCT_CATALOG
    .filter((item) => {
      const names = [item.name, ...(item.aliases || [])].map(normalizeText);
      return !normalized || names.some((name) => name.includes(normalized));
    })
    .map((item) => ({ ...item, source: 'staple' }));

  const seen = new Set();
  return [...memorySuggestions, ...catalogSuggestions]
    .filter((item) => {
      const key = normalizeText(item.name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function storeSuggestions(query = '') {
  const normalized = normalizeText(query);
  const savedNames = Object.keys(state.savedLists).map((name) => ({ name, source: 'saved' }));
  const commonNames = COMMON_STORES.map((name) => ({ name, source: 'store' }));
  const seen = new Set();
  return [...savedNames, ...commonNames]
    .filter((item) => !normalized || normalizeText(item.name).includes(normalized))
    .filter((item) => {
      const key = normalizeText(item.name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

function renderAutocomplete(container, suggestions, type) {
  if (!container) return;
  if (suggestions.length === 0) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  container.innerHTML = suggestions.map((suggestion, index) => `
    <button type="button" class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-[#C8E6C9]/35" data-suggestion-type="${type}" data-suggestion-index="${index}">
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C8E6C9]/50 text-lg">${escapeHtml(suggestion.emoji || '🛒')}</span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-semibold text-[#1F2937]">${escapeHtml(suggestion.name)}</span>
        <span class="block truncate text-xs text-[#6B7280]">${escapeHtml(suggestionSubtitle(suggestion))}</span>
      </span>
    </button>
  `).join('');
  container.dataset.suggestions = JSON.stringify(suggestions);
  container.classList.remove('hidden');
}

function applyItemSuggestion(suggestion) {
  if (!suggestion) return;
  elements.itemInput.value = suggestion.name;
  if (elements.categoryInput) elements.categoryInput.value = suggestion.category || inferCategory(suggestion.name);
  if (elements.emojiInput) elements.emojiInput.value = suggestion.emoji || inferEmoji(suggestion.name);
  if (elements.quantityInput && suggestion.quantity) elements.quantityInput.value = suggestion.quantity;
  if (elements.priceInput && suggestion.price) elements.priceInput.value = suggestion.price;
  if (suggestion.imageUrl) setProductImage(suggestion.imageUrl, 'Remembered product photo.');
  else queueProductLookup(suggestion.name, 100);
  elements.itemAutocomplete?.classList.add('hidden');
}

function applyStoreSuggestion(suggestion) {
  if (!suggestion) return;
  elements.listNameInput.value = suggestion.name;
  elements.storeAutocomplete?.classList.add('hidden');
}

function startListNamePlaceholderAnimation() {
  const input = elements.listNameInput;
  if (!input) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    input.placeholder = LIST_NAME_PLACEHOLDERS[0];
    return;
  }

  let phraseIndex = 0;
  let characterIndex = 0;
  let deleting = false;
  let paused = false;
  let stopped = false;

  const clearTimer = () => {
    if (listNamePlaceholderTimer) {
      clearTimeout(listNamePlaceholderTimer);
      listNamePlaceholderTimer = null;
    }
  };

  const shouldAnimate = () => !stopped && !paused && document.activeElement !== input && !input.value;

  const tick = () => {
    clearTimer();

    if (!shouldAnimate()) {
      if (!input.value) input.placeholder = 'Name this list';
      return;
    }

    const phrase = LIST_NAME_PLACEHOLDERS[phraseIndex];
    input.placeholder = phrase.slice(0, characterIndex) || ' ';

    if (!deleting && characterIndex < phrase.length) {
      characterIndex += 1;
      listNamePlaceholderTimer = setTimeout(tick, 85);
      return;
    }

    if (!deleting && characterIndex === phrase.length) {
      deleting = true;
      listNamePlaceholderTimer = setTimeout(tick, 1300);
      return;
    }

    if (deleting && characterIndex > 0) {
      characterIndex -= 1;
      listNamePlaceholderTimer = setTimeout(tick, 42);
      return;
    }

    deleting = false;
    phraseIndex = (phraseIndex + 1) % LIST_NAME_PLACEHOLDERS.length;
    listNamePlaceholderTimer = setTimeout(tick, 260);
  };

  const pause = () => {
    paused = true;
    clearTimer();
    input.placeholder = 'Name this list';
  };
  const resume = () => {
    paused = false;
    if (!input.value && document.activeElement !== input) tick();
  };

  input.addEventListener('focus', pause);
  input.addEventListener('input', pause);
  input.addEventListener('blur', () => {
    paused = false;
    if (!input.value) {
      characterIndex = 0;
      deleting = false;
      listNamePlaceholderTimer = setTimeout(tick, 240);
    }
  });

  stopListNamePlaceholderAnimation = () => {
    stopped = true;
    clearTimer();
    input.placeholder = 'Name this list';
  };

  tick();
}

function setProductImage(url = '', status = '') {
  const cleanUrl = String(url || '').trim();
  if (elements.imageUrlInput && elements.imageUrlInput.value !== cleanUrl) {
    elements.imageUrlInput.value = cleanUrl;
  }
  if (elements.productImagePreview && elements.productImageEmpty) {
    elements.productImagePreview.src = cleanUrl;
    elements.productImagePreview.classList.toggle('hidden', !cleanUrl);
    elements.productImageEmpty.classList.toggle('hidden', Boolean(cleanUrl));
  }
  if (elements.productImageStatus && status) {
    elements.productImageStatus.textContent = status;
  }
}

async function lookupProductImage(query = elements.itemInput?.value) {
  const term = normalizeText(query);
  if (!term) {
    setProductImage('', 'Type an item name to find a product photo.');
    return '';
  }
  if (state.productImageCache[term]) {
    setProductImage(state.productImageCache[term], 'Cached product photo.');
    return state.productImageCache[term];
  }

  if (elements.productImageStatus) elements.productImageStatus.textContent = 'Finding product photo...';
  try {
    const fields = 'product_name,brands,image_front_url,image_url';
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=8&fields=${fields}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Product lookup failed');
    const data = await response.json();
    const product = (data.products || []).find((candidate) => candidate.image_front_url || candidate.image_url);
    const imageUrl = product?.image_front_url || product?.image_url || '';
    if (imageUrl) {
      state.productImageCache[term] = imageUrl;
      saveData(STORAGE_KEYS.productImageCache, state.productImageCache);
      setProductImage(imageUrl, product.brands ? `${product.brands} photo found.` : 'Product photo found.');
      return imageUrl;
    }
    setProductImage('', 'No product photo found. Paste an image URL if you have one.');
    return '';
  } catch (error) {
    console.error('Product image lookup failed:', error);
    if (elements.productImageStatus) elements.productImageStatus.textContent = 'Could not reach product image lookup.';
    return '';
  }
}

function queueProductLookup(query, delay = 650) {
  clearTimeout(productLookupTimer);
  productLookupTimer = setTimeout(() => lookupProductImage(query), delay);
}

function getListText({ checkbox = false, items = state.currentList } = {}) {
  return items.map((item) => {
    const mark = checkbox ? `${item.completed ? '[x]' : '[ ]'} ` : '';
    const emoji = item.emoji ? `${item.emoji} ` : '';
    const quantity = item.quantity > 1 ? ` x${item.quantity}` : '';
    const category = item.category ? ` - ${item.category}` : '';
    const price = money(item.price);
    const notes = item.notes ? `\n  ${item.notes}` : '';
    const image = item.imageUrl ? `\n  Photo: ${item.imageUrl}` : '';
    return `${mark}${emoji}${item.name}${quantity}${category}${price ? ` (${price})` : ''}${notes}${image}`;
  }).join('\n');
}

function showAlert(message, type = 'success') {
  if (!elements.messageAlert) return;
  elements.messageAlert.textContent = message;
  elements.messageAlert.className = 'fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-lg';
  elements.messageAlert.classList.add(type === 'error' ? 'bg-[#E53935]' : type === 'info' ? 'bg-[#42A5F5]' : 'bg-[#2E7D32]');
  elements.messageAlert.classList.remove('hidden');
  if (elements.ariaLive) elements.ariaLive.textContent = message;
  clearTimeout(showAlert.timeoutId);
  showAlert.timeoutId = setTimeout(() => elements.messageAlert.classList.add('hidden'), 2600);
}

function persistCurrentList() {
  saveData(STORAGE_KEYS.currentList, state.currentList);
}

function savedListsStorageKey() {
  return state.user?.id ? `${STORAGE_KEYS.savedLists}:${state.user.id}` : STORAGE_KEYS.savedLists;
}

function persistSavedLists() {
  saveData(savedListsStorageKey(), state.savedLists);
}

function isSignedIn() {
  return Boolean(state.session && state.user);
}

function clerkUserProfile(user = clerkClient?.user) {
  if (!user) return null;
  const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '';
  return {
    id: user.id,
    email,
    name: user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || email.split('@')[0] || 'Grocery user',
    imageUrl: user.imageUrl || '',
  };
}

function apiUrl(path, params = {}) {
  const url = new URL(`${apiBaseUrl}/${path.replace(/^\/+/, '')}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  return url.toString();
}

async function authHeaders(extraHeaders = {}) {
  const token = await state.session?.getToken?.();
  if (!token) throw new Error('Sign in is required.');
  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`,
  };
}

function apiListToSavedList(list) {
  return {
    id: list.id,
    items: (list.items || []).map((item) => normalizeItem({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      emoji: item.emoji,
      category: item.category,
      price: item.estimatedPrice ?? item.price,
      imageUrl: item.imageUrl,
      notes: item.notes,
      completed: item.completed,
    })),
    timestamp: list.updatedAt || list.createdAt || new Date().toISOString(),
  };
}

async function loadAccountSavedLists({ silent = false } = {}) {
  if (!apiBaseUrl || !isSignedIn()) return false;

  try {
    const response = await fetch(apiUrl('/api/lists'), {
      headers: await authHeaders({ Accept: 'application/json' }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Could not load lists (${response.status}).`);

    const remoteLists = {};
    (data.lists || []).forEach((list) => {
      remoteLists[list.name] = apiListToSavedList(list);
    });

    state.savedLists = remoteLists;
    persistSavedLists();
    hydratePurchaseMemory();
    if (state.savedListsRendered) renderSavedLists();
    if (!silent) showAlert(`Loaded ${Object.keys(remoteLists).length} saved list${Object.keys(remoteLists).length === 1 ? '' : 's'}.`);
    return true;
  } catch (error) {
    console.error('Saved list sync failed:', error);
    if (!silent) showAlert(`${error.message || 'Could not load saved lists.'} Showing cached lists.`, 'error');
    return false;
  }
}

async function saveAccountList(name, list) {
  if (!apiBaseUrl || !isSignedIn()) return null;

  const response = await fetch(apiUrl('/api/lists'), {
    method: 'POST',
    headers: await authHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' }),
    body: JSON.stringify({
      ownerEmail: state.user?.email || null,
      ownerName: state.user?.name || null,
      name,
      items: list.items,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Could not save list (${response.status}).`);
  return data.list;
}

async function deleteAccountList(list) {
  if (!apiBaseUrl || !isSignedIn() || !list?.id) return false;
  const response = await fetch(apiUrl(`/api/lists/${encodeURIComponent(list.id)}`), {
    method: 'DELETE',
    headers: await authHeaders({ Accept: 'application/json' }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Could not delete list (${response.status}).`);
  return true;
}

function setModal(modal, open) {
  if (!modal) return;
  modal.classList.toggle('hidden', !open);
  modal.classList.toggle('flex', open);
}

async function configureAuthClient() {
  if (!clerkPublishableKey) {
    state.authLoading = false;
    renderAuth();
    return null;
  }
  if (clerkClient) return clerkClient;
  if (clerkClientPromise) return clerkClientPromise;

  state.authLoading = true;
  renderAuth();
  clerkClientPromise = Promise.resolve()
    .then(async () => {
      const { Clerk } = await import('@clerk/clerk-js');
      clerkClient = new Clerk(clerkPublishableKey);
      await clerkClient.load();
      clerkClient.addListener(({ session, user }) => {
        const wasSignedIn = isSignedIn();
        state.session = session || null;
        state.user = clerkUserProfile(user);
        const signedInNow = isSignedIn();
        if (!wasSignedIn && signedInNow) {
          state.savedLists = loadData(savedListsStorageKey(), {});
          hydratePurchaseMemory();
        }
        if (wasSignedIn && !signedInNow) {
          state.savedLists = loadData(STORAGE_KEYS.savedLists, {});
          hydratePurchaseMemory();
        }
        renderAuth();
        renderAll();
        if (!wasSignedIn && signedInNow) {
          void loadAccountSavedLists({ silent: false }).then(() => renderAll());
        }
      });
      state.session = clerkClient.session || null;
      state.user = clerkUserProfile(clerkClient.user);
      if (state.user) {
        state.savedLists = loadData(savedListsStorageKey(), state.savedLists);
        hydratePurchaseMemory();
      }
      return clerkClient;
    })
    .catch((error) => {
      console.error('Could not load Clerk:', error);
      clerkClient = null;
      showAlert(`Auth could not load: ${error?.message || 'unknown error'}`, 'error');
      return null;
    })
    .finally(() => {
      clerkClientPromise = null;
      state.authLoading = false;
      renderAuth();
    });

  return clerkClientPromise;
}

function setAuthMode(mode) {
  state.authMode = mode;
  const isSignUp = mode === 'sign-up';
  if (elements.authNameInput) {
    elements.authNameInput.classList.toggle('hidden', !isSignUp);
    elements.authNameInput.required = isSignUp;
  }
  if (elements.authPasswordInput) {
    elements.authPasswordInput.autocomplete = isSignUp ? 'new-password' : 'current-password';
  }
  if (elements.authModalTitle) elements.authModalTitle.textContent = isSignUp ? 'Create account' : 'Sign in';
  if (elements.authModalSubtitle) {
    elements.authModalSubtitle.textContent = isSignUp
      ? 'Create a Clerk account for this grocery app.'
      : 'Use your Clerk account.';
  }
  if (elements.authSubmitBtn) elements.authSubmitBtn.textContent = isSignUp ? 'Sign up' : 'Sign in';
  if (elements.authModeToggleBtn) {
    elements.authModeToggleBtn.textContent = isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up';
  }
}

function getAuthRedirectOptions() {
  return {
    fallbackRedirectUrl: window.location.href,
    forceRedirectUrl: window.location.href,
  };
}

function clerkErrorMessage(error, fallback = 'Authentication failed.') {
  const firstError = error?.errors?.[0];
  return firstError?.longMessage || firstError?.message || error?.message || fallback;
}

function unmountClerkAuth() {
  if (!elements.authClerkMount || !clerkClient || !mountedAuthMode) return;
  try {
    if (mountedAuthMode === 'sign-up') clerkClient.unmountSignUp?.(elements.authClerkMount);
    else clerkClient.unmountSignIn?.(elements.authClerkMount);
  } catch (error) {
    console.warn('Could not unmount Clerk auth:', error);
  }
  elements.authClerkMount.innerHTML = '';
  mountedAuthMode = null;
}

async function openAuthModal(mode = 'sign-in') {
  if (!clerkPublishableKey) {
    showAlert('Set VITE_CLERK_PUBLISHABLE_KEY to enable Clerk.', 'error');
    return;
  }
  const client = await configureAuthClient();
  if (!client) return;
  await refreshAuthSession();
  if (state.session && state.user) {
    openAccountModal();
    return;
  }
  setAuthMode(mode);
  unmountClerkAuth();
  if (elements.accountPanel) elements.accountPanel.classList.add('hidden');
  if (elements.authModeToggleBtn) elements.authModeToggleBtn.classList.remove('hidden');
  setModal(elements.authModal, true);

  if (mode === 'sign-in') {
    if (elements.authForm) elements.authForm.classList.remove('hidden');
    if (elements.authClerkMount) elements.authClerkMount.classList.add('hidden');
    elements.authEmailInput?.focus();
    return;
  }

  const redirectOptions = getAuthRedirectOptions();
  if (elements.authForm) elements.authForm.classList.add('hidden');
  if (elements.authClerkMount) elements.authClerkMount.classList.remove('hidden');
  try {
    client.mountSignUp(elements.authClerkMount, redirectOptions);
    mountedAuthMode = mode;
  } catch (error) {
    console.error('Clerk sign-up mount error:', error);
    showAlert(clerkErrorMessage(error, 'Could not open sign up.'), 'error');
  }
}

function openAccountModal() {
  if (!state.user) {
    openAuthModal('sign-in');
    return;
  }
  unmountClerkAuth();
  if (elements.authModalTitle) elements.authModalTitle.textContent = 'Account';
  if (elements.authModalSubtitle) elements.authModalSubtitle.textContent = 'Manage your current Clerk session.';
  if (elements.authForm) elements.authForm.classList.add('hidden');
  if (elements.authClerkMount) elements.authClerkMount.classList.add('hidden');
  if (elements.accountPanel) elements.accountPanel.classList.remove('hidden');
  if (elements.authModeToggleBtn) elements.authModeToggleBtn.classList.add('hidden');
  if (elements.accountEmailText) elements.accountEmailText.textContent = state.user.email || state.user.name || 'Signed in user';
  setModal(elements.authModal, true);
}

function closeAuthModal() {
  setModal(elements.authModal, false);
  unmountClerkAuth();
  elements.authForm?.reset();
  if (elements.authForm) elements.authForm.classList.remove('hidden');
  if (elements.authClerkMount) elements.authClerkMount.classList.add('hidden');
  if (elements.accountPanel) elements.accountPanel.classList.add('hidden');
  if (elements.authModeToggleBtn) elements.authModeToggleBtn.classList.remove('hidden');
  setAuthMode('sign-in');
}

async function refreshAuthSession() {
  if (!clerkClient) {
    state.authLoading = false;
    renderAuth();
    return;
  }

  state.authLoading = true;
  renderAuth();

  try {
    state.session = clerkClient.session || null;
    state.user = clerkUserProfile(clerkClient.user);
  } catch (error) {
    console.error('Clerk session error:', error);
    state.session = null;
    state.user = null;
  }

  state.authLoading = false;
  renderAuth();
}

async function submitAuth(event) {
  event.preventDefault();
  if (state.authMode === 'sign-up') {
    await openAuthModal('sign-up');
    return;
  }

  const email = elements.authEmailInput?.value.trim();
  const password = elements.authPasswordInput?.value;
  if (!email || !password) {
    showAlert('Enter your email and password.', 'error');
    return;
  }

  const client = await configureAuthClient();
  if (!client) return;

  state.authLoading = true;
  if (elements.authSubmitBtn) elements.authSubmitBtn.textContent = 'Signing in...';
  renderAuth();

  try {
    const signIn = await client.signIn.create({ identifier: email, password });
    if (signIn.status === 'complete' && signIn.createdSessionId) {
      await client.setActive({ session: signIn.createdSessionId });
      state.session = client.session || null;
      state.user = clerkUserProfile(client.user);
      state.savedLists = loadData(savedListsStorageKey(), state.savedLists);
      hydratePurchaseMemory();
      closeAuthModal();
      await loadAccountSavedLists({ silent: true });
      renderAll();
      showAlert('Signed in.', 'info');
      return;
    }
    showAlert('This sign-in needs an extra verification step. Use Clerk sign up or update your Clerk sign-in settings.', 'error');
  } catch (error) {
    console.error('Clerk password sign-in error:', error);
    showAlert(clerkErrorMessage(error, 'Could not sign in.'), 'error');
  } finally {
    state.authLoading = false;
    if (elements.authSubmitBtn) elements.authSubmitBtn.textContent = 'Sign in';
    renderAuth();
  }
}

async function signOut() {
  if (!clerkPublishableKey) {
    showAlert('Clerk is not configured.', 'error');
    return;
  }
  try {
    const client = clerkClient || await configureAuthClient();
    await client?.signOut?.();
  } catch (error) {
    console.error('Clerk sign-out error:', error);
    showAlert(error.message || 'Could not sign out.', 'error');
    return;
  }
  state.session = null;
  state.user = null;
  state.savedLists = loadData(STORAGE_KEYS.savedLists, {});
  hydratePurchaseMemory();
  closeAuthModal();
  renderAll();
  showAlert('Signed out.', 'info');
}

function resetItemForm() {
  elements.addItemForm?.reset();
  if (elements.quantityInput) elements.quantityInput.value = '1';
  if (elements.categoryInput) elements.categoryInput.value = 'Produce';
  setProductImage('', 'Looks up real product photos from Open Food Facts.');
  elements.itemAutocomplete?.classList.add('hidden');
  state.editingId = null;
  if (elements.addItemBtn) elements.addItemBtn.textContent = 'Add Item';
}

function openItemModal(item = null) {
  if (item) {
    state.editingId = item.id;
    elements.itemInput.value = item.name;
    elements.quantityInput.value = item.quantity || 1;
    elements.emojiInput.value = item.emoji || '';
    elements.categoryInput.value = item.category || 'Other';
    elements.priceInput.value = item.price || '';
    setProductImage(item.imageUrl || '', item.imageUrl ? 'Saved product photo.' : 'No product photo saved yet.');
    elements.notesInput.value = item.notes || '';
    elements.addItemBtn.textContent = 'Update Item';
  } else {
    resetItemForm();
  }
  setModal(elements.addItemModal, true);
  elements.itemInput?.focus();
}

function closeItemModal() {
  setModal(elements.addItemModal, false);
  resetItemForm();
}

function categoriesInUse() {
  return [...new Set([...DEFAULT_CATEGORIES, ...state.currentList.map((item) => item.category || 'Other')])];
}

function populateCategoryFilter() {
  if (!elements.categoryFilter) return;
  const selected = state.category;
  elements.categoryFilter.innerHTML = '<option value="all">All categories</option>' + categoriesInUse()
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join('');
  elements.categoryFilter.value = categoriesInUse().includes(selected) ? selected : 'all';
  state.category = elements.categoryFilter.value;
}

function visibleItems() {
  const query = state.search.trim().toLowerCase();
  const filtered = state.currentList.filter((item) => {
    const matchesSearch = !query || [item.name, item.category, item.notes].some((value) => String(value || '').toLowerCase().includes(query));
    const matchesCategory = state.category === 'all' || item.category === state.category;
    return matchesSearch && matchesCategory;
  });

  const sorted = [...filtered];
  if (state.sort === 'smart') {
    sorted.sort((a, b) => (
      Number(a.completed) - Number(b.completed)
      || (CATEGORY_ORDER.get(a.category || 'Other') ?? 99) - (CATEGORY_ORDER.get(b.category || 'Other') ?? 99)
      || (Number(state.purchaseMemory[normalizeText(b.name)]?.count) || 0) - (Number(state.purchaseMemory[normalizeText(a.name)]?.count) || 0)
      || a.name.localeCompare(b.name)
    ));
  }
  if (state.sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
  if (state.sort === 'category') sorted.sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name));
  if (state.sort === 'needed') sorted.sort((a, b) => Number(a.completed) - Number(b.completed));
  if (state.sort === 'checked') sorted.sort((a, b) => Number(b.completed) - Number(a.completed));
  return sorted;
}

function renderStaplesRail() {
  if (!elements.staplesRail) return;
  const remembered = Object.values(state.purchaseMemory)
    .sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0))
    .slice(0, 6);
  const staples = remembered.length > 0 ? remembered : PRODUCT_CATALOG.slice(0, 8);

  elements.staplesRail.innerHTML = staples.map((item) => `
    <button type="button" class="shrink-0 rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-semibold text-[#2E7D32] shadow-sm shadow-[#1F2937]/5 transition hover:bg-[#C8E6C9]/35" data-staple-name="${escapeHtml(item.name)}">
      ${escapeHtml(item.emoji || '🛒')} ${escapeHtml(item.name)}
    </button>
  `).join('');
}

function renderCurrentList() {
  if (!elements.currentList) return;
  populateCategoryFilter();
  renderStaplesRail();

  const items = visibleItems();
  if (state.currentList.length === 0) {
    elements.currentList.innerHTML = '<li class="rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-6 text-center text-sm text-[#6B7280]">Your grocery list is empty. Add your first item.</li>';
    return;
  }
  if (items.length === 0) {
    elements.currentList.innerHTML = '<li class="rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-6 text-center text-sm text-[#6B7280]">No items match the current filters.</li>';
    return;
  }

  let previousCategory = '';
  elements.currentList.innerHTML = items.map((item) => {
    const index = state.currentList.findIndex((candidate) => candidate.id === item.id);
    const categoryColor = categoryColorFor(item.category || 'Other');
    const categoryTextColor = readableTextColor(categoryColor);
    const category = item.category || 'Other';
    const showCategoryHeader = state.category === 'all'
      && ['smart', 'category'].includes(state.sort)
      && category !== previousCategory;
    previousCategory = category;
    return `
      ${showCategoryHeader ? `
        <li class="pt-2 first:pt-0">
          <div class="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#6B7280]">
            <span class="h-2.5 w-2.5 rounded-full" style="background-color: ${categoryColor};"></span>
            ${escapeHtml(category)}
          </div>
        </li>
      ` : ''}
      <li class="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm shadow-[#1F2937]/5" data-id="${escapeHtml(item.id)}">
        <div class="flex items-start justify-between gap-3">
          <label class="flex min-w-0 flex-1 items-start gap-3">
            <input type="checkbox" class="mt-1 h-5 w-5 rounded border-[#E5E7EB] bg-white text-[#2E7D32]" data-action="toggle" ${item.completed ? 'checked' : ''}>
            ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" class="h-16 w-16 shrink-0 rounded-2xl border border-[#E5E7EB] object-cover bg-[#C8E6C9]/40" loading="lazy">` : ''}
            <span class="min-w-0 flex-1">
              <span class="flex flex-wrap items-center gap-2">
                ${item.emoji ? `<span class="text-2xl">${escapeHtml(item.emoji)}</span>` : ''}
                <span class="font-semibold ${item.completed ? 'text-[#6B7280] line-through' : 'text-[#1F2937]'}">${escapeHtml(item.name)}</span>
                <span class="rounded-full bg-[#F1F7F2] px-2 py-0.5 text-xs text-[#6B7280]">x${escapeHtml(item.quantity)}</span>
                <span class="rounded-full px-2 py-0.5 text-xs font-semibold" style="background-color: ${categoryColor}; color: ${categoryTextColor};">${escapeHtml(item.category || 'Other')}</span>
                ${money(item.price) ? `<span class="rounded-full bg-[#FBC02D]/25 px-2 py-0.5 text-xs text-[#1F2937]">${money(item.price)}</span>` : ''}
              </span>
              ${item.notes ? `<span class="mt-2 block text-sm text-[#6B7280]">${escapeHtml(item.notes)}</span>` : ''}
            </span>
          </label>
          <div class="flex shrink-0 items-center gap-1">
            <button type="button" class="rounded-full p-2 text-[#6B7280] transition hover:bg-[#C8E6C9]/35 disabled:opacity-30" data-action="up" aria-label="Move item up" ${index === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="rounded-full p-2 text-[#6B7280] transition hover:bg-[#C8E6C9]/35 disabled:opacity-30" data-action="down" aria-label="Move item down" ${index === state.currentList.length - 1 ? 'disabled' : ''}>↓</button>
            <button type="button" class="rounded-full p-2 text-[#1F2937] transition hover:bg-[#C8E6C9]/35" data-action="edit" aria-label="Edit item">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M11 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20h11A2.5 2.5 0 0 0 20 17.5V13" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9.5 14.5 18.7 5.3a1.8 1.8 0 0 1 2.55 2.55L12.05 17.05 8.5 18l1-3.5Z" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button type="button" class="rounded-full p-2 text-[#E53935] transition hover:bg-[#E53935]/10" data-action="delete" aria-label="Delete item">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
                <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M18 7 17.1 19.1A2 2 0 0 1 15.1 21H8.9a2 2 0 0 1-2-1.9L6 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </li>
    `;
  }).join('');
}

function renderSavedLists() {
  if (!elements.savedListsContainer) return;
  state.savedListsRendered = true;
  const query = state.savedSearch.trim().toLowerCase();
  const names = Object.keys(state.savedLists)
    .filter((name) => !query || name.toLowerCase().includes(query))
    .sort((a, b) => new Date(state.savedLists[b].timestamp || 0) - new Date(state.savedLists[a].timestamp || 0));

  if (names.length === 0) {
    elements.savedListsContainer.innerHTML = '<div class="rounded-2xl border border-dashed border-[#E5E7EB] bg-[#F1F7F2] p-4 text-sm text-[#6B7280]">No saved lists found.</div>';
    return;
  }

  elements.savedListsContainer.innerHTML = names.map((name) => {
    const list = state.savedLists[name];
    const checked = list.items.filter((item) => item.completed).length;
    const stamp = list.timestamp ? new Date(list.timestamp).toLocaleString() : 'Recently saved';
    return `
      <div class="rounded-2xl border border-[#E5E7EB] bg-[#F1F7F2] p-4" data-list-name="${escapeHtml(name)}">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h3 class="truncate font-semibold text-[#1F2937]">${escapeHtml(name)}</h3>
            <p class="mt-1 text-sm text-[#6B7280]">${list.items.length} items, ${checked} checked</p>
            <p class="mt-1 text-xs text-[#6B7280]">${escapeHtml(stamp)}</p>
          </div>
          <div class="flex shrink-0 gap-1">
            <button type="button" class="rounded-full p-2 text-[#2E7D32] transition hover:bg-white" data-action="load" aria-label="Load list">↵</button>
            <button type="button" class="rounded-full p-2 text-[#42A5F5] transition hover:bg-white" data-action="share" aria-label="Share saved list" title="Share list">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M8.6 10.2 15.4 6.8M8.6 13.8l6.8 3.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="6" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                <circle cx="18" cy="6" r="3" stroke="currentColor" stroke-width="2"/>
                <circle cx="18" cy="18" r="3" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            <button type="button" class="rounded-full p-2 text-[#2E7D32] transition hover:bg-white" data-action="duplicate" aria-label="Duplicate list">⧉</button>
            <button type="button" class="rounded-full p-2 text-[#E53935] transition hover:bg-[#E53935]/10" data-action="delete" aria-label="Delete saved list">×</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function avatarInitials(user) {
  const source = String(user?.name || user?.email || 'U').trim();
  const nameParts = source.includes('@') ? [source[0]] : source.split(/\s+/);
  return nameParts
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function renderAuth() {
  if (!elements.authStatusPill) return;

  const signedIn = isSignedIn();
  const label = !clerkPublishableKey
    ? 'Auth unavailable'
    : state.authLoading
      ? 'Checking auth...'
      : signedIn
        ? 'Log out'
        : 'Sign in';

  elements.authStatusPill.textContent = label;
  elements.authStatusPill.title = signedIn ? `Log out ${state.user.name || state.user.email || 'user'}` : label;
  elements.authStatusPill.setAttribute('aria-label', signedIn ? 'Log out' : 'Sign in');
  elements.authStatusPill.setAttribute('aria-disabled', String(state.authLoading));
  elements.authStatusPill.className = signedIn
    ? 'rounded-full border border-[#E53935]/25 bg-[#E53935]/10 px-3 py-1 text-sm font-semibold text-[#E53935] transition hover:bg-[#E53935]/15'
    : !clerkPublishableKey
      ? 'rounded-full border border-[#FBC02D] bg-[#FBC02D]/20 px-3 py-1 text-sm font-semibold text-[#1F2937]'
      : 'rounded-full border border-[#E5E7EB] bg-[#F1F7F2] px-3 py-1 text-sm font-semibold text-[#2E7D32] transition hover:bg-[#C8E6C9]/35';
  elements.authStatusPill.classList.toggle('pointer-events-none', state.authLoading);
  elements.authStatusPill.classList.toggle('opacity-60', state.authLoading);

  if (elements.bottomUserProfile) {
    elements.bottomUserProfile.classList.toggle('hidden', !signedIn);
    elements.bottomUserProfile.classList.toggle('flex', signedIn);
  }
  if (elements.bottomUserName) {
    elements.bottomUserName.textContent = signedIn ? (state.user.name || state.user.email || 'Grocery user') : '';
  }
  if (elements.bottomUserAvatar) {
    if (signedIn && state.user.imageUrl) {
      elements.bottomUserAvatar.innerHTML = `<img src="${escapeHtml(state.user.imageUrl)}" alt="" class="h-full w-full object-cover" loading="lazy" />`;
    } else {
      elements.bottomUserAvatar.textContent = signedIn ? avatarInitials(state.user) : '';
      elements.bottomUserAvatar.innerHTML = signedIn ? elements.bottomUserAvatar.innerHTML : '';
    }
  }
}

function renderAll() {
  renderCurrentList();
  if (state.savedListsRendered) renderSavedLists();
  renderAuth();
}

function normalizeItem(item) {
  const name = String(item.name || '').trim();
  const matched = catalogMatchFor(name);
  return {
    id: item.id || uid(),
    name,
    quantity: Math.max(1, Number(item.quantity) || 1),
    emoji: String(item.emoji || matched?.emoji || '').trim().slice(0, 8),
    category: item.category || matched?.category || 'Other',
    price: item.price ? Number(item.price) : '',
    imageUrl: String(item.imageUrl || item.image_url || '').trim(),
    notes: String(item.notes || '').trim(),
    completed: Boolean(item.completed),
  };
}

function handleAddItem(event) {
  event.preventDefault();
  const item = normalizeItem({
    name: elements.itemInput?.value,
    quantity: elements.quantityInput?.value,
    emoji: elements.emojiInput?.value,
    category: elements.categoryInput?.value,
    price: elements.priceInput?.value,
    imageUrl: elements.imageUrlInput?.value,
    notes: elements.notesInput?.value,
  });

  if (!item.name) {
    showAlert('Please enter an item name.', 'error');
    return;
  }

  if (state.editingId) {
    state.currentList = state.currentList.map((existing) => (
      existing.id === state.editingId ? { ...existing, ...item, id: existing.id, completed: existing.completed } : existing
    ));
    upsertPurchaseMemory(item);
    showAlert('Item updated.');
  } else {
    state.currentList.push(item);
    upsertPurchaseMemory(item);
    showAlert('Item added.');
  }

  persistCurrentList();
  closeItemModal();
  renderAll();
}

function handleQuickAdd(event) {
  event.preventDefault();
  const item = normalizeItem({
    name: elements.quickAddInput?.value,
    quantity: 1,
  });

  if (!item.name) {
    showAlert('Type an item to add.', 'error');
    return;
  }

  state.currentList.push(item);
  upsertPurchaseMemory(item);
  persistCurrentList();
  if (elements.quickAddInput) elements.quickAddInput.value = '';
  renderAll();
  showAlert(`Added ${item.name}.`);
}

function moveItem(id, direction) {
  const from = state.currentList.findIndex((item) => item.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= state.currentList.length) return;
  const [item] = state.currentList.splice(from, 1);
  state.currentList.splice(to, 0, item);
}

function handleCurrentListActions(event) {
  const row = event.target.closest('[data-id]');
  if (!row) return;
  const id = row.dataset.id;
  const item = state.currentList.find((candidate) => candidate.id === id);
  if (!item) return;

  const actionTarget = event.target.closest('[data-action]');
  const action = actionTarget?.dataset.action;

  if (action === 'toggle') {
    item.completed = actionTarget.checked;
    persistCurrentList();
    renderAll();
    return;
  }
  if (action === 'edit') openItemModal(item);
  if (action === 'delete') {
    state.currentList = state.currentList.filter((candidate) => candidate.id !== id);
    persistCurrentList();
    renderAll();
    showAlert('Item removed.', 'error');
  }
  if (action === 'up' || action === 'down') {
    moveItem(id, action === 'up' ? -1 : 1);
    state.sort = 'manual';
    if (elements.sortSelect) elements.sortSelect.value = 'manual';
    persistCurrentList();
    renderAll();
  }
}

async function handleSaveList() {
  const name = elements.listNameInput?.value.trim();
  if (!name) {
    showAlert('Please name your list before saving.', 'error');
    return;
  }
  if (state.currentList.length === 0) {
    showAlert('Add at least one item before saving.', 'error');
    return;
  }

  state.savedLists[name] = {
    items: state.currentList.map((item) => ({ ...item })),
    timestamp: new Date().toISOString(),
  };
  state.currentList.forEach(upsertPurchaseMemory);
  persistSavedLists();
  renderAll();

  if (apiBaseUrl && isSignedIn()) {
    try {
      const remoteList = await saveAccountList(name, state.savedLists[name]);
      state.savedLists[name] = apiListToSavedList(remoteList);
      persistSavedLists();
      renderAll();
      showAlert(`Saved "${name}" to your account.`);
      return;
    } catch (error) {
      console.error('Cloud save failed:', error);
      showAlert(`Saved locally. ${error.message || 'Cloud sync failed.'}`, 'error');
      return;
    }
  }

  showAlert(apiBaseUrl ? `Saved "${name}" locally. Sign in to sync it.` : `Saved "${name}" on this device.`);
}

async function handleSavedListActions(event) {
  const button = event.target.closest('[data-action]');
  const card = event.target.closest('[data-list-name]');
  if (!button || !card) return;

  const name = card.dataset.listName;
  const list = state.savedLists[name];
  if (!list) return;

  if (button.dataset.action === 'load') {
    state.currentList = list.items.map(normalizeItem);
    elements.listNameInput.value = name;
    persistCurrentList();
    setModal(elements.savedDrawer, false);
    renderAll();
    showAlert(`Loaded "${name}".`);
  }

  if (button.dataset.action === 'share') {
    shareSavedList(name);
  }

  if (button.dataset.action === 'duplicate') {
    const copyName = `${name} copy`;
    state.savedLists[copyName] = {
      items: list.items.map((item) => ({ ...normalizeItem(item), id: uid() })),
      timestamp: new Date().toISOString(),
    };
    persistSavedLists();
    renderAll();
    showAlert(`Duplicated "${name}".`);
  }

  if (button.dataset.action === 'delete') {
    const listToDelete = state.savedLists[name];
    delete state.savedLists[name];
    persistSavedLists();
    renderAll();

    if (apiBaseUrl && isSignedIn() && listToDelete?.id) {
      try {
        await deleteAccountList(listToDelete);
      } catch (error) {
        console.error('Cloud delete failed:', error);
        showAlert(`Deleted locally. ${error.message || 'Cloud delete failed.'}`, 'error');
        return;
      }
    }

    showAlert(`Deleted "${name}".`, 'error');
  }
}

async function shareSavedList(name) {
  const list = state.savedLists[name];
  if (!list?.items?.length) {
    showAlert('That saved list is empty.', 'error');
    return;
  }
  await shareListPayload(`${name} grocery list`, list.items, `Shared "${name}".`);
}

async function shareListPayload(title, items, successMessage) {
  if (!items.length) {
    showAlert('Nothing to share yet.', 'error');
    return;
  }

  const text = getListText({ checkbox: true, items });
  const shareData = { title, text };
  try {
    if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
      await navigator.share(shareData);
      if (successMessage) showAlert(successMessage);
      return;
    }
    await navigator.clipboard.writeText(`${title}\n\n${text}`);
    showAlert('Sharing is not available here, so the list was copied.');
  } catch (error) {
    if (error?.name === 'AbortError') return;
    console.error('Share failed:', error);
    try {
      await navigator.clipboard.writeText(`${title}\n\n${text}`);
      showAlert('Share failed, so the list was copied.');
    } catch (clipboardError) {
      console.error('Clipboard fallback failed:', clipboardError);
      showAlert('Could not share or copy this list.', 'error');
    }
  }
}

function exportData() {
  const payload = {
    currentList: state.currentList,
    savedLists: state.savedLists,
    purchaseMemory: state.purchaseMemory,
    productImageCache: state.productImageCache,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'grocery-lists.json';
  link.click();
  URL.revokeObjectURL(url);
  showAlert('Grocery data exported.');
}

function openSavedDrawer() {
  renderSavedLists();
  setModal(elements.savedDrawer, true);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      state.currentList = Array.isArray(data.currentList) ? data.currentList.map(normalizeItem) : state.currentList;
      state.savedLists = typeof data.savedLists === 'object' && data.savedLists ? data.savedLists : state.savedLists;
      state.purchaseMemory = typeof data.purchaseMemory === 'object' && data.purchaseMemory ? data.purchaseMemory : state.purchaseMemory;
      state.productImageCache = typeof data.productImageCache === 'object' && data.productImageCache ? data.productImageCache : state.productImageCache;
      persistCurrentList();
      persistSavedLists();
      saveData(STORAGE_KEYS.purchaseMemory, state.purchaseMemory);
      saveData(STORAGE_KEYS.productImageCache, state.productImageCache);
      schedulePurchaseMemoryHydration();
      renderAll();
      showAlert('Grocery data imported.');
    } catch (error) {
      console.error(error);
      showAlert('That import file could not be read.', 'error');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

function clearCurrentList() {
  if (state.currentList.length === 0) {
    showAlert('List is already empty.', 'info');
    return;
  }
  if (!confirm('Clear every item from the current list?')) return;
  state.currentList = [];
  persistCurrentList();
  renderAll();
  showAlert('Current list cleared.', 'error');
}

function bindEvents() {
  elements.addItemForm?.addEventListener('submit', handleAddItem);
  elements.quickAddForm?.addEventListener('submit', handleQuickAdd);
  elements.cancelAddBtn?.addEventListener('click', closeItemModal);
  elements.addItemModal?.addEventListener('click', (event) => {
    if (event.target === elements.addItemModal) closeItemModal();
  });
  elements.itemInput?.addEventListener('input', () => {
    const value = elements.itemInput.value;
    renderAutocomplete(elements.itemAutocomplete, itemSuggestions(value), 'item');
    const matched = catalogMatchFor(value);
    if (matched) {
      if (elements.categoryInput) elements.categoryInput.value = matched.category;
      if (elements.emojiInput && !elements.emojiInput.value.trim()) elements.emojiInput.value = matched.emoji || '';
    }
    if (value.trim().length >= 2) queueProductLookup(value);
  });
  elements.itemInput?.addEventListener('focus', () => renderAutocomplete(elements.itemAutocomplete, itemSuggestions(elements.itemInput.value), 'item'));
  elements.itemInput?.addEventListener('blur', () => {
    autocompleteBlurTimeout = setTimeout(() => elements.itemAutocomplete?.classList.add('hidden'), 180);
  });
  elements.itemAutocomplete?.addEventListener('mousedown', (event) => {
    clearTimeout(autocompleteBlurTimeout);
    const button = event.target.closest('[data-suggestion-index]');
    if (!button) return;
    const suggestions = JSON.parse(elements.itemAutocomplete.dataset.suggestions || '[]');
    applyItemSuggestion(suggestions[Number(button.dataset.suggestionIndex)]);
  });
  elements.staplesRail?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-staple-name]');
    if (!button) return;
    openItemModal();
    elements.itemInput.value = button.dataset.stapleName;
    applyItemSuggestion(catalogMatchFor(button.dataset.stapleName) || state.purchaseMemory[normalizeText(button.dataset.stapleName)]);
  });
  elements.listNameInput?.addEventListener('input', () => renderAutocomplete(elements.storeAutocomplete, storeSuggestions(elements.listNameInput.value), 'store'));
  elements.listNameInput?.addEventListener('focus', () => renderAutocomplete(elements.storeAutocomplete, storeSuggestions(elements.listNameInput.value), 'store'));
  elements.listNameInput?.addEventListener('blur', () => {
    autocompleteBlurTimeout = setTimeout(() => elements.storeAutocomplete?.classList.add('hidden'), 180);
  });
  elements.storeAutocomplete?.addEventListener('mousedown', (event) => {
    clearTimeout(autocompleteBlurTimeout);
    const button = event.target.closest('[data-suggestion-index]');
    if (!button) return;
    const suggestions = JSON.parse(elements.storeAutocomplete.dataset.suggestions || '[]');
    applyStoreSuggestion(suggestions[Number(button.dataset.suggestionIndex)]);
  });
  elements.lookupImageBtn?.addEventListener('click', () => lookupProductImage());
  elements.imageUrlInput?.addEventListener('input', () => setProductImage(elements.imageUrlInput.value, elements.imageUrlInput.value ? 'Using pasted product photo.' : 'Looks up real product photos from Open Food Facts.'));
  elements.currentList?.addEventListener('click', handleCurrentListActions);
  elements.saveListActionBtn?.addEventListener('click', handleSaveList);
  elements.savedListsContainer?.addEventListener('click', handleSavedListActions);
  elements.clearListLink?.addEventListener('click', clearCurrentList);
  elements.exportDataBtn?.addEventListener('click', exportData);
  elements.importDataInput?.addEventListener('change', importData);
  elements.bottomSavedListsToggleBtn?.addEventListener('click', openSavedDrawer);
  elements.savedDrawerOverlay?.addEventListener('click', () => setModal(elements.savedDrawer, false));
  elements.closeSavedDrawerBtn?.addEventListener('click', () => setModal(elements.savedDrawer, false));
  elements.authStatusPill?.addEventListener('click', (event) => {
    event.preventDefault();
    if (state.authLoading) return;
    if (state.session && state.user) void signOut();
    else void openAuthModal('sign-in');
  });
  elements.authForm?.addEventListener('submit', submitAuth);
  elements.accountSignOutBtn?.addEventListener('click', signOut);
  elements.closeAuthModalBtn?.addEventListener('click', closeAuthModal);
  elements.authModal?.addEventListener('click', (event) => {
    if (event.target === elements.authModal) closeAuthModal();
  });
  elements.authModeToggleBtn?.addEventListener('click', () => {
    void openAuthModal(state.authMode === 'sign-up' ? 'sign-in' : 'sign-up');
  });
  elements.itemSearchInput?.addEventListener('input', () => {
    state.search = elements.itemSearchInput.value;
    renderCurrentList();
  });
  elements.categoryFilter?.addEventListener('change', () => {
    state.category = elements.categoryFilter.value;
    renderCurrentList();
  });
  elements.sortSelect?.addEventListener('change', () => {
    state.sort = elements.sortSelect.value;
    renderCurrentList();
  });
  elements.savedSearchInput?.addEventListener('input', () => {
    state.savedSearch = elements.savedSearchInput.value;
    renderSavedLists();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeItemModal();
      closeAuthModal();
      setModal(elements.savedDrawer, false);
      elements.itemAutocomplete?.classList.add('hidden');
      elements.storeAutocomplete?.classList.add('hidden');
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      openItemModal();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      handleSaveList();
    }
  });
}

function exposeDiagnostics() {
  window.groceryApp = {
    getState: () => ({
      itemCount: state.currentList.length,
      savedListCount: Object.keys(state.savedLists).length,
      signedIn: isSignedIn(),
      authConfigured: Boolean(clerkPublishableKey),
    }),
    addDemoItem: () => {
      state.currentList.push(normalizeItem({ name: 'Demo apples', quantity: 2, emoji: '🍎', category: 'Produce' }));
      persistCurrentList();
      renderAll();
      return window.groceryApp.getState();
    },
    openAddItem: () => openItemModal(),
    openSavedLists: () => openSavedDrawer(),
    openAuth: () => openAuthModal('sign-in'),
    openAccount: () => openAccountModal(),
  };
}

async function runSmokeTest() {
  try {
    state.currentList = [];
    state.savedLists = {};
    state.purchaseMemory = {};
    saveData(STORAGE_KEYS.currentList, state.currentList);
    saveData(STORAGE_KEYS.savedLists, state.savedLists);
    saveData(STORAGE_KEYS.purchaseMemory, state.purchaseMemory);

    elements.quickAddInput.value = 'apples';
    handleQuickAdd({ preventDefault() {} });
    if (state.currentList.length !== 1 || state.currentList[0].category !== 'Produce') throw new Error('quick add failed');

    openItemModal();
    elements.itemInput.value = 'm';
    renderAutocomplete(elements.itemAutocomplete, itemSuggestions('m'), 'item');
    const suggestions = JSON.parse(elements.itemAutocomplete.dataset.suggestions || '[]');
    if (suggestions.length === 0) throw new Error('item autocomplete empty');
    applyItemSuggestion(suggestions[0]);
    elements.quantityInput.value = '2';
    elements.imageUrlInput.value = 'https://static.openfoodfacts.org/images/products/301/762/042/2003/front_en.633.400.jpg';
    handleAddItem({ preventDefault() {} });
    if (state.currentList.length !== 2 || !state.currentList[1].imageUrl) throw new Error('add item failed');

    openItemModal();
    elements.itemInput.value = 'eggs';
    handleAddItem({ preventDefault() {} });
    if (state.currentList.length !== 3) throw new Error('second add failed');

    elements.listNameInput.value = 'Publix';
    renderAutocomplete(elements.storeAutocomplete, storeSuggestions('p'), 'store');
    if (JSON.parse(elements.storeAutocomplete.dataset.suggestions || '[]').length === 0) throw new Error('store autocomplete empty');
    handleSaveList();
    if (!state.savedLists.Publix) throw new Error('save list failed');

    setModal(elements.savedDrawer, true);
    if (elements.savedDrawer.classList.contains('hidden')) throw new Error('saved drawer failed');

    const result = document.createElement('div');
    result.id = 'smokeResult';
    result.dataset.result = 'pass';
    result.textContent = 'smoke-pass';
    document.body.append(result);
  } catch (error) {
    const result = document.createElement('div');
    result.id = 'smokeResult';
    result.dataset.result = 'fail';
    result.textContent = `smoke-fail: ${error.message}`;
    document.body.append(result);
    console.error(error);
  }
}

function init() {
  state.currentList = loadData(STORAGE_KEYS.currentList, []).map(normalizeItem);
  state.savedLists = loadData(STORAGE_KEYS.savedLists, {});
  state.purchaseMemory = loadData(STORAGE_KEYS.purchaseMemory, {});
  state.productImageCache = loadData(STORAGE_KEYS.productImageCache, {});
  bindEvents();
  exposeDiagnostics();
  setAuthMode('sign-in');
  renderAll();
  startListNamePlaceholderAnimation();
  void configureAuthClient().then(() => {
    if (state.user) void loadAccountSavedLists({ silent: true }).then(() => renderAll());
  });
  schedulePurchaseMemoryHydration();

  const isLocalDev = ['localhost', '127.0.0.1'].includes(location.hostname);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    if (isLocalDev) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch((error) => console.log('Service Worker cleanup failed:', error));
    } else {
      navigator.serviceWorker.register('./sw.js').catch((error) => console.log('Service Worker registration failed:', error));
    }
  }

  if (isLocalDev && 'caches' in window) {
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch((error) => console.log('Cache cleanup failed:', error));
  }

  if (location.hash === '#smoke-test') {
    setTimeout(runSmokeTest, 100);
  }
}

document.addEventListener('DOMContentLoaded', init);
