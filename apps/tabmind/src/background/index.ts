// TabMind background service worker
// Handles tab events and background session maintenance

chrome.runtime.onInstalled.addListener(() => {
  console.log('[TabMind] Background service worker initialized.');
});

// Listen for messages from popup or dashboard
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_WORKSPACE_STATS') {
    chrome.tabs.query({}, (tabs) => {
      sendResponse({ openTabCount: tabs.length });
    });
    return true; // async response
  }
});
