// PagePocket Background Service Worker
// Initializes context menus and listens for quick clips

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'pagepocket-save-selection',
    title: 'Save highlight to PagePocket',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    id: 'pagepocket-save-page',
    title: 'Clip page to PagePocket',
    contexts: ['page'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === 'pagepocket-save-selection' && info.selectionText) {
    const item = {
      id: `pp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      url: tab.url || '',
      title: tab.title || 'Saved Highlight',
      domain: tab.url ? new URL(tab.url).hostname.replace(/^www\./, '') : '',
      type: 'highlight',
      readingStatus: 'unread',
      isFavorite: false,
      selectedText: info.selectionText,
      tags: ['highlight'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Store in IndexedDB as well as chrome.storage.local so all items appear unified in PagePocket Studio
    chrome.storage.local.get(['pagepocket_clips'], (result) => {
      const clips = result.pagepocket_clips || [];
      clips.unshift(item);
      chrome.storage.local.set({ pagepocket_clips: clips });
    });

    // Also persist directly into IndexedDB
    try {
      const request = indexedDB.open('PagePocketDB', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('items')) {
          db.createObjectStore('items', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('items', 'readwrite');
        tx.objectStore('items').put(item);
      };
    } catch (e) {
      console.warn('Could not write to IndexedDB in service worker:', e);
    }
  }
});
