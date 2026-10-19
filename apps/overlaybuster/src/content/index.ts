import { OverlayBusterService, BustReport } from '../services/overlaybuster';

// In-page state
let isZapActive = false;
let hoveredElement: HTMLElement | null = null;
let lastReport: BustReport = {
  scrollUnlocked: false,
  overlaysRemoved: 0,
  blursRemoved: 0,
  elementsZapped: 0,
  captchaDetected: false,
  actions: [],
};

// Domain helper
function getCurrentDomain(): string {
  try {
    return window.location.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

// Auto-run on page load
async function initialize() {
  const domain = getCurrentDomain();
  const config = await OverlayBusterService.getSiteConfig(domain);

  if (!config.enabled) {
    return;
  }

  // 1. Initial Bust Pass
  runBustPass();

  // 2. Delayed pass after 1.5s & 3s (to catch timed newsletter/paywall injections)
  setTimeout(runBustPass, 1500);
  setTimeout(runBustPass, 3500);

  // 3. MutationObserver for dynamically injected popups
  let timeoutId: any = null;
  const observer = new MutationObserver(() => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      runBustPass(false);
    }, 600);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

function runBustPass(notifyBackground = true) {
  const report = OverlayBusterService.scanAndBust(document);
  if (report.overlaysRemoved > 0 || report.scrollUnlocked || report.blursRemoved > 0) {
    lastReport.overlaysRemoved += report.overlaysRemoved;
    lastReport.blursRemoved += report.blursRemoved;
    if (report.scrollUnlocked) lastReport.scrollUnlocked = true;
    lastReport.actions.push(...report.actions);

    if (notifyBackground) {
      try {
        chrome.runtime.sendMessage({
          type: 'RECORD_BUST_STATS',
          domain: getCurrentDomain(),
          report,
        });
      } catch {}
    }
  }
}

// -------------------------------------------------------------
// Interactive Element Zapper
// -------------------------------------------------------------
function startZapMode() {
  if (isZapActive) return;
  isZapActive = true;

  // Banner
  const banner = document.createElement('div');
  banner.id = 'overlaybuster-zap-banner';
  banner.innerHTML = `
    <div style="position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 2147483647; background: #0f172a; color: #f8fafc; padding: 10px 20px; border-radius: 9999px; font-family: sans-serif; font-size: 13px; font-weight: 600; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 10px; border: 1px solid #334155;">
      <span>🎯 <strong>Overlay Zapper Active</strong>: Click any popup or backdrop to destroy | Press <strong>ESC</strong> to cancel</span>
      <button id="overlaybuster-zap-close-btn" style="background: #ef4444; color: white; border: none; padding: 4px 10px; border-radius: 9999px; cursor: pointer; font-size: 11px;">Cancel</button>
    </div>
  `;
  document.body.appendChild(banner);

  document.getElementById('overlaybuster-zap-close-btn')?.addEventListener('click', stopZapMode);

  window.addEventListener('mousemove', onZapMouseMove, true);
  window.addEventListener('click', onZapClick, true);
  window.addEventListener('keydown', onZapKeyDown, true);
}

function stopZapMode() {
  isZapActive = false;
  if (hoveredElement) {
    hoveredElement.style.outline = '';
    hoveredElement.style.outlineOffset = '';
    hoveredElement = null;
  }
  document.getElementById('overlaybuster-zap-banner')?.remove();
  window.removeEventListener('mousemove', onZapMouseMove, true);
  window.removeEventListener('click', onZapClick, true);
  window.removeEventListener('keydown', onZapKeyDown, true);
}

function onZapMouseMove(e: MouseEvent) {
  if (!isZapActive) return;
  const target = e.target as HTMLElement;
  if (!target || target.id?.startsWith('overlaybuster-')) return;

  if (hoveredElement && hoveredElement !== target) {
    hoveredElement.style.outline = '';
    hoveredElement.style.outlineOffset = '';
  }

  hoveredElement = target;
  hoveredElement.style.outline = '3px solid #ef4444';
  hoveredElement.style.outlineOffset = '-2px';
}

function onZapClick(e: MouseEvent) {
  if (!isZapActive) return;
  e.preventDefault();
  e.stopPropagation();

  const target = e.target as HTMLElement;
  if (target && !target.id?.startsWith('overlaybuster-')) {
    target.remove();
    lastReport.elementsZapped += 1;
    lastReport.actions.push('Manually zapped selected overlay element');
    OverlayBusterService.unlockScroll(document);

    try {
      chrome.runtime.sendMessage({
        type: 'RECORD_BUST_STATS',
        domain: getCurrentDomain(),
        report: {
          scrollUnlocked: true,
          overlaysRemoved: 1,
          blursRemoved: 0,
          elementsZapped: 1,
          captchaDetected: false,
          actions: ['Zapped selected overlay'],
        },
      });
    } catch {}
  }

  stopZapMode();
}

function onZapKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    stopZapMode();
  }
}

// -------------------------------------------------------------
// Distraction-Free Reader View
// -------------------------------------------------------------
function triggerReaderMode() {
  const existing = document.getElementById('overlaybuster-reader-modal');
  if (existing) {
    existing.remove();
    return;
  }

  // Find headline & article content
  const title = document.querySelector('h1')?.innerText || document.title;
  let articleEl = document.querySelector('article') || document.querySelector('main');

  if (!articleEl) {
    const paragraphs = Array.from(document.querySelectorAll('p'));
    const container = document.createElement('div');
    paragraphs.forEach((p) => {
      if (p.innerText.length > 40) {
        const cloned = p.cloneNode(true);
        container.appendChild(cloned);
      }
    });
    articleEl = container;
  }

  const readerModal = document.createElement('div');
  readerModal.id = 'overlaybuster-reader-modal';
  readerModal.innerHTML = `
    <div style="position: fixed; inset: 0; z-index: 2147483646; background: #0f172a; color: #e2e8f0; overflow-y: auto; padding: 40px 20px; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
      <div style="max-width: 720px; margin: 0 auto; background: #1e293b; padding: 36px; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); border: 1px solid #334155;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 1px solid #334155; padding-bottom: 16px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #f8fafc; line-height: 1.3; margin: 0;">${title}</h1>
          <button id="overlaybuster-reader-close-btn" style="background: #334155; hover:background: #475569; color: #f8fafc; border: none; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600;">Close ✕</button>
        </div>
        <div id="overlaybuster-reader-content" style="font-size: 17px; line-height: 1.75; color: #cbd5e1;">
          ${articleEl.innerHTML}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(readerModal);
  document.getElementById('overlaybuster-reader-close-btn')?.addEventListener('click', () => {
    readerModal.remove();
  });
}

// -------------------------------------------------------------
// Message Listener
// -------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TRIGGER_AUTO_BUST') {
    runBustPass(true);
    sendResponse({ success: true, report: lastReport });
    return;
  }

  if (message.type === 'START_ZAP_MODE') {
    startZapMode();
    sendResponse({ success: true });
    return;
  }

  if (message.type === 'TRIGGER_READER_MODE') {
    triggerReaderMode();
    sendResponse({ success: true });
    return;
  }

  if (message.type === 'GET_PAGE_STATUS') {
    const isCaptcha = OverlayBusterService.checkCaptcha(document);
    lastReport.captchaDetected = isCaptcha;
    sendResponse({
      domain: getCurrentDomain(),
      report: lastReport,
    });
    return;
  }
});

// Run
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
