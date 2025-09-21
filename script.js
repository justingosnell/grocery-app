// script.js

// Service worker registration handled in index.html (disabled on localhost)

// Get references to all the necessary HTML elements
console.log('Starting to declare variables...');
const itemInput = document.getElementById('itemInput');
const quantityInput = document.getElementById('quantityInput');
const emojiInput = document.getElementById('emojiInput');
const addItemBtn = document.getElementById('addItemBtn');
const addItemForm = document.getElementById('addItemForm');
const addItemModal = document.getElementById('addItemModal');
// floatingAddBtn removed - functionality moved to scroll-to-top button
const cancelAddBtn = document.getElementById('cancelAddBtn');
const currentListElement = document.getElementById('currentList');
const clearListBtn = document.getElementById('clearListBtn');
const clearListBtnContainer = document.getElementById('clearListBtnContainer');
const listNameInput = document.getElementById('listNameInput');
const autocompleteContainer = document.getElementById('autocompleteContainer');
const nameWarning = document.getElementById('nameWarning');
const savedListsContainer = document.getElementById('savedListsContainer');
// Removed messageAlert to be replaced by a toast
const notesAppLink = document.getElementById('notesAppLink');
const itemAutocomplete = document.getElementById('itemAutocomplete');
const ariaLive = document.getElementById('ariaLive');
// fabAdd, toggleSavedPanel, and savedPanel are replaced by the new bottom nav
const savedSearchInput = document.getElementById('savedSearchInput');
const clearListLink = document.getElementById('clearListLink');
// --- NEW FEATURE: Bottom Navigation and Toast Elements ---
const showSavedListsBtn = document.getElementById('showSavedListsBtn');
const addNewItemBtn = document.getElementById('addNewItemBtn');
const savedPanel = document.getElementById('savedPanel');
const toastContainer = document.getElementById('toastContainer');
const bottomNav = document.querySelector('.bottom-nav');
const savedListsBadge = document.getElementById('savedListsBadge');
// --- END NEW FEATURE ---

// Debug: Check if critical elements are found
console.log('DOM Elements Check:', {
    itemInput: !!itemInput,
    quantityInput: !!quantityInput,
    addItemBtn: !!addItemBtn,
    addItemForm: !!addItemForm,
    addItemModal: !!addItemModal,
    showSavedListsBtn: !!showSavedListsBtn,
    addNewItemBtn: !!addNewItemBtn,
    savedPanel: !!savedPanel
});

// Check for null elements that might cause errors
const missingElements = [];
if (!itemInput) missingElements.push('itemInput');
if (!quantityInput) missingElements.push('quantityInput');
if (!addItemBtn) missingElements.push('addItemBtn');
if (!addItemForm) missingElements.push('addItemForm');
if (!addItemModal) missingElements.push('addItemModal');
if (!cancelAddBtn) missingElements.push('cancelAddBtn');
if (!currentListElement) missingElements.push('currentListElement');
if (!clearListBtn) missingElements.push('clearListBtn');
if (!clearListBtnContainer) missingElements.push('clearListBtnContainer');
if (!listNameInput) missingElements.push('listNameInput');
if (!autocompleteContainer) missingElements.push('autocompleteContainer');
if (!nameWarning) missingElements.push('nameWarning');
if (!savedListsContainer) missingElements.push('savedListsContainer');
if (!savedListsBadge) missingElements.push('savedListsBadge');
if (!notesAppLink) missingElements.push('notesAppLink');
if (!itemAutocomplete) missingElements.push('itemAutocomplete');
if (!ariaLive) missingElements.push('ariaLive');
if (!savedSearchInput) missingElements.push('savedSearchInput');
if (!clearListLink) missingElements.push('clearListLink');

if (missingElements.length > 0) {
    console.error('Missing HTML elements:', missingElements);
}

// Modals and their elements
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const copyOptionsModal = document.getElementById('copyOptionsModal');
const cancelCopyBtn = document.getElementById('cancelCopyBtn');

// State variables
let currentList = [];
let savedLists = {};
let editingIndex = -1;
let isOnline = navigator.onLine;
const groceryStores = ["Walmart", "Kroger", "Albertsons", "Publix", "Whole Foods Market", "Trader Joe's", "Aldi", "Costco", "Sam's Club", "Target", "H-E-B", "Wegmans", "Safeway", "Meijer", "Sprouts Farmers Market", "Fresh Market", "Hy-Vee", "Food Lion", "Stop & Shop", "Giant Food", "Harris Teeter", "WinCo Foods", "Lidl", "Save A Lot", "Raley's","Food Depot","Ingles","Sam's Club"];

// Common grocery items for autocomplete suggestions
const groceryItems = [
    "Apples", "Bananas", "Oranges", "Grapes", "Strawberries", "Blueberries",
    "Tomatoes", "Potatoes", "Onions", "Garlic", "Carrots", "Lettuce", "Spinach",
    "Broccoli", "Cucumbers", "Bell Peppers", "Avocados", "Mushrooms",
    "Chicken", "Ground Beef", "Pork Chops", "Bacon", "Sausage", "Eggs",
    "Milk", "Yogurt", "Cheese", "Butter",
    "Bread", "Tortillas", "Rice", "Pasta", "Oats", "Cereal",
    "Olive Oil", "Sugar", "Flour", "Salt", "Pepper", "Spices",
    "Beans", "Canned Tomatoes", "Tuna",
    "Coffee", "Tea", "Juice", "Soda", "Water",
    "Chips", "Crackers", "Cookies", "Chocolate",
    "Toilet Paper", "Paper Towels", "Soap", "Shampoo", "Toothpaste"
];

// UI state
let activeListName = '';
let inlineEditingIndex = -1;
let dragSrcIndex = null;
let savedFilter = '';

// Storage uses localStorage for saved lists

// =====================================
// === UTILITY FUNCTIONS ===================
// =====================================

// Generic functions for local storage (kept for current list only)
function saveData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error("Error saving to localStorage", e);
    }
}

function loadData(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error("Error loading from localStorage", e);
        return null;
    }
}

// --- NEW FEATURE: show/hide modals with slide animation ---
function handleModal(modal, show) {
    const modalContent = modal.querySelector('.modal-content');
    if (show) {
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        setTimeout(() => {
            modalContent.classList.remove('slide-down');
            modalContent.classList.add('slide-up');
        }, 10);
    } else {
        modalContent.classList.remove('slide-up');
        modalContent.classList.add('slide-down');
        modalContent.addEventListener('transitionend', () => {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        }, {
            once: true
        });
    }
}

// Helper for inline HTML onclick="hideModal('savedPanel')"
function hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) handleModal(modal, false);
}

// Close saved lists when overlay clicked
const savedPanelOverlay = document.getElementById('savedPanelOverlay');
if (savedPanelOverlay) {
    savedPanelOverlay.addEventListener('click', () => {
        const panel = document.getElementById('savedPanel');
        if (panel) handleModal(panel, false);
    });
}

// --- Auth UI elements ---
const loginLink = document.getElementById('loginLink');
const logoutLink = document.getElementById('logoutLink');
const authPanel = document.getElementById('authPanel');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authUserLabel = document.getElementById('authUserLabel');
const accountPanel = document.getElementById('accountPanel');
const accountUsername = document.getElementById('accountUsername');
const accountLogoutBtn = document.getElementById('accountLogoutBtn');
const accountModal = document.getElementById('accountModal');
const accountNavBtn = document.getElementById('accountNavBtn');
const accountNavLabel = document.getElementById('accountNavLabel');
const registerPasswordInput = document.getElementById('registerPassword');
const passwordStrengthBar = document.getElementById('passwordStrengthBar');
const passwordStrengthLabel = document.getElementById('passwordStrengthLabel');
const showRegisterLink = document.getElementById('showRegisterLink');
const showLoginLink = document.getElementById('showLoginLink');

function showAuthView(view) {
    if (!loginForm || !registerForm) return;
    if (view === 'register') {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    } else {
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    }
}

function setAuthUI(auth) {
    if (!loginLink || !logoutLink || !authUserLabel) return;
    const loggedIn = !!auth?.token;
    if (loggedIn) {
        loginLink?.classList.add('hidden');
        logoutLink?.classList.remove('hidden');
        authUserLabel.textContent = `Logged in as ${auth.username}`;
        authPanel?.classList.add('hidden');
        accountPanel?.classList.remove('hidden');
        if (accountUsername) accountUsername.textContent = auth.username || '';
    } else {
        loginLink?.classList.remove('hidden');
        logoutLink?.classList.add('hidden');
        authUserLabel.textContent = '';
        accountPanel?.classList.add('hidden');
        if (accountUsername) accountUsername.textContent = '';
    }
    // Update bottom nav label
    if (accountNavLabel) accountNavLabel.textContent = loggedIn ? 'Logout' : 'Login';
}

function getAuth() {
    const token = localStorage.getItem(TOKEN_KEY);
    const username = localStorage.getItem('authUsername');
    return token ? { token, username } : null;
}

function setAuth(token, username) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem('authUsername', username);
    setAuthUI({ token, username });
}

function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('authUsername');
    setAuthUI(null);
}

// Close saved lists with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const panel = document.getElementById('savedPanel');
        if (panel && !panel.classList.contains('hidden')) {
            handleModal(panel, false);
        }
    }
});
// --- END NEW FEATURE ---

// --- NEW FEATURE: Toast Feedback System ---
function showToast(message, type = 'info') {
    if (!toastContainer) {
        console.error('Toast container element not found.');
        return;
    }

    const toast = document.createElement('div');
    let bgColor = 'bg-blue-500';
    if (type === 'success') bgColor = 'bg-green-500';
    if (type === 'error') bgColor = 'bg-red-500';

    toast.className = `${bgColor} p-4 rounded-lg text-white font-medium mb-2 shadow-lg opacity-0 transition-opacity duration-300`;
    toast.textContent = message;

    toastContainer.appendChild(toast);
    toast.style.pointerEvents = 'auto'; // Make it clickable if needed

    setTimeout(() => toast.style.opacity = '1', 10);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.addEventListener('transitionend', () => toast.remove(), {
            once: true
        });
    }, 3000);
    if (ariaLive) ariaLive.textContent = message;
}

// Replaced showAlert with showToast
const showAlert = showToast;

// --- API + Realtime Integration ---
const API_BASE = (window.API_BASE || 'http://localhost:4000');
const TOKEN_KEY = 'authToken';
let serverAvailable = false;

function getAuthHeaders() {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function checkServerAvailable(timeoutMs = 3000) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
        serverAvailable = res.ok;
    } catch (_) {
        serverAvailable = false;
    } finally {
        clearTimeout(t);
    }
    setServerUIByAvailability();
    // Avoid showing a toast on initial load; just initialize socket if available
    if (serverAvailable) {
        initSocket();
    }
    return serverAvailable;
}

function setServerUIByAvailability() {
    // Keep auth UI visible even if server is not available, so modal is never empty
    if (!loginLink || !logoutLink) return;
    if (!serverAvailable) {
        // Show login link, hide logout link
        loginLink.classList.remove('hidden');
        logoutLink.classList.add('hidden');
        // Ensure the auth forms are visible and account panel hidden
        authPanel?.classList.remove('hidden');
        accountPanel?.classList.add('hidden');
    } else {
        // Restore based on auth state
        setAuthUI(getAuth());
    }
}

async function apiRegister(username, password) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Register failed');
    return res.json();
}

async function apiLogin(username, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error((await res.json()).message || 'Login failed');
    return res.json();
}

async function apiGetLists() {
    const res = await fetch(`${API_BASE}/api/lists`, { headers: { ...getAuthHeaders() } });
    if (!res.ok) throw new Error('Failed to fetch lists');
    return res.json();
}

async function apiGetList(name) {
    const res = await fetch(`${API_BASE}/api/lists/${encodeURIComponent(name)}`, { headers: { ...getAuthHeaders() } });
    if (!res.ok) throw new Error('List not found');
    return res.json();
}

async function apiUpsertList(name, items) {
    // Try updating first
    let res = await fetch(`${API_BASE}/api/lists/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ items })
    });
    if (res.status === 404) {
        // Create if not exists
        res = await fetch(`${API_BASE}/api/lists`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ name, items })
        });
    }
    if (!res.ok) throw new Error('Failed to save list');
    return res.json();
}

// Update Saved Lists badge count based on savedLists
function updateSavedListsBadge() {
    if (!savedListsBadge) return;
    const count = Object.keys(savedLists || {}).length;
    if (count > 0) {
        savedListsBadge.textContent = String(count);
        savedListsBadge.classList.remove('hidden');
    } else {
        savedListsBadge.textContent = '0';
        savedListsBadge.classList.add('hidden');
    }
}

async function apiDeleteList(name) {
    const res = await fetch(`${API_BASE}/api/lists/${encodeURIComponent(name)}`, { method: 'DELETE', headers: { ...getAuthHeaders() } });
    if (!res.ok) throw new Error('Failed to delete list');
    return res.json();
}

async function refreshSavedListsFromServer() {
    try {
        const auth = getAuth();
        if (!auth) {
            // Not logged in → keep local cache and show auth UI
            setAuthUI(null);
            renderSavedLists();
            return;
        }
        const lists = await apiGetLists();
        const obj = {};
        lists.forEach(l => {
            obj[l.name] = { items: l.items || [], timestamp: l.updatedAt || new Date().toISOString() };
        });
        savedLists = obj;
        saveData('savedLists', savedLists);
        renderSavedLists();
    } catch (e) {
        // server unreachable or unauthorized → hide server-specific UI
        renderSavedLists();
    }
}

// Initialize Socket.IO client if available
let socket = null;
function initSocket() {
    try {
        if (!window.io || !serverAvailable) return;
        if (socket && socket.connected) return;
        const auth = getAuth();
        socket = window.io(API_BASE, {
            transports: ['websocket', 'polling'],
            auth: auth?.token ? { token: auth.token } : undefined
        });
        const onChange = () => refreshSavedListsFromServer();
        socket.on('connect', () => console.log('Socket connected'));
        socket.on('list:created', onChange);
        socket.on('list:updated', onChange);
        socket.on('list:deleted', onChange);
    } catch (e) {
        console.warn('Socket initialization failed:', e);
    }
}
// --- END NEW FEATURE ---


// Add a function to update online status
function updateOnlineStatus() {
    isOnline = navigator.onLine;
    if (isOnline) {
        showToast('You are back online. Attempting to sync saved lists.', 'blue');
    }
}

// Utility to add clear button logic to an input
function setupClearButton(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(buttonId);
    if (!input || !btn) return;
    input.addEventListener('input', function() {
        btn.classList.toggle('hidden', !input.value);
    });
    btn.addEventListener('click', function(e) {
        input.value = '';
        btn.classList.add('hidden');
        input.focus();
        // Optionally, trigger input event for listeners
        input.dispatchEvent(new Event('input', {
            bubbles: true
        }));
    });
}

document.addEventListener('DOMContentLoaded', function() {
    setupClearButton('listNameInput', 'clearListNameInput');
    setupClearButton('itemInput', 'clearItemInput');
    setupClearButton('emojiInput', 'clearEmojiInput');
    setupClearButton('savedSearchInput', 'clearSavedSearchInput');
});

// =====================================
// === RENDERING FUNCTIONS =================
// =====================================

function renderEmptyCurrentList() {
    // --- UPDATED: Simplified empty state, removed the button as it's now on the bottom nav ---
    if (currentListElement) {
        currentListElement.innerHTML = `
            <div id="currentListEmptyState" class="text-center py-10 opacity-70">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20 text-blue-500 mx-auto mb-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" />
                </svg>
                <h3 class="text-xl font-bold mb-2">Your list is empty!</h3>
                <p class="text-gray-600 dark:text-gray-400 mb-4">Add your first grocery item from the button below.</p>
            </div>
        `;
    }
    // --- END UPDATED ---

    if (clearListBtnContainer) {
        clearListBtnContainer.classList.add('hidden');
    }
    if (clearListLink) {
        clearListLink.style.display = 'none';
    }
}

function renderCurrentList() {
    if (currentList.length === 0) {
        renderEmptyCurrentList();
        return;
    }
    currentListElement.innerHTML = currentList.map((item, index) => `
        <li class="flex items-center justify-between p-4 card" data-index="${index}" draggable="true">
            <div class="flex items-center gap-4 flex-grow">
                <input type="checkbox" ${item.completed ? 'checked' : ''} class="h-5 w-5 text-blue-500 focus:ring-blue-400 rounded cursor-pointer" data-action="toggle-complete">
                <div class="flex items-center flex-grow">
                    ${item.emoji ? `<span class="text-2xl mr-2">${item.emoji}</span>` : ''}
                    <span class="list-item-text flex-grow ${item.completed ? 'line-through opacity-50' : ''}" title="Double-click to edit">
                        ${item.name}
                    </span>
                    <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-gray-300 text-gray-700 text-sm">${item.quantity}</span>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <button class="text-blue-400 hover:text-blue-500" data-action="edit" aria-label="Edit item">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button class="text-red-500 hover:text-red-600" data-action="delete" aria-label="Delete item">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.013 21H7.987a2 2 0 01-1.92-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        </li>
    `).join('');
    if (clearListBtnContainer) {
        clearListBtnContainer.classList.remove('hidden');
    }
    if (clearListLink) {
        clearListLink.style.display = 'inline';
    }
}

// renderSavedLists function with new buttons (localStorage version)
function renderSavedLists() {
    // Ensure we reflect persisted data (local cache already refreshed from server when possible)
    savedLists = loadData('savedLists') || {};

    // Update the Saved Lists badge count
    updateSavedListsBadge();

    let savedListNames = Object.keys(savedLists);
    if (savedFilter) {
        const f = savedFilter.toLowerCase();
        savedListNames = savedListNames.filter(n => n.toLowerCase().includes(f));
    }

    // --- UPDATED: Re-implementing the empty state for the saved lists panel ---
    const emptyStateEl = document.getElementById('savedListsEmptyState');
    if (savedListNames.length === 0) {
        if (emptyStateEl) emptyStateEl.classList.remove('hidden');
        savedListsContainer.innerHTML = '';
        return;
    } else {
        if (emptyStateEl) emptyStateEl.classList.add('hidden');
    }
    // --- END UPDATED ---

    savedListsContainer.innerHTML = savedListNames.map(name => {
        const list = savedLists[name];
        const timestamp = new Date(list.timestamp).toLocaleString();
        const activeClass = (name === activeListName) ? 'ring-2 ring-blue-500' : '';
        return `
            <div class="card p-4 flex items-center justify-between ${activeClass}" data-list-name="${name}">
                <div>
                    <h3 class="text-lg font-medium dark-gray-text">${name}</h3>
                    <p class="text-sm timestamp-text">Saved: ${timestamp}</p>
                </div>
                <div class="flex space-x-2">
                    <button class="text-green-500 hover:text-green-600" data-action="view" aria-label="View list">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                    <button class="text-blue-500 hover:text-blue-600" data-action="edit" aria-label="Edit list">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button class="text-yellow-500 hover:text-yellow-600" data-action="share" aria-label="Share list">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.479-.114-.935-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.632l6.632-3.316m0 0a3 3 0 105.364-2.684 3 3 0 00-5.364 2.684zm0 9.316a3 3 0 105.364 2.684 3 3 0 00-5.364-2.684z" /></svg>
                    </button>
                    <button class="text-red-500 hover:text-red-600" data-action="delete" aria-label="Delete saved list">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.013 21H7.987a2 2 0 01-1.92-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// =====================================
// === EVENT HANDLERS ======================
// =====================================

function handleAddItem(e) {
    e.preventDefault();
    console.log('handleAddItem called'); // Debug log

    if (!itemInput) {
        console.error('itemInput is null!');
        return;
    }

    const itemName = itemInput.value.trim();
    const quantity = parseInt(quantityInput.value) || 1;
    const emoji = emojiInput.value.trim();

    console.log('Item details:', {
        itemName,
        quantity,
        emoji
    }); // Debug log

    if (!itemName) {
        console.log('No item name provided'); // Debug log
        showToast('Please enter an item name.', 'error');
        return;
    }

    if (editingIndex >= 0) {
        currentList[editingIndex] = {
            name: itemName,
            quantity: quantity,
            emoji: emoji,
            completed: currentList[editingIndex].completed
        };
        editingIndex = -1;
        addItemBtn.textContent = 'Add Item';
        showToast('Item updated successfully!', 'success');
    } else {
        currentList.push({
            name: itemName,
            quantity: quantity,
            emoji: emoji,
            completed: false
        });
        showToast('Item added successfully!', 'success');
    }

    // Clear form and close modal
    itemInput.value = '';
    quantityInput.value = '1';
    emojiInput.value = '';
    handleModal(addItemModal, false);

    saveData('currentList', currentList);
    renderCurrentList();
    updateSaveButtonState();
}

// Double-click inline editing
function startInlineEdit(li, index) {
    inlineEditingIndex = index;
    const item = currentList[index];
    const textSpan = li.querySelector('.list-item-text');
    const quantityBadge = li.querySelector('.ml-2');

    // Create inputs
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = item.name;
    nameInput.className = 'flex-grow p-2 rounded bg-surface border border-gray-300';

    const qtyInput = document.createElement('input');
    qtyInput.type = 'number';
    qtyInput.min = '1';
    qtyInput.value = String(item.quantity);
    qtyInput.className = 'w-20 ml-2 p-2 rounded bg-surface border border-gray-300';

    // Replace DOM
    textSpan.replaceWith(nameInput);
    quantityBadge.replaceWith(qtyInput);
    li.classList.add('editing-item');

    const commit = () => {
        const newName = nameInput.value.trim();
        const newQty = parseInt(qtyInput.value) || 1;
        if (newName) {
            currentList[index].name = newName;
            currentList[index].quantity = newQty;
            saveData('currentList', currentList);
            renderCurrentList();
            showToast('Item updated.', 'success');
        } else {
            showToast('Name cannot be empty.', 'error');
        }
        inlineEditingIndex = -1;
    };

    const cancel = () => {
        renderCurrentList();
        inlineEditingIndex = -1;
    };

    nameInput.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') commit();
        if (ev.key === 'Escape') cancel();
    });
    qtyInput.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') commit();
        if (ev.key === 'Escape') cancel();
    });
    nameInput.addEventListener('blur', commit);
    qtyInput.addEventListener('blur', commit);

    nameInput.focus();
}

function handleCurrentListActions(e) {
    const li = e.target.closest('li');
    if (!li) return;
    const index = parseInt(li.dataset.index);
    const action = e.target.closest('button, input')?.dataset.action;

    if (action === 'toggle-complete') {
        currentList[index].completed = e.target.checked;
        saveData('currentList', currentList);
        renderCurrentList();
    } else if (action === 'edit') {
        // Open modal with current item data for editing
        const item = currentList[index];
        itemInput.value = item.name;
        quantityInput.value = item.quantity;
        emojiInput.value = item.emoji || '';
        editingIndex = index;
        addItemBtn.textContent = 'Update Item';
        handleModal(addItemModal, true);
        itemInput.focus();
    } else if (action === 'delete') {
        currentList.splice(index, 1);
        saveData('currentList', currentList);
        showToast('Item deleted.', 'error');
        renderCurrentList();
    }
    updateSaveButtonState();
}

async function handleSavedListActions(e) {
    const savedListElement = e.target.closest('[data-list-name]');
    if (!savedListElement) return;
    const listName = savedListElement.dataset.listName;
    const action = e.target.closest('button')?.dataset.action;

    if (action === 'view' || action === 'edit' || action === 'share') {
        // Try to load the latest from server, fallback to local cache
        let listFromServer = null;
        try {
            listFromServer = await apiGetList(listName);
        } catch (_) {
            // ignore, fallback below
        }
        const items = listFromServer?.items ?? (savedLists[listName]?.items ?? []);

        if (action === 'view') {
            activeListName = listName;
            currentList = [...items];
            saveData('currentList', currentList);
            renderCurrentList();
            renderSavedLists();
            showToast(`List "${listName}" loaded successfully!`, 'success');
            if (savedPanel) handleModal(savedPanel, false);
        } else if (action === 'edit') {
            activeListName = listName;
            currentList = [...items];
            listNameInput.value = listName;
            saveData('currentList', currentList);
            renderCurrentList();
            renderSavedLists();
            showToast(`List "${listName}" loaded for editing!`, 'success');
            updateSaveButtonState();
        } else if (action === 'share') {
            handleShare(listName, items);
        }
    } else if (action === 'delete') {
        confirmDeleteBtn.dataset.listName = listName;
        handleModal(deleteModal, true);
    }
}

async function handleSaveList() {
    const listName = listNameInput.value.trim();
    if (currentList.length === 0) {
        showToast('Cannot save an empty list.', 'error');
        return;
    }
    if (!listName) {
        showToast('Please provide a name for your list.', 'error');
        return;
    }

    try {
        await apiUpsertList(listName, currentList);
        await refreshSavedListsFromServer();
        activeListName = listName;
        renderSavedLists();
        updateSavedListsBadge();
        showToast('Saved', 'success');
        listNameInput.value = '';
    } catch (e) {
        const listData = { items: currentList, timestamp: new Date().toISOString() };
        savedLists = loadData('savedLists') || {};
        savedLists[listName] = listData;
        saveData('savedLists', savedLists);
        activeListName = listName;
        renderSavedLists();
        showToast('Saved', 'success');
    }
    updateSaveButtonState();
}

async function handleDeleteList() {
    const listName = confirmDeleteBtn.dataset.listName;
    try {
        await apiDeleteList(listName);
        await refreshSavedListsFromServer();
        if (activeListName === listName) activeListName = '';
        renderSavedLists();
        updateSavedListsBadge();
        showToast(`List "${listName}" deleted.`, 'error');
    } catch (e) {
        // Fallback to local cache
        const lists = loadData('savedLists') || {};
        if (lists[listName]) {
            delete lists[listName];
            saveData('savedLists', lists);
            savedLists = lists;
            if (activeListName === listName) activeListName = '';
            renderSavedLists();
            updateSavedListsBadge();
            showToast('Deleted locally (offline).', 'info');
        } else {
            showToast('List not found.', 'error');
        }
    }
    handleModal(deleteModal, false);
}

function handleClearList() {
    currentList = [];
    saveData('currentList', currentList);
    renderCurrentList();
    showToast('Current list has been cleared.', 'success');
    updateSaveButtonState();
}

function handleAutocomplete(e) {
    const input = e.target.value.toLowerCase();
    autocompleteContainer.innerHTML = '';
    if (input.length >= 3) {
        autocompleteContainer.classList.remove('hidden');
        const matches = groceryStores.filter(store => store.toLowerCase().startsWith(input));
        if (matches.length > 0) {
            autocompleteContainer.innerHTML = matches.map(match =>
                `<div class="p-3 cursor-pointer hover:bg-gray-700 rounded-lg" role="option">${match}</div>`
            ).join('');
        } else {
            autocompleteContainer.innerHTML = '<div class="p-3 text-gray-400">No suggestions</div>';
        }
    } else {
        autocompleteContainer.classList.add('hidden');
    }
}

// Function to ensure the save button is always enabled and labeled
function updateSaveButtonState() {
    if (clearListBtn) {
        clearListBtn.disabled = false;
        clearListBtn.textContent = 'Save List';
    }
}

// =====================================
// === INITIALIZATION ======================
// =====================================

async function init() {
    currentList = loadData('currentList') || [];
    savedLists = loadData('savedLists') || {};

    // Initialize badge on load
    updateSavedListsBadge();

    // Check server availability first then set auth UI and socket
    await checkServerAvailable();

    renderCurrentList();
    await refreshSavedListsFromServer();
    renderSavedLists();
    setupEventListeners();
    // Do not show online toast on initial load
    updateSaveButtonState();
    // mark app as booted for fallback
    window.__appBooted = true;
}

// --- NEW FEATURE: Unified Event Listener Setup ---
function setupEventListeners() {
    if (loginLink) {
        loginLink.addEventListener('click', () => {
            const modal = document.getElementById('accountModal');
            if (modal) {
                showAuthView('login');
                handleModal(modal, true);
            }
        });
    }
    if (accountNavBtn) {
        accountNavBtn.addEventListener('click', () => {
            const auth = getAuth();
            if (auth) {
                clearAuth();
                showToast('Logged out.', 'info');
                refreshSavedListsFromServer();
            } else {
                const modal = document.getElementById('accountModal');
                if (modal) {
                    showAuthView('login');
                    handleModal(modal, true);
                }
            }
        });
    }
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', () => showAuthView('register'));
    }
    if (showLoginLink) {
        showLoginLink.addEventListener('click', () => showAuthView('login'));
    }
    if (logoutLink) {
        logoutLink.addEventListener('click', () => {
            clearAuth();
            showToast('Logged out.', 'info');
            refreshSavedListsFromServer();
        });
    }
    if (accountLogoutBtn) {
        accountLogoutBtn.addEventListener('click', () => {
            clearAuth();
            showToast('Logged out.', 'info');
            refreshSavedListsFromServer();
        });
    }
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            try {
                const { token, username: uname } = await apiLogin(username, password);
                setAuth(token, uname);
                showToast('Login successful!', 'success');
                hideModal('accountModal');
                await refreshSavedListsFromServer();
            } catch (err) {
                showToast(err.message || 'Login failed', 'error');
            }
        });
    }
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('registerUsername').value.trim();
            const password = document.getElementById('registerPassword').value;
            const password2 = document.getElementById('registerPassword2').value;
            if (password !== password2) {
                showToast('Passwords do not match.', 'error');
                return;
            }
            try {
                const { token, username: uname } = await apiRegister(username, password);
                setAuth(token, uname);
                showToast('Account created!', 'success');
                hideModal('accountModal');
                await refreshSavedListsFromServer();
            } catch (err) {
                showToast(err.message || 'Register failed', 'error');
            }
        });
    }
    if (registerPasswordInput) {
        registerPasswordInput.addEventListener('input', updatePasswordStrength);
    }
}

function estimatePasswordStrength(pw) {
    // Simple heuristic: length + variety
    let score = 0;
    if (pw.length >= 8) score += 1;
    if (pw.length >= 12) score += 1;
    if (/[a-z]/.test(pw)) score += 1;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;
    return Math.min(score, 5); // 0..5
}

function updatePasswordStrength() {
    if (!registerPasswordInput || !passwordStrengthBar || !passwordStrengthLabel) return;
    const pw = registerPasswordInput.value;
    const score = estimatePasswordStrength(pw);
    const pct = [0, 20, 40, 60, 80, 100][score];
    const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
    const colors = ['bg-red-400','bg-red-400','bg-yellow-400','bg-yellow-500','bg-green-500','bg-green-600'];
    passwordStrengthBar.style.width = pct + '%';
    passwordStrengthBar.className = 'h-2 rounded ' + colors[score];
    passwordStrengthLabel.textContent = labels[score];
}
    currentListElement.addEventListener('click', handleCurrentListActions);
    currentListElement.addEventListener('dblclick', (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        const index = parseInt(li.dataset.index);
        startInlineEdit(li, index);
    });

    currentListElement.addEventListener('dragstart', (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        dragSrcIndex = parseInt(li.dataset.index);
        e.dataTransfer.effectAllowed = 'move';
    });
    currentListElement.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });
    currentListElement.addEventListener('drop', (e) => {
        e.preventDefault();
        const li = e.target.closest('li');
        if (!li) return;
        const destIndex = parseInt(li.dataset.index);
        if (dragSrcIndex === null || destIndex === dragSrcIndex) return;
        const [moved] = currentList.splice(dragSrcIndex, 1);
        currentList.splice(destIndex, 0, moved);
        dragSrcIndex = null;
        saveData('currentList', currentList);
        renderCurrentList();
    });

    savedListsContainer.addEventListener('click', handleSavedListActions);

    if (cancelAddBtn) {
        cancelAddBtn.addEventListener('click', () => {
            if (addItemModal) {
                handleModal(addItemModal, false);
            }
            if (itemInput) itemInput.value = '';
            if (quantityInput) quantityInput.value = '1';
            if (emojiInput) emojiInput.value = '';
            editingIndex = -1;
            if (addItemBtn) addItemBtn.textContent = 'Add Item';
        });
    }

    // Emoji button event listeners
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('emoji-btn')) {
            const emoji = e.target.dataset.emoji;
            emojiInput.value = emoji;
            emojiInput.focus();
        }
    });

    emojiInput.addEventListener('input', (e) => {
        const value = e.target.value;
        if (value.length > 8) {
            e.target.value = value.substring(0, 8);
        }
        if (value.trim()) {
            emojiInput.style.fontSize = '1.25rem';
            emojiInput.style.textAlign = 'center';
        } else {
            emojiInput.style.fontSize = '';
            emojiInput.style.textAlign = '';
        }
    });

    if (emojiInput) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
        const isWindows = /Win/.test(navigator.userAgent);

        if (isMobile) {
            emojiInput.placeholder = " ";
        } else if (isMac) {
            emojiInput.placeholder = "";
        } else if (isWindows) {
            emojiInput.placeholder = "🥛 or press Win+.";
        } else {
            emojiInput.placeholder = "🥛 or use emoji picker";
        }
    }

    emojiInput.addEventListener('focus', () => {
        const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
        const isWindows = /Win/.test(navigator.userAgent);
        if (isMac) {
            emojiInput.title = "Tip: Press Ctrl+Cmd+Space to open emoji picker";
        } else if (isWindows) {
            emojiInput.title = "Tip: Press Win+. to open emoji picker";
        }
    });

    addItemModal.addEventListener('click', (e) => {
        if (e.target === addItemModal) {
            handleModal(addItemModal, false);
            itemInput.value = '';
            quantityInput.value = '1';
            emojiInput.value = '';
            editingIndex = -1;
            addItemBtn.textContent = 'Add Item';
        }
    });

    if (addItemForm) {
        addItemForm.addEventListener('submit', handleAddItem);
    }
    itemInput.addEventListener('input', () => {
        addItemBtn.disabled = itemInput.value.trim() === '';
        if (!itemAutocomplete) return;
        const val = itemInput.value.trim().toLowerCase();
        itemAutocomplete.innerHTML = '';
        if (val.length >= 2) {
            const matches = groceryItems.filter(it => it.toLowerCase().includes(val)).slice(0, 8);
            if (matches.length) {
                itemAutocomplete.classList.remove('hidden');
                itemAutocomplete.innerHTML = matches.map(m => `<div class=\"p-3 cursor-pointer hover:bg-gray-700 rounded-lg\" role=\"option\">${m}</div>`).join('');
            } else {
                itemAutocomplete.classList.add('hidden');
            }
        } else {
            itemAutocomplete.classList.add('hidden');
        }
    });
    if (itemAutocomplete) {
        itemAutocomplete.addEventListener('click', (e) => {
            if (e.target.tagName === 'DIV') {
                itemInput.value = e.target.textContent;
                itemAutocomplete.classList.add('hidden');
                addItemBtn.disabled = itemInput.value.trim() === '';
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !addItemModal.classList.contains('hidden')) {
            handleModal(addItemModal, false);
            itemInput.value = '';
            quantityInput.value = '1';
            emojiInput.value = '';
            editingIndex = -1;
            addItemBtn.textContent = 'Add Item';
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            if (clearListBtn) handleSaveList();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            handleModal(addItemModal, true);
            itemInput.focus();
        }
    });
    
    // --- NEW FEATURE: Bottom Navigation and Mobile UX ---
    if (addNewItemBtn) {
        addNewItemBtn.addEventListener('click', () => {
            handleModal(addItemModal, true);
            // Reset emoji row scroll to start when opening the modal
            const emojiRow = document.querySelector('.emoji-suggestions .emoji-row');
            if (emojiRow) {
                emojiRow.scrollLeft = 0;
                emojiRow.classList.add('at-start');
                emojiRow.classList.remove('at-end');
            }
            if (itemInput) itemInput.focus();
        });
    }

    if (showSavedListsBtn) {
        showSavedListsBtn.addEventListener('click', async () => {
            handleModal(savedPanel, true);
            await refreshSavedListsFromServer();
            renderSavedLists();
        });
    }

    // Keyboard behavior for bottom nav on mobile
    if (bottomNav && window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            const viewportHeight = window.visualViewport.height;
            const screenHeight = window.innerHeight;
            if (viewportHeight < screenHeight) {
                const keyboardHeight = screenHeight - viewportHeight;
                bottomNav.style.transform = `translateY(-${keyboardHeight}px)`;
            } else {
                bottomNav.style.transform = `translateY(0)`;
            }
        });
    }
    // --- END NEW FEATURE ---

    if (savedSearchInput) {
        savedSearchInput.addEventListener('input', () => {
            savedFilter = savedSearchInput.value;
            renderSavedLists();
        });
    }

    listNameInput.addEventListener('input', (event) => {
        updateSaveButtonState();
        handleAutocomplete(event);
    });

    autocompleteContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'DIV') {
            listNameInput.value = e.target.textContent;
            autocompleteContainer.classList.add('hidden');
            updateSaveButtonState();
        }
    });

    if (clearListBtn) {
        clearListBtn.addEventListener('click', handleSaveList);
    }

    if (clearListLink) {
        clearListLink.addEventListener('click', () => {
            if (currentList.length === 0) {
                showToast('List is already empty.', 'info');
                return;
            }
            handleClearList();
        });
    }

    confirmDeleteBtn.addEventListener('click', handleDeleteList);
    document.getElementById('cancelDeleteBtn').addEventListener('click', () => handleModal(deleteModal, false));

    copyOptionsModal.addEventListener('click', (e) => {
        const format = e.target.dataset.format;
        if (format) {
            handleCopyList(format);
            handleModal(copyOptionsModal, false);
        }
    });
    cancelCopyBtn.addEventListener('click', () => handleModal(copyOptionsModal, false));

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

function buildListText(items, withCheckbox = false) {
    return (items || currentList).map(item => {
        const emoji = item.emoji ? `${item.emoji} ` : '';
        return withCheckbox ? `[ ] ${emoji}${item.name} (${item.quantity})` : `${emoji}${item.name} (${item.quantity})`;
    }).join('\n');
}

function handleCopyList(format) {
    const listToCopy = buildListText(currentList, format === 'checkbox');
    navigator.clipboard.writeText(listToCopy)
        .then(() => showToast('List copied to clipboard!', 'success'))
        .catch(err => console.error('Could not copy text: ', err));
}

async function tryNativeShare(title, items) {
    const text = buildListText(items, false);
    if (navigator.share) {
        try {
            await navigator.share({
                title: `Grocery List: ${title}`,
                text
            });
            return true;
        } catch (err) {
            console.debug('Native share canceled/fallback:', err);
        }
    }
    return false;
}

function shareViaMessages(items) {
    const text = encodeURIComponent(buildListText(items, false));
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const smsUrl = isIOS ? `sms:&body=${text}` : `sms:?body=${text}`;
    window.location.href = smsUrl;
}

function shareViaEmail(subject, items) {
    const body = encodeURIComponent(buildListText(items, false));
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
    window.location.href = mailto;
}

function generateNotesAppUrl(listItems) {
    const listText = buildListText(listItems, false);
    const encodedText = encodeURIComponent(listText);
    return `data:text/plain;charset=utf-8,${encodedText}`;
}

async function handleShare(title, items) {
    const didNative = await tryNativeShare(title, items);
    if (didNative) return;

    const isMobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent);
    if (isMobile) {
        shareViaMessages(items);
    } else {
        shareViaEmail(`Grocery List: ${title}`, items);
    }
}

// Robust boot: run after DOM ready (and also fallback with a short timeout)
document.addEventListener('DOMContentLoaded', () => {
    init().catch(err => console.error('Init failed:', err));
});
setTimeout(() => {
    // Fallback init if DOMContentLoaded was missed for any reason
    if (!window.__appBooted) {
        init().catch(err => console.error('Init retry failed:', err));
    }
}, 50);