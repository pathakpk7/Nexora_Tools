import { describe, it, expect, beforeEach } from 'vitest';
import { OverlayBusterService, KNOWN_OVERLAY_SELECTORS, CAPTCHA_SELECTORS } from './overlaybuster';

describe('OverlayBusterService Unit Tests', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem(k: string) {
        return store[k] || null;
      },
      setItem(k: string, v: string) {
        store[k] = v;
      },
      clear() {
        for (const k in store) delete store[k];
      },
    };
    (globalThis as any).localStorage.clear();
  });

  it('contains comprehensive overlay and captcha selectors', () => {
    expect(KNOWN_OVERLAY_SELECTORS.length).toBeGreaterThan(10);
    expect(CAPTCHA_SELECTORS.length).toBeGreaterThan(3);

    // Verify presence of crucial paywall & overlay signatures
    const joinedOverlays = KNOWN_OVERLAY_SELECTORS.join(' ');
    expect(joinedOverlays).toContain('paywall');
    expect(joinedOverlays).toContain('newsletter');
    expect(joinedOverlays).toContain('adblock');
    expect(joinedOverlays).toContain('subscribe');
  });

  it('breaks scroll lock on mock document elements', () => {
    const mockHtml = {
      style: {
        css: {} as Record<string, string>,
        setProperty(k: string, v: string) {
          this.css[k] = v;
        },
      },
      classList: {
        classes: ['no-scroll'],
        contains(c: string) {
          return this.classes.includes(c);
        },
        remove(c: string) {
          this.classes = this.classes.filter((x) => x !== c);
        },
      },
      getAttribute(attr: string) {
        if (attr === 'style') return 'overflow: hidden;';
        return null;
      },
    };

    const mockBody = {
      style: {
        css: {} as Record<string, string>,
        setProperty(k: string, v: string) {
          this.css[k] = v;
        },
      },
      classList: {
        classes: ['modal-open'],
        contains(c: string) {
          return this.classes.includes(c);
        },
        remove(c: string) {
          this.classes = this.classes.filter((x) => x !== c);
        },
      },
      getAttribute(attr: string) {
        if (attr === 'style') return 'position: fixed;';
        return null;
      },
    };

    const mockDoc = {
      documentElement: mockHtml,
      body: mockBody,
      head: {
        appendChild() {},
      },
      getElementById() {
        return null;
      },
      createElement() {
        return { id: '', textContent: '' };
      },
    } as unknown as Document;

    const modified = OverlayBusterService.unlockScroll(mockDoc);
    expect(modified).toBe(true);
    expect(mockHtml.style.css['overflow']).toBe('auto');
    expect(mockHtml.classList.classes.includes('no-scroll')).toBe(false);
    expect(mockBody.classList.classes.includes('modal-open')).toBe(false);
  });

  it('detects captcha challenge elements via selectors', () => {
    const mockDoc = {
      querySelector(selector: string) {
        if (selector.includes('turnstile')) {
          return { id: 'cf-turnstile' };
        }
        return null;
      },
    } as unknown as Document;

    const detected = OverlayBusterService.checkCaptcha(mockDoc);
    expect(detected).toBe(true);
  });

  it('returns false when no captcha is present', () => {
    const mockDoc = {
      querySelector() {
        return null;
      },
    } as unknown as Document;

    const detected = OverlayBusterService.checkCaptcha(mockDoc);
    expect(detected).toBe(false);
  });

  it('tracks lifetime statistics accurately', async () => {
    const initialStats = await OverlayBusterService.getStats();
    expect(initialStats.totalOverlaysBusted).toBe(0);

    const report = {
      scrollUnlocked: true,
      overlaysRemoved: 3,
      blursRemoved: 2,
      elementsZapped: 1,
      captchaDetected: false,
      actions: ['Removed 3 overlays', 'Restored scroll'],
    };

    const updated = await OverlayBusterService.recordBust(report, 'news.example.com');
    expect(updated.totalOverlaysBusted).toBe(3);
    expect(updated.totalScrollsUnlocked).toBe(1);
    expect(updated.totalBlursRemoved).toBe(2);
    expect(updated.totalSitesCleaned).toBe(1);
  });
});
