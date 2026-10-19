// CiteRight Background Service Worker
// Initializes context menus and handles citation extensions lifecycle

chrome.runtime.onInstalled.addListener(() => {
  console.log('[CiteRight] Extension installed.');
});
