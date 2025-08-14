// script.js - Complete Working Version

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    
    // Get references to all the necessary HTML elements
    const itemInput = document.getElementById('itemInput');
    const quantityInput = document.getElementById('quantityInput');
    const addItemBtn = document.getElementById('addItemBtn');
    const addItemForm = document.getElementById('addItemForm');
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
    
    // Modals and their elements
    const deleteModal = document.getElementById('deleteModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const clearListModal = document.getElementById('clearListModal');
    const confirmClearBtn = document.getElementById('confirmClearBtn');
    const copyOptionsModal = document.getElementById('copyOptionsModal');
    const cancelCopyBtn = document.getElementById('cancelCopyBtn');
    
    // Check if all required elements exist
    if (!itemInput || !addItemForm || !currentListElement) {
        console.error('Required DOM elements not found. Make sure your HTML has the correct IDs.');
        return;
    }
    
    console.log('All required DOM elements found, continuing initialization...');
    
    // State variables
    let currentList = [];
    let savedLists = {};
    let editingIndex = -1;
    let isOnline = navigator.onLine;
    const groceryStores = [
        "Walmart", "Kroger", "Albertsons", "Publix", "Whole Foods Market", 
        "Trader Joe's", "Aldi", "Costco", "Sam's Club", "Target", 
        "H-E-B", "Wegmans", "Safeway", "Meijer", "Sprouts Farmers Market", 
        "Fresh Market", "Hy-Vee", "Food Lion", "Stop & Shop", "Giant Food", 
        "Harris Teeter", "WinCo Foods", "Lidl", "Save A Lot", "Raley's"
    ];
    
    // =====================================
    // === UTILITY FUNCTIONS ===================
    // =====================================
    
    // Generic functions for local storage
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
    
    // Show and hide generic modals
    function handleModal(modal, show) {
        if (!modal) return;
        modal.classList.toggle('hidden', !show);
        modal.setAttribute('aria-hidden', !show);
    }
    
    // Show a feedback message
    function showAlert(message, type = 'success') {
        if (!messageAlert) return;
        messageAlert.textContent = message;
        messageAlert.classList.remove('hidden', 'bg-green-500', 'bg-red-500', 'bg-blue-500');

        if (type === 'success') {
            messageAlert.classList.add('bg-green-500');
        } else if (type === 'error') {
            messageAlert.classList.add('bg-red-500');
        } else {
            messageAlert.classList.add('bg-blue-500');
        }
        setTimeout(() => messageAlert.classList.add('hidden'), 3000);
    }
    
    // Add a function to update online status
    function updateOnlineStatus() {
        isOnline = navigator.onLine;
        if (isOnline) {
            showAlert('You are back online. Attempting to sync saved lists.', 'blue');
        }
    }
    
    // Update button states and cursor styles
    function updateButtonStates() {
        // Update Add Item button
        if (addItemBtn && itemInput) {
            const hasText = itemInput.value.trim() !== '';
            addItemBtn.disabled = !hasText;
            addItemBtn.style.cursor = hasText ? 'pointer' : 'not-allowed';
        }
        
        // Update Save List button
        if (saveListBtn && listNameInput) {
            const hasName = listNameInput.value.trim() !== '';
            saveListBtn.disabled = !hasName;
            saveListBtn.style.cursor = hasName ? 'pointer' : 'not-allowed';
        }
    }
    
    // NEW: Smooth scroll to saved lists section
    function scrollToSavedLists() {
        const savedListsHeading = document.getElementById('saved-lists-heading');
        if (savedListsHeading) {
            savedListsHeading.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
    
    // =====================================
    // === RENDERING FUNCTIONS =================
    // =====================================
    
    function renderEmptyCurrentList() {
        if (!currentListElement) return;
        currentListElement.innerHTML = `
            <li class="p-6 text-center text-gray-600">
                Your list is empty. Add a new item to get started!
            </li>
        `;
        if (clearListBtnContainer) {
            clearListBtnContainer.classList.add('hidden');
        }
    }
    
    function renderCurrentList() {
        if (!currentListElement) return;
        
        if (currentList.length === 0) {
            renderEmptyCurrentList();
            return;
        }
        
        currentListElement.innerHTML = currentList.map((item, index) => `
            <li class="flex items-center justify-between p-4 card" data-index="${index}">
                <div class="flex items-center gap-4 flex-grow">
                    <input type="checkbox" ${item.completed ? 'checked' : ''} class="h-5 w-5 text-blue-500 focus:ring-blue-400 rounded cursor-pointer" data-action="toggle-complete">
                    <span class="list-item-text flex-grow ${item.completed ? 'line-through opacity-50' : ''}">
                        ${item.name} <span class="dark-gray-text">(${item.quantity})</span>
                    </span>
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
    }
    
    function renderSavedLists() {
        if (!savedListsContainer) return;
        
        const savedListNames = Object.keys(savedLists);
        if (savedListNames.length === 0) {
            savedListsContainer.innerHTML = '<p class="text-gray-600">No lists saved yet.</p>';
            return;
        }
        
        savedListsContainer.innerHTML = savedListNames.map(name => {
            const list = savedLists[name];
            const timestamp = new Date(list.timestamp).toLocaleString();
            return `
                <div class="card p-4" data-list-name="${name}">
                    <div class="mb-3">
                        <h3 class="text-lg font-medium dark-gray-text">${name}</h3>
                        <p class="text-sm timestamp-text">Saved: ${timestamp}</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button class="btn bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded" data-action="load">View</button>
                        <button class="btn bg-yellow-500 hover:bg-yellow-600 text-white text-sm py-1 px-3 rounded" data-action="edit">Edit</button>
                        <button class="btn bg-green-500 hover:bg-green-600 text-white text-sm py-1 px-3 rounded" data-action="copy">Share</button>
                        <button class="btn bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded" data-action="delete">Delete</button>
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

        if (!itemName) {
            showAlert('Please enter an item name.', 'error');
            return;
        }

        if (editingIndex >= 0) {
            currentList[editingIndex] = { name: itemName, quantity: quantity, completed: currentList[editingIndex].completed };
            editingIndex = -1;
            if (addItemBtn) addItemBtn.textContent = 'Add Item';
            showAlert('Item updated successfully!', 'success');
        } else {
            currentList.push({ name: itemName, quantity: quantity, completed: false });
            showAlert('Item added successfully!', 'success');
        }
        
        itemInput.value = '';
        if (quantityInput) quantityInput.value = '1';
        itemInput.focus();
        saveData('currentList', currentList);
        renderCurrentList();
        
        // Update button state
        updateButtonStates();
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
            const item = currentList[index];
            itemInput.value = item.name;
            if (quantityInput) quantityInput.value = item.quantity;
            editingIndex = index;
            if (addItemBtn) addItemBtn.textContent = 'Update Item';
            itemInput.focus();
            const allItems = currentListElement.querySelectorAll('li');
            allItems.forEach(item => item.classList.remove('editing-item'));
            li.classList.add('editing-item');
            updateButtonStates();
        } else if (action === 'delete') {
            currentList.splice(index, 1);
            saveData('currentList', currentList);
            showAlert('Item deleted.', 'error');
            renderCurrentList();
        }
    }
    
    function handleSavedListActions(e) {
        const savedListElement = e.target.closest('[data-list-name]');
        if (!savedListElement) return;
        const listName = savedListElement.dataset.listName;
        const action = e.target.closest('button')?.dataset.action;

        if (action === 'load') {
            currentList = [...savedLists[listName].items];
            saveData('currentList', currentList);
            renderCurrentList();
            showAlert(`List "${listName}" loaded successfully!`, 'success');
        } else if (action === 'edit') {
            // Load the list for editing
            currentList = [...savedLists[listName].items];
            saveData('currentList', currentList);
            renderCurrentList();
            // Pre-fill the list name for easy re-saving
            if (listNameInput) {
                listNameInput.value = listName;
                updateButtonStates();
            }
            showAlert(`List "${listName}" loaded for editing!`, 'blue');
        } else if (action === 'delete') {
            if (confirmDeleteBtn) {
                confirmDeleteBtn.dataset.listName = listName;
                handleModal(deleteModal, true);
            }
        } else if (action === 'copy') {
            handleNativeShare(listName, savedLists[listName].items);
        }
    }
    
    function handleSaveList() {
        if (!listNameInput) return;
        
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

        savedLists[listName] = listData;
        saveData('savedLists', savedLists);
        renderSavedLists();
        showAlert(`List "${listName}" saved successfully!`, 'success');
        
        listNameInput.value = '';
        updateButtonStates();
        
        // NEW: Scroll to saved lists section after a short delay
        setTimeout(() => {
            scrollToSavedLists();
        }, 500); // 500ms delay to let the success message show first
    }
    
    function handleDeleteList() {
        if (!confirmDeleteBtn) return;
        
        const listName = confirmDeleteBtn.dataset.listName;
        delete savedLists[listName];
        saveData('savedLists', savedLists);
        renderSavedLists();
        showAlert(`List "${listName}" deleted.`, 'error');
        handleModal(deleteModal, false);
    }
    
    function handleClearList() {
        currentList = [];
        saveData('currentList', currentList);
        renderCurrentList();
        showAlert('Current list has been cleared.', 'error');
        handleModal(clearListModal, false);
    }
    
    function handleAutocomplete(e) {
        if (!autocompleteContainer) return;
        
        const input = e.target.value.toLowerCase();
        autocompleteContainer.innerHTML = '';
        if (input.length >= 3) {
            autocompleteContainer.classList.remove('hidden');
            const matches = groceryStores.filter(store => store.toLowerCase().startsWith(input));
            if (matches.length > 0) {
                autocompleteContainer.innerHTML = matches.map(match =>
                    `<div class="p-3 cursor-pointer hover:bg-gray-700 rounded-lg">${match}</div>`
                ).join('');
            } else {
                autocompleteContainer.innerHTML = '<div class="p-3 text-gray-400">No suggestions</div>';
            }
        } else {
            autocompleteContainer.classList.add('hidden');
        }
    }
    
    // =====================================
    // === SHARE FUNCTIONS =================
    // =====================================
    
    function handleNativeShare(listName, listItems) {
        // Format the list for sharing
        const listText = listItems.map(item => `• ${item.name} (${item.quantity})`).join('\n');
        const shareText = `${listName}\n\n${listText}`;
        
        // Check if the Web Share API is supported
        if (navigator.share) {
            navigator.share({
                title: `Grocery List: ${listName}`,
                text: shareText,
                url: window.location.href
            })
            .then(() => {
                showAlert('List shared successfully!', 'success');
            })
            .catch((error) => {
                console.log('Error sharing:', error);
                // Fallback to copy to clipboard if share fails
                fallbackCopyShare(shareText);
            });
        } else {
            // Fallback for browsers that don't support Web Share API
            fallbackCopyShare(shareText);
        }
    }
    
    function fallbackCopyShare(text) {
        navigator.clipboard.writeText(text)
            .then(() => {
                showAlert('List copied to clipboard! You can now paste it in any app.', 'blue');
            })
            .catch(err => {
                console.error('Could not copy text: ', err);
                showAlert('Unable to share. Please try again.', 'error');
            });
    }
    
    // =====================================
    // === INITIALIZATION ======================
    // =====================================
    
    function init() {
        console.log('Initializing app...');
        currentList = loadData('currentList') || [];
        savedLists = loadData('savedLists') || {};
        
        renderCurrentList();
        renderSavedLists();
        setupEventListeners();
        updateOnlineStatus();
        updateButtonStates(); // Initialize button states
        console.log('App initialization complete!');
    }
    
    function setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Form submission
        if (addItemForm) {
            addItemForm.addEventListener('submit', handleAddItem);
            console.log('Form event listener added');
        }
        
        // List interactions
        if (currentListElement) {
            currentListElement.addEventListener('click', handleCurrentListActions);
        }
        if (savedListsContainer) {
            savedListsContainer.addEventListener('click', handleSavedListActions);
        }
        
        // Input handlers with immediate button state updates
        if (itemInput && addItemBtn) {
            itemInput.addEventListener('input', updateButtonStates);
        }
        
        if (listNameInput && saveListBtn) {
            listNameInput.addEventListener('input', (e) => {
                updateButtonStates();
                handleAutocomplete(e);
            });
        }

        // Autocomplete
        if (autocompleteContainer && listNameInput && saveListBtn) {
            autocompleteContainer.addEventListener('click', (e) => {
                if (e.target.tagName === 'DIV') {
                    listNameInput.value = e.target.textContent;
                    autocompleteContainer.classList.add('hidden');
                    updateButtonStates();
                }
            });
        }

        // Modal handlers
        if (clearListBtn) {
            clearListBtn.addEventListener('click', () => handleModal(clearListModal, true));
        }
        if (confirmClearBtn) {
            confirmClearBtn.addEventListener('click', handleClearList);
        }
        
        const cancelClearBtn = document.getElementById('cancelClearBtn');
        if (cancelClearBtn) {
            cancelClearBtn.addEventListener('click', () => handleModal(clearListModal, false));
        }
        
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', handleDeleteList);
        }
        
        const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => handleModal(deleteModal, false));
        }
        
        if (copyOptionsModal) {
            copyOptionsModal.addEventListener('click', (e) => {
                const format = e.target.dataset.format;
                if (format) {
                    handleCopyList(format);
                    handleModal(copyOptionsModal, false);
                }
            });
        }
        
        if (cancelCopyBtn) {
            cancelCopyBtn.addEventListener('click', () => handleModal(copyOptionsModal, false));
        }
        
        if (saveListBtn) {
            saveListBtn.addEventListener('click', handleSaveList);
        }
        
        // Online/offline status listeners
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        
        console.log('Event listeners setup complete!');
    }
    
    function handleCopyList(format) {
        const listToCopy = currentList.map(item => {
            if (format === 'checkbox') {
                return `[ ] ${item.name} (${item.quantity})`;
            }
            return `${item.name} (${item.quantity})`;
        }).join('\n');

        navigator.clipboard.writeText(listToCopy)
            .then(() => showAlert('List copied to clipboard!', 'success'))
            .catch(err => console.error('Could not copy text: ', err));
    }
    
    function generateNotesAppUrl(listItems) {
        const listText = listItems.map(item => `${item.name} (${item.quantity})`).join('\n');
        const encodedText = encodeURIComponent(listText);
        return `data:text/plain;charset=utf-8,${encodedText}`;
    }
    
    // Initialize the app
    init();
    
}); // End of DOMContentLoaded event listener
