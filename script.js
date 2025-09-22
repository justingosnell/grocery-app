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

//
