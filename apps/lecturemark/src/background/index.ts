// LectureMark Background Service Worker
import { LectureMarkService } from '../services/lecturemark';
import { formatSecondsToTimestamp } from '@nexora/browser-utils';

chrome.runtime.onInstalled.addListener(() => {
  console.log('LectureMark installed successfully.');
  try {
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
      chrome.sidePanel
        .setPanelBehavior({ openPanelOnActionClick: false })
        .catch(() => {});
    }
  } catch {}
});

// Listen for messages from popup/sidepanel/content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'OPEN_DASHBOARD') {
    const url = chrome.runtime.getURL('dashboard.html');
    chrome.tabs.create({ url });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'OPEN_SIDEPANEL') {
    chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'SAVE_NOTE_FROM_PAGE') {
    const p = request.payload;
    LectureMarkService.findOrCreateLectureForUrl(
      p.url,
      p.title,
      p.videoId,
      p.channelName,
      p.duration
    )
      .then((lec) => {
        const newNote = {
          id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lectureId: lec.id,
          timestampSeconds: p.timestampSeconds,
          formattedTimestamp: formatSecondsToTimestamp(p.timestampSeconds),
          title: p.noteTitle || (p.isChapter ? 'Chapter' : 'Note'),
          content: p.content || p.noteTitle,
          tags: p.tags || ['Important'],
          isChapter: !!p.isChapter,
          isRevised: false,
        };
        return LectureMarkService.saveNote(newNote);
      })
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  return false;
});
