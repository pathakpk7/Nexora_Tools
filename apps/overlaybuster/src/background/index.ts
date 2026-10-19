import { OverlayBusterService } from '../services/overlaybuster';

// Context Menus
chrome.runtime.onInstalled.addListener(() => {
  try {
    if (chrome.contextMenus && chrome.contextMenus.removeAll) {
      chrome.contextMenus.removeAll(() => {
        try {
          chrome.contextMenus.create({
            id: 'overlaybuster-bust-page',
            title: '⚡ Bust Overlays & Unlock Scroll',
            contexts: ['page'],
          });

          chrome.contextMenus.create({
            id: 'overlaybuster-zap-element',
            title: '🎯 Zap Overlay Element',
            contexts: ['page'],
          });

          chrome.contextMenus.create({
            id: 'overlaybuster-reader-mode',
            title: '📖 Distraction-Free Reader Mode',
            contexts: ['page'],
          });
        } catch {}
      });
    }
  } catch {}
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === 'overlaybuster-bust-page') {
    try {
      chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_AUTO_BUST' });
    } catch {}
  } else if (info.menuItemId === 'overlaybuster-zap-element') {
    try {
      chrome.tabs.sendMessage(tab.id, { type: 'START_ZAP_MODE' });
    } catch {}
  } else if (info.menuItemId === 'overlaybuster-reader-mode') {
    try {
      chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_READER_MODE' });
    } catch {}
  }
});

// Runtime Message Router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'RECORD_BUST_STATS') {
    const report = message.report;
    const domain = message.domain;
    OverlayBusterService.recordBust(report, domain).then((stats) => {
      // Update badge on sender tab
      if (sender.tab?.id && report.overlaysRemoved > 0) {
        chrome.action.setBadgeText({
          tabId: sender.tab.id,
          text: String(report.overlaysRemoved),
        });
        chrome.action.setBadgeBackgroundColor({
          tabId: sender.tab.id,
          color: '#10b981', // Emerald green
        });
      }
      sendResponse({ success: true, stats });
    });
    return true;
  }

  if (message.type === 'GET_GLOBAL_STATS') {
    OverlayBusterService.getStats().then((stats) => {
      sendResponse({ stats });
    });
    return true;
  }
});
