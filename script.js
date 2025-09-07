// script.js

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// Get references to all the necessary HTML elements
const itemInput = document.getElementById('itemInput');
const quantityInput = document.getElementById('quantityInput');
const emojiInput = document.getElementById('emojiInput');
const addItemBtn = document.getElementById('addItemBtn');
const addItemForm = document.getElementById('addItemForm');
const addItemModal = document.getElementById('addItemModal');
const floatingAddBtn = document.getElementById('floatingAddBtn');
const cancelAddBtn = document.getElementById('cancelAddBtn');
const currentListElement = document.getElementById('currentList');
const clearListBtn = document.getElementById('clearListBtn');
const clearListBtnContainer = document.getElementById('clearListBtnContainer');
const listNameInput = document.getElementById('listNameInput');
const autocompleteContainer = document.getElementById('autocompleteContainer');
const nameWarning = document.getElementById('nameWarning');
const saveListBtn = document.getElementById('saveListBtn');
const savedListsContainer = document.getElementById('savedListsContainer');
const messageAlert = document.getElementById('messageAlert');
const notesAppLink = document.getElementById('notesAppLink');
const itemAutocomplete = document.getElementById('itemAutocomplete');
const ariaLive = document.getElementById('ariaLive');
const fabAdd = document.getElementById('fabAdd');
const toggleSavedPanel = document.getElementById('toggleSavedPanel');
const savedPanel = document.getElementById('savedPanel');
const savedSearchInput = document.getElementById('savedSearchInput');

// Modals and their elements
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const clearListModal = document.getElementById('clearListModal');
const confirmClearBtn = document.getElementById('confirmClearBtn');
const copyOptionsModal = document.getElementById('copyOptionsModal');
const cancelCopyBtn = document.getElementById('cancelCopyBtn');

// State variables
let currentList = [];
let savedLists = {};
let editingIndex = -1;
let isOnline = navigator.onLine;
const groceryStores = ["Walmart", "Kroger", "Albertsons", "Publix", "Whole Foods Market", "Trader Joe's", "Aldi", "Costco", "Sam's Club", "Target", "H-E-B", "Wegmans", "Safeway", "Meijer", "Sprouts Farmers Market", "Fresh Market", "Hy-Vee", "Food Lion", "Stop & Shop", "Giant Food", "Harris Teeter", "WinCo Foods", "Lidl", "Save A Lot", "Raley's"];

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

// Removed IndexedDB helpers; using localStorage instead

// Show and hide generic modals
function handleModal(modal, show) {
    modal.classList.toggle('hidden', !show);
    modal.setAttribute('aria-hidden', !show);
}

// Show a feedback message
function showAlert(message, type = 'success') {
    messageAlert.textContent = message;
    messageAlert.classList.remove('hidden', 'bg-green-500', 'bg-red-500', 'bg-blue-500');

    if (type === 'success') {
        messageAlert.classList.add('bg-green-500');
    } else if (type === 'error') {
        messageAlert.classList.add('bg-red-500');
    } else {
        messageAlert.classList.add('bg-blue-500');
    }
    // ARIA live announcement
    if (ariaLive) ariaLive.textContent = message;

    setTimeout(() => messageAlert.classList.add('hidden'), 3000);
}

// Add a function to update online status
function updateOnlineStatus() {
    isOnline = navigator.onLine;
    if (isOnline) {
        showAlert('You are back online. Attempting to sync saved lists.', 'blue');
    }
}

// =====================================
// === RENDERING FUNCTIONS =================
// =====================================

function renderEmptyCurrentList() {
    currentListElement.innerHTML = `
        <li class="p-6 text-center text-gray-600">
            Your grocery list is empty — start adding items above!
        </li>
    `;
    clearListBtnContainer.classList.add('hidden');
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
                    <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-gray-300 text-gray-700 text-sm">× ${item.quantity}</span>
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
    clearListBtnContainer.classList.remove('hidden');
}

// UPDATED: renderSavedLists function with new buttons (localStorage version)
function renderSavedLists() {
    // Ensure we reflect persisted data
    savedLists = loadData('savedLists') || {};

    let savedListNames = Object.keys(savedLists);
    if (savedFilter) {
        const f = savedFilter.toLowerCase();
        savedListNames = savedListNames.filter(n => n.toLowerCase().includes(f));
    }
    if (savedListNames.length === 0) {
        savedListsContainer.innerHTML = '<p class="text-gray-600">No lists saved yet.</p>';
        return;
    }
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
    const itemName = itemInput.value.trim();
    const quantity = parseInt(quantityInput.value) || 1;
    const emoji = emojiInput.value.trim();

    if (!itemName) {
        showAlert('Please enter an item name.', 'error');
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
        showAlert('Item updated successfully!', 'success');
    } else {
        currentList.push({ 
            name: itemName, 
            quantity: quantity, 
            emoji: emoji,
            completed: false 
        });
        showAlert('Item added successfully!', 'success');
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
            showAlert('Item updated.', 'success');
        } else {
            showAlert('Name cannot be empty.', 'error');
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
        showAlert('Item deleted.', 'error');
        renderCurrentList();
    }
    updateSaveButtonState();
}

// UPDATED: handleSavedListActions function to handle new buttons
function handleSavedListActions(e) {
    const savedListElement = e.target.closest('[data-list-name]');
    if (!savedListElement) return;
    const listName = savedListElement.dataset.listName;
    const action = e.target.closest('button')?.dataset.action;

    if (action === 'view') {
        renderSavedLists();
        activeListName = listName;
        currentList = [...savedLists[listName].items];
        saveData('currentList', currentList);
        renderCurrentList();
        renderSavedLists();
        showAlert(`List "${listName}" loaded successfully!`, 'success');
    } else if (action === 'edit') {
        renderSavedLists();
        activeListName = listName;
        currentList = [...savedLists[listName].items];
        listNameInput.value = listName;
        saveData('currentList', currentList);
        renderCurrentList();
        renderSavedLists();
        showAlert(`List "${listName}" loaded for editing!`, 'success');
        updateSaveButtonState();
    } else if (action === 'share') {
        renderSavedLists();
        notesAppLink.href = generateNotesAppUrl(savedLists[listName].items);
        handleModal(copyOptionsModal, true);
    } else if (action === 'delete') {
        confirmDeleteBtn.dataset.listName = listName;
        handleModal(deleteModal, true);
    }
}

function handleSaveList() {
    const listName = listNameInput.value.trim();
    if (currentList.length === 0) {
        showAlert('Cannot save an empty list.', 'error');
        return;
    }
    if (!listName) {
        showAlert('Please provide a name for your list.', 'error');
        return;
    }

    const listData = {
        items: currentList,
        timestamp: new Date().toISOString()
    };

    // Persist to localStorage
    savedLists = loadData('savedLists') || {};
    savedLists[listName] = listData;
    saveData('savedLists', savedLists);

    activeListName = listName;
    renderSavedLists();
    showAlert(`List "${listName}" saved successfully!`, 'success');
    
    listNameInput.value = '';
    updateSaveButtonState();
}

function handleDeleteList() {
    const listName = confirmDeleteBtn.dataset.listName;
    const lists = loadData('savedLists') || {};
    if (lists[listName]) {
        delete lists[listName];
        saveData('savedLists', lists);
        savedLists = lists;
        if (activeListName === listName) activeListName = '';
        renderSavedLists();
        showAlert(`List "${listName}" deleted.`, 'error');
    } else {
        showAlert('List not found.', 'error');
    }
    handleModal(deleteModal, false);
}

function handleClearList() {
    currentList = [];
    saveData('currentList', currentList);
    renderCurrentList();
    showAlert('Current list has been cleared.', 'error');
    handleModal(clearListModal, false);
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

// Function to update the disabled state of the save button
function updateSaveButtonState() {
    const hasListName = listNameInput.value.trim() !== '';
    const hasItems = currentList.length > 0;
    saveListBtn.disabled = !hasListName || !hasItems;
}

// =====================================
// === INITIALIZATION ======================
// =====================================

function init() {
    currentList = loadData('currentList') || [];
    savedLists = loadData('savedLists') || {};

    renderCurrentList();
    renderSavedLists();
    setupEventListeners();
    updateOnlineStatus();
    updateSaveButtonState();
}

function setupEventListeners() {
    currentListElement.addEventListener('click', handleCurrentListActions);
    // Double-click to start inline edit
    currentListElement.addEventListener('dblclick', (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        const index = parseInt(li.dataset.index);
        startInlineEdit(li, index);
    });
    // Drag & drop reordering
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
    
    // Floating add button and modal event listeners
    floatingAddBtn.addEventListener('click', () => {
        handleModal(addItemModal, true);
        itemInput.focus();
    });
    
    cancelAddBtn.addEventListener('click', () => {
        handleModal(addItemModal, false);
        // Clear form when canceling
        itemInput.value = '';
        quantityInput.value = '1';
        emojiInput.value = '';
        editingIndex = -1;
        addItemBtn.textContent = 'Add Item';
    });
    
    // Emoji button event listeners
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('emoji-btn')) {
            const emoji = e.target.dataset.emoji;
            emojiInput.value = emoji;
            emojiInput.focus(); // Focus back to input for further editing
        }
    });
    
    // Enhanced emoji input handling
    emojiInput.addEventListener('input', (e) => {
        // Allow users to type emojis directly from their device keyboard
        // This will automatically handle emoji input from mobile keyboards, 
        // emoji pickers, and copy-paste operations
        const value = e.target.value;
        
        // Optional: Limit to reasonable length for emojis (some emojis are multi-character)
        if (value.length > 8) {
            e.target.value = value.substring(0, 8);
        }
        
        // Visual feedback for emoji input
        if (value.trim()) {
            emojiInput.style.fontSize = '1.25rem';
            emojiInput.style.textAlign = 'center';
        } else {
            emojiInput.style.fontSize = '';
            emojiInput.style.textAlign = '';
        }
    });
    
    // Add placeholder text that changes based on device
    if (emojiInput) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
        const isWindows = /Win/.test(navigator.userAgent);
        
        if (isMobile) {
            emojiInput.placeholder = "🥛 tap emoji keyboard";
        } else if (isMac) {
            emojiInput.placeholder = "🥛 or press Ctrl+Cmd+Space";
        } else if (isWindows) {
            emojiInput.placeholder = "🥛 or press Win+.";
        } else {
            emojiInput.placeholder = "🥛 or use emoji picker";
        }
    }
    
    // Add keyboard shortcut hints
    emojiInput.addEventListener('focus', () => {
        const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
        const isWindows = /Win/.test(navigator.userAgent);
        
        if (isMac) {
            emojiInput.title = "Tip: Press Ctrl+Cmd+Space to open emoji picker";
        } else if (isWindows) {
            emojiInput.title = "Tip: Press Win+. to open emoji picker";
        }
    });
    
    // Close modal when clicking outside
    addItemModal.addEventListener('click', (e) => {
        if (e.target === addItemModal) {
            handleModal(addItemModal, false);
            // Clear form when closing
            itemInput.value = '';
            quantityInput.value = '1';
            emojiInput.value = '';
            editingIndex = -1;
            addItemBtn.textContent = 'Add Item';
        }
    });
    
    addItemForm.addEventListener('submit', handleAddItem);
    itemInput.addEventListener('input', () => {
        addItemBtn.disabled = itemInput.value.trim() === '';
        // Item autocomplete
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

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape closes modal
        if (e.key === 'Escape' && !addItemModal.classList.contains('hidden')) {
            handleModal(addItemModal, false);
            // Clear form when closing with escape
            itemInput.value = '';
            quantityInput.value = '1';
            emojiInput.value = '';
            editingIndex = -1;
            addItemBtn.textContent = 'Add Item';
        }
        // Ctrl/Cmd+S saves list
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            if (!saveListBtn.disabled) handleSaveList();
        }
        // Ctrl/Cmd+N opens add item modal
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
            e.preventDefault();
            handleModal(addItemModal, true);
            itemInput.focus();
        }
    });

    // Saved panel toggle (mobile)
    if (toggleSavedPanel && savedPanel) {
        toggleSavedPanel.addEventListener('click', () => {
            const expanded = toggleSavedPanel.getAttribute('aria-expanded') === 'true';
            toggleSavedPanel.setAttribute('aria-expanded', String(!expanded));
            toggleSavedPanel.textContent = expanded ? 'Show' : 'Hide';
            savedPanel.classList.toggle('hidden', expanded);
        });
    }

    // Saved lists search
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

    saveListBtn.addEventListener('click', handleSaveList);

    clearListBtn.addEventListener('click', () => handleModal(clearListModal, true));
    confirmClearBtn.addEventListener('click', handleClearList);
    document.getElementById('cancelClearBtn').addEventListener('click', () => handleModal(clearListModal, false));
    
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
}

function handleCopyList(format) {
    const listToCopy = currentList.map(item => {
        const emoji = item.emoji ? `${item.emoji} ` : '';
        if (format === 'checkbox') {
            return `[ ] ${emoji}${item.name} (${item.quantity})`;
        }
        return `${emoji}${item.name} (${item.quantity})`;
    }).join('\n');

    navigator.clipboard.writeText(listToCopy)
        .then(() => showAlert('List copied to clipboard!', 'success'))
        .catch(err => console.error('Could not copy text: ', err));
}

function generateNotesAppUrl(listItems) {
    const listText = listItems.map(item => {
        const emoji = item.emoji ? `${item.emoji} ` : '';
        return `${emoji}${item.name} (${item.quantity})`;
    }).join('\n');
    const encodedText = encodeURIComponent(listText);
    return `data:text/plain;charset=utf-8,${encodedText}`;
}

init();