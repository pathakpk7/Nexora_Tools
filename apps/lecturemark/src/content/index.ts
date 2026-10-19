import { ActiveVideoPlaybackState } from '@nexora/shared-types';
import { formatSecondsToTimestamp, extractYoutubeVideoId } from '@nexora/browser-utils';

function parseTimeStringToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':').map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

function findPrimaryVideoElement(): HTMLVideoElement | null {
  const ytVideo = document.querySelector<HTMLVideoElement>('#movie_player video.html5-main-video') ||
                  document.querySelector<HTMLVideoElement>('video.html5-main-video') ||
                  document.querySelector<HTMLVideoElement>('#movie_player video');
  if (ytVideo) return ytVideo;

  const allVideos = Array.from(document.querySelectorAll<HTMLVideoElement>('video'));
  if (allVideos.length === 0) return null;

  const activeVideo = allVideos.find((v) => !v.paused && v.duration > 0) ||
    allVideos.find((v) => v.duration > 0 && (v.offsetHeight > 100 || v.offsetWidth > 100)) ||
    allVideos.find((v) => v.duration > 0) ||
    allVideos[0];

  return activeVideo || null;
}

function extractMetadata(): { title: string; channelName: string; videoId: string; thumbnailUrl: string } {
  const url = window.location.href;
  const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
  const videoId = isYoutube ? (extractYoutubeVideoId(url) || '') : (window.location.pathname.replace(/^\//, '') || 'video');

  let title = document.title || 'Video Lecture';
  let channelName = '';
  let thumbnailUrl = '';

  if (isYoutube) {
    const ytTitleElem = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string, ytd-watch-metadata h1, #container h1.title, #title h1');
    if (ytTitleElem && ytTitleElem.textContent?.trim()) {
      title = ytTitleElem.textContent.trim();
    } else {
      title = title.replace(/ - YouTube$/, '').trim();
    }

    const ytChannelElem = document.querySelector('#channel-name #text, ytd-channel-name a, #owner-name a, #upload-info #text, #channel-name a');
    if (ytChannelElem && ytChannelElem.textContent?.trim()) {
      channelName = ytChannelElem.textContent.trim();
    } else {
      const metaAuthor = document.querySelector('link[itemprop="name"], meta[itemprop="channelId"]');
      if (metaAuthor) {
        channelName = metaAuthor.getAttribute('content') || '';
      }
    }

    if (videoId) {
      thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
  } else {
    channelName = window.location.hostname.replace(/^www\./, '');
  }

  return { title, channelName, videoId, thumbnailUrl };
}

function getActivePlaybackState(): ActiveVideoPlaybackState {
  const url = window.location.href;
  const meta = extractMetadata();
  const video = findPrimaryVideoElement();

  let cur: number | null = null;
  let dur: number | null = null;
  let paused: boolean = true;

  // 1. Primary: Direct HTML5 video tag properties (accurate real-time hardware clock)
  if (video) {
    if (!isNaN(video.currentTime)) {
      cur = Math.floor(video.currentTime);
    }
    if (!isNaN(video.duration) && video.duration > 0) {
      dur = Math.floor(video.duration);
    }
    paused = video.paused;
  }

  // 2. Fallback: YouTube DOM player time elements if video tag is not yet attached or 0
  const ytCurrentTimeElem = document.querySelector('.ytp-time-current');
  const ytDurationElem = document.querySelector('.ytp-time-duration');
  if ((cur === null || isNaN(cur) || cur === 0) && ytCurrentTimeElem?.textContent) {
    const parsedCur = parseTimeStringToSeconds(ytCurrentTimeElem.textContent);
    if (!isNaN(parsedCur) && parsedCur > 0) cur = parsedCur;
  }
  if ((dur === null || isNaN(dur) || dur === 0) && ytDurationElem?.textContent) {
    const parsedDur = parseTimeStringToSeconds(ytDurationElem.textContent);
    if (!isNaN(parsedDur) && parsedDur > 0) dur = parsedDur;
  }

  // 3. YouTube play/pause button state
  const ytPlayBtn = document.querySelector('.ytp-play-button');
  if (ytPlayBtn && paused) {
    const btnTitle = ytPlayBtn.getAttribute('title') || ytPlayBtn.getAttribute('aria-label') || '';
    if (btnTitle.toLowerCase().includes('pause')) {
      paused = false;
    } else if (btnTitle.toLowerCase().includes('play')) {
      paused = true;
    }
  }

  const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
  const isVideoPage = isYoutube && (
    url.includes('/watch') ||
    url.includes('/live/') ||
    url.includes('/shorts/') ||
    Boolean(meta.videoId)
  );
  const hasVideo = Boolean(video) || isVideoPage || isYoutube || (cur !== null && cur >= 0);

  const finalCur = Math.max(0, cur || 0);
  const finalDur = Math.max(0, dur || 0);

  return {
    hasVideo,
    videoUrl: url,
    videoId: meta.videoId,
    title: meta.title,
    channelName: meta.channelName || (isYoutube ? 'YouTube' : ''),
    currentTime: finalCur,
    duration: finalDur,
    formattedCurrentTime: formatSecondsToTimestamp(finalCur),
    formattedDuration: formatSecondsToTimestamp(finalDur),
    paused,
  };
}

// ---------------------------------------------------------------------------
// ON-PAGE FLOATING "PEN ON THE PAGE" WIDGET & QUICK NOTE TAKER
// ---------------------------------------------------------------------------
let floatingWidgetContainer: HTMLDivElement | null = null;

function setupOnPagePenWidget() {
  if (document.getElementById('lecturemark-floating-root')) return;

  const container = document.createElement('div');
  container.id = 'lecturemark-floating-root';
  container.style.position = 'fixed';
  container.style.bottom = '28px';
  container.style.right = '28px';
  container.style.zIndex = '2147483640';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';

  const shadow = container.attachShadow({ mode: 'open' });

  // Styles isolated from host page
  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    .floating-pen-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 9999px;
      box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      user-select: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .floating-pen-btn:hover {
      transform: translateY(-2px) scale(1.03);
      box-shadow: 0 14px 28px -4px rgba(79, 70, 229, 0.6), 0 10px 12px -5px rgba(0, 0, 0, 0.4);
    }
    .floating-pen-btn:active {
      transform: translateY(0) scale(0.98);
    }
    
    .pen-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 50%;
    }
    
    .time-badge {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      font-weight: 700;
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 7px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }

    .modal-overlay {
      display: none;
      position: absolute;
      bottom: 56px;
      right: 0;
      width: 340px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      color: #f8fafc;
      animation: lmFadeIn 0.18s ease-out;
    }
    .modal-overlay.open {
      display: block;
    }
    @keyframes lmFadeIn {
      from { opacity: 0; transform: translateY(8px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #1e293b;
    }
    .modal-title {
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
      color: #e2e8f0;
    }
    .close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 2px;
    }
    .close-btn:hover { color: #ffffff; }

    .input-field {
      width: 100%;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 12px;
      color: #ffffff;
      outline: none;
      margin-bottom: 8px;
      font-family: inherit;
    }
    .input-field:focus {
      border-color: #6366f1;
    }

    .textarea-field {
      width: 100%;
      height: 72px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 12px;
      color: #ffffff;
      outline: none;
      margin-bottom: 10px;
      resize: none;
      font-family: inherit;
      line-height: 1.4;
    }
    .textarea-field:focus {
      border-color: #6366f1;
    }

    .tag-row {
      display: flex;
      gap: 6px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .tag-chip {
      font-size: 10.5px;
      padding: 3px 8px;
      border-radius: 12px;
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #334155;
      cursor: pointer;
      user-select: none;
      transition: all 0.15s;
    }
    .tag-chip.active {
      background: #4f46e5;
      color: #ffffff;
      border-color: #6366f1;
      font-weight: 600;
    }

    .action-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .sidepanel-link {
      font-size: 11px;
      color: #818cf8;
      text-decoration: none;
      cursor: pointer;
    }
    .sidepanel-link:hover {
      text-decoration: underline;
    }
    .save-btn {
      background: #4f46e5;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .save-btn:hover { background: #4338ca; }
    .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .toast-msg {
      display: none;
      background: #064e3b;
      color: #34d399;
      border: 1px solid #059669;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 11.5px;
      text-align: center;
      margin-top: 8px;
      font-weight: 600;
    }
  `;
  shadow.appendChild(style);

  // Modal Card
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-header">
      <div class="modal-title">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
          <path d="M15 3v6h6" />
          <path d="M18.4 13a1.4 1.4 0 0 0-2-2l-5.4 5.4-1 3 3-1 5.4-5.4Z" />
        </svg>
        <span>Note at <span id="lm-modal-ts" style="color:#818cf8;font-family:monospace;">00:00</span></span>
      </div>
      <button class="close-btn" id="lm-modal-close" title="Close">&times;</button>
    </div>
    <input type="text" id="lm-input-title" class="input-field" placeholder="Topic or concept title..." />
    <textarea id="lm-input-content" class="textarea-field" placeholder="Write explanation, formula, doubt, or code snippet..."></textarea>
    <div class="tag-row">
      <span class="tag-chip active" data-tag="Important">Important</span>
      <span class="tag-chip" data-tag="Exam">Exam</span>
      <span class="tag-chip" data-tag="Doubt">Doubt</span>
      <span class="tag-chip" data-tag="Chapter">Chapter</span>
    </div>
    <div class="action-row">
      <span class="sidepanel-link" id="lm-open-sidepanel">Open Side Panel &rarr;</span>
      <button class="save-btn" id="lm-btn-save">Save Note</button>
    </div>
    <div class="toast-msg" id="lm-toast">✓ Note saved to LectureMark!</div>
  `;
  shadow.appendChild(modal);

  // Floating Pen Button
  const btn = document.createElement('div');
  btn.className = 'floating-pen-btn';
  btn.title = 'LectureMark — Take timestamped note';
  btn.innerHTML = `
    <div class="pen-icon-wrap">
      <!-- Pen on a Page Icon -->
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/>
        <path d="M15 3v6h6"/>
        <path d="M18.4 13a1.4 1.4 0 0 0-2-2l-5.4 5.4-1 3 3-1 5.4-5.4Z"/>
      </svg>
    </div>
    <span class="time-badge" id="lm-btn-time">00:00</span>
  `;
  shadow.appendChild(btn);

  let capturedTimestamp = 0;
  let activeTags = ['Important'];

  // Update button time badge periodically
  setInterval(() => {
    const video = findPrimaryVideoElement();
    if (video && !isNaN(video.currentTime)) {
      const cur = Math.floor(video.currentTime);
      const timeElem = shadow.getElementById('lm-btn-time');
      if (timeElem) timeElem.textContent = formatSecondsToTimestamp(cur);
    }
  }, 1000);

  // Click pen button to open modal
  btn.addEventListener('click', () => {
    const video = findPrimaryVideoElement();
    capturedTimestamp = video ? Math.floor(video.currentTime || 0) : 0;
    const tsElem = shadow.getElementById('lm-modal-ts');
    if (tsElem) tsElem.textContent = formatSecondsToTimestamp(capturedTimestamp);

    modal.classList.toggle('open');
    if (modal.classList.contains('open')) {
      const input = shadow.getElementById('lm-input-title') as HTMLInputElement;
      if (input) setTimeout(() => input.focus(), 50);
    }
  });

  // Close modal
  shadow.getElementById('lm-modal-close')?.addEventListener('click', () => {
    modal.classList.remove('open');
  });

  // Tag chip click
  shadow.querySelectorAll('.tag-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const t = chip.getAttribute('data-tag') || '';
      if (activeTags.includes(t)) {
        activeTags = activeTags.filter((x) => x !== t);
        chip.classList.remove('active');
      } else {
        activeTags.push(t);
        chip.classList.add('active');
      }
    });
  });

  // Open side panel from modal
  shadow.getElementById('lm-open-sidepanel')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'OPEN_SIDEPANEL' });
    modal.classList.remove('open');
  });

  // Save note action
  shadow.getElementById('lm-btn-save')?.addEventListener('click', () => {
    const titleInput = shadow.getElementById('lm-input-title') as HTMLInputElement;
    const contentInput = shadow.getElementById('lm-input-content') as HTMLTextAreaElement;
    const noteTitle = titleInput ? titleInput.value.trim() : '';
    const content = contentInput ? contentInput.value.trim() : '';

    if (!noteTitle && !content) return;

    const meta = extractMetadata();
    const video = findPrimaryVideoElement();
    const duration = video ? Math.floor(video.duration || 0) : 0;

    const isChapter = activeTags.includes('Chapter');

    chrome.runtime.sendMessage(
      {
        action: 'SAVE_NOTE_FROM_PAGE',
        payload: {
          url: window.location.href,
          title: meta.title,
          videoId: meta.videoId,
          channelName: meta.channelName,
          duration,
          timestampSeconds: capturedTimestamp,
          noteTitle,
          content: content || noteTitle,
          tags: activeTags,
          isChapter,
        },
      },
      (resp) => {
        if (resp && resp.success) {
          const toast = shadow.getElementById('lm-toast');
          if (toast) {
            toast.style.display = 'block';
            setTimeout(() => {
              toast.style.display = 'none';
              modal.classList.remove('open');
              if (titleInput) titleInput.value = '';
              if (contentInput) contentInput.value = '';
            }, 1200);
          }
        }
      }
    );
  });

  document.body.appendChild(container);
  floatingWidgetContainer = container;
}

// Automatically mount pen widget when video is present
let mountTimeout: any = null;
function checkAndMount() {
  if (document.getElementById('lecturemark-floating-root')) return;
  const video = findPrimaryVideoElement();
  if (video) {
    setupOnPagePenWidget();
  }
}

// Observe DOM for late video player loads (e.g. YouTube client side routing)
const observer = new MutationObserver(() => {
  if (document.getElementById('lecturemark-floating-root')) return;
  if (mountTimeout) clearTimeout(mountTimeout);
  mountTimeout = setTimeout(() => {
    checkAndMount();
  }, 300);
});
observer.observe(document.documentElement, { childList: true, subtree: true });
checkAndMount();

// ---------------------------------------------------------------------------
// MESSAGE LISTENERS
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'GET_VIDEO_STATE') {
    const state = getActivePlaybackState();
    sendResponse(state);
    return false;
  }

  if (request.action === 'SEEK_VIDEO') {
    const targetSeconds = Number(request.timestampSeconds);
    if (isNaN(targetSeconds)) {
      sendResponse({ success: false, error: 'Invalid timestamp' });
      return true;
    }

    const moviePlayer = document.getElementById('movie_player') as any;
    if (moviePlayer && typeof moviePlayer.seekTo === 'function') {
      try {
        moviePlayer.seekTo(Math.max(0, targetSeconds), true);
        if (request.autoPlay !== false && typeof moviePlayer.playVideo === 'function') {
          moviePlayer.playVideo();
        }
        sendResponse({ success: true, currentTime: targetSeconds });
        return true;
      } catch {
        // Fall back to html5 video element below
      }
    }

    const video = findPrimaryVideoElement();
    if (!video) {
      sendResponse({ success: false, error: 'No video element found on this page' });
      return true;
    }

    video.currentTime = Math.max(0, targetSeconds);
    if (video.paused && request.autoPlay !== false) {
      video.play().catch(() => {});
    }
    try {
      video.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      // ignore scroll error
    }
    sendResponse({ success: true, currentTime: video.currentTime });
    return true;
  }

  if (request.action === 'PLAY_PAUSE_VIDEO') {
    const video = findPrimaryVideoElement();
    if (video) {
      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
      sendResponse({ success: true, paused: video.paused });
    } else {
      sendResponse({ success: false, error: 'No video element' });
    }
    return true;
  }

  return false;
});
