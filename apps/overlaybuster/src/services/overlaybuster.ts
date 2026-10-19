/**
 * OverlayBuster Core Service
 * Handles overlay detection, paywall backdrop removal, scroll lock breaking,
 * blur removal, and interactive element zapping.
 */

export interface BustReport {
  scrollUnlocked: boolean;
  overlaysRemoved: number;
  blursRemoved: number;
  elementsZapped: number;
  captchaDetected: boolean;
  actions: string[];
}

export interface SiteConfig {
  domain: string;
  enabled: boolean;
  autoBust: boolean;
  customSelectors: string[];
  lastBustedAt?: number;
}

export interface BusterStats {
  totalOverlaysBusted: number;
  totalScrollsUnlocked: number;
  totalBlursRemoved: number;
  totalSitesCleaned: number;
}

export const KNOWN_OVERLAY_SELECTORS = [
  // Paywall & Subscription modals
  '[class*="paywall" i]',
  '[id*="paywall" i]',
  '[class*="subscribe-modal" i]',
  '[class*="subscription-prompt" i]',
  '[class*="subscription-modal" i]',
  '[class*="regwall" i]',
  '[id*="regwall" i]',
  '[class*="meteredContent" i] ~ [class*="overlay" i]',
  'amp-user-notification',
  'amp-consent',
  // Newsletter & Interstitial dialogs
  '[class*="newsletter-popup" i]',
  '[class*="newsletter-modal" i]',
  '[class*="email-signup-modal" i]',
  '[class*="email-modal" i]',
  '[class*="interstitial" i]',
  '[id*="interstitial" i]',
  // Anti-adblock banners & overlays
  '[class*="adblock-overlay" i]',
  '[class*="adblock-modal" i]',
  '[class*="fc-ab-root" i]',
  '[class*="adblock-blocker" i]',
  'div[id*="sp_message_container" i]',
  'div[class*="sp_message" i]',
  // Generic blocking modal backdrops
  '[class*="modal-backdrop" i]',
  '[class*="overlay-backdrop" i]',
  '[class*="popup-backdrop" i]',
  '[class*="fade-backdrop" i]',
  '[class*="gatekeeper" i]',
  '[id*="gatekeeper" i]',
  'div[class*="tp-backdrop" i]',
  'div[class*="tp-modal" i]',
  'div[class*="article-gate" i]',
  'div[id*="article-gate" i]',
  'dialog[open]',
  '[role="dialog"][aria-modal="true"]',
  '[role="dialog"]',
  '.modal-open-overlay',
  '.sweet-alert',
  '.swal2-container',
  // Cookie / consent blocking banners
  '[id*="onetrust-consent-sdk" i]',
  '[id*="cmp-modal" i]',
];

export const CAPTCHA_SELECTORS = [
  'iframe[src*="recaptcha" i]',
  'iframe[src*="turnstile" i]',
  'iframe[src*="hcaptcha" i]',
  'div[id*="cf-turnstile" i]',
  '[class*="captcha-container" i]',
  '[id*="captcha-box" i]',
];

export class OverlayBusterService {
  private static readonly STATS_KEY = 'overlaybuster_stats';
  private static readonly SITES_KEY = 'overlaybuster_sites';

  /**
   * Scans a target document and busts overlays, unlocks scroll, and removes blurs.
   */
  static scanAndBust(doc: Document = document): BustReport {
    const report: BustReport = {
      scrollUnlocked: false,
      overlaysRemoved: 0,
      blursRemoved: 0,
      elementsZapped: 0,
      captchaDetected: false,
      actions: [],
    };

    if (!doc || !doc.body || !doc.documentElement) {
      return report;
    }

    // 1. Break Scroll Locks
    const scrollBusted = this.unlockScroll(doc);
    if (scrollBusted) {
      report.scrollUnlocked = true;
      report.actions.push('Restored page scroll & unlocked body/html overflow');
    }

    // 2. Remove Known and Generic Modal Overlays
    const removedCount = this.removeOverlays(doc);
    report.overlaysRemoved = removedCount;
    if (removedCount > 0) {
      report.actions.push(`Removed ${removedCount} intrusive overlay(s) / modal dialog(s)`);
    }

    // 3. Remove CSS Text Blur Filters
    const blursCount = this.removeBlurs(doc);
    report.blursRemoved = blursCount;
    if (blursCount > 0) {
      report.actions.push(`Unblurred ${blursCount} obscured article section(s)`);
    }

    // 4. Check for Captcha / Verification gates
    const captchaFound = this.checkCaptcha(doc);
    report.captchaDetected = captchaFound;
    if (captchaFound) {
      report.actions.push('Detected interactive verification / captcha barrier');
    }

    return report;
  }

  /**
   * Forces html and body elements to allow scrolling
   */
  static unlockScroll(doc: Document = document): boolean {
    let modified = false;

    const elementsToFix: (HTMLElement | null)[] = [doc.documentElement, doc.body];
    try {
      const wrappers = doc.querySelectorAll('#app, #__next, #root, [class*="site-wrapper" i], [class*="main-wrapper" i]');
      wrappers.forEach((w) => elementsToFix.push(w as HTMLElement));
    } catch {}

    elementsToFix.forEach((el) => {
      if (!el) return;

      const style = typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(el) : null;
      const overflowY = style?.overflowY;
      const overflow = style?.overflow;
      const position = style?.position;

      if (
        overflowY === 'hidden' ||
        overflow === 'hidden' ||
        position === 'fixed' ||
        el.getAttribute('style')?.includes('overflow: hidden')
      ) {
        el.style.setProperty('overflow', 'auto', 'important');
        el.style.setProperty('overflow-y', 'auto', 'important');
        el.style.setProperty('position', 'static', 'important');
        el.style.setProperty('height', 'auto', 'important');
        el.style.setProperty('max-height', 'none', 'important');
        el.style.setProperty('pointer-events', 'auto', 'important');
        modified = true;
      }

      // Remove class names commonly used to lock scrolling
      const classesToRemove = ['no-scroll', 'modal-open', 'overflow-hidden', 'lock-scroll', 'stop-scrolling'];
      classesToRemove.forEach((cls) => {
        if (el.classList.contains(cls)) {
          el.classList.remove(cls);
          modified = true;
        }
      });
    });

    // Also remove global inline style overrides if needed
    const styleTagId = 'overlaybuster-force-scroll-style';
    if (!doc.getElementById(styleTagId) && doc.head) {
      const styleEl = doc.createElement('style');
      styleEl.id = styleTagId;
      styleEl.textContent = `
        html, body {
          overflow: auto !important;
          overflow-y: auto !important;
          position: static !important;
          max-height: none !important;
          pointer-events: auto !important;
        }
      `;
      doc.head.appendChild(styleEl);
      modified = true;
    }

    return modified;
  }

  /**
   * Removes modal backdrops, newsletter popups, paywall dialogs, and intrusive overlays
   */
  static removeOverlays(doc: Document = document): number {
    let count = 0;

    // A. Query known overlay selector list
    KNOWN_OVERLAY_SELECTORS.forEach((selector) => {
      try {
        const matches = doc.querySelectorAll(selector);
        matches.forEach((node) => {
          if (this.isSafelyRemovable(node as HTMLElement)) {
            (node as HTMLElement).remove();
            count++;
          }
        });
      } catch {}
    });

    // B. Heuristic scan: find full-page fixed elements with high z-index
    try {
      const allDivs = doc.querySelectorAll('div, section, aside, dialog');
      allDivs.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (!htmlEl || typeof window === 'undefined' || !window.getComputedStyle) return;

        // Skip our own UI containers or scripts
        if (htmlEl.id?.startsWith('overlaybuster-')) return;
        if (['HEADER', 'NAV', 'FOOTER', 'MAIN', 'ARTICLE'].includes(htmlEl.tagName)) return;

        const style = window.getComputedStyle(htmlEl);
        const position = style.position;
        const zIndex = parseInt(style.zIndex, 10);

        if ((position === 'fixed' || position === 'absolute') && (isNaN(zIndex) || zIndex >= 50)) {
          const rect = htmlEl.getBoundingClientRect();
          const winWidth = window.innerWidth || 1024;
          const winHeight = window.innerHeight || 768;

          // Covers substantial viewport portion (modal backdrop or popup)
          const isLargeOverlay =
            (rect.width >= winWidth * 0.4 && rect.height >= winHeight * 0.3) ||
            (rect.width >= winWidth * 0.8 && rect.height >= winHeight * 0.8);

          const textContent = (htmlEl.textContent || '').toLowerCase();
          const hasGatekeeperSignals =
            textContent.includes('subscribe') ||
            textContent.includes('adblock') ||
            textContent.includes('disable your ad blocker') ||
            textContent.includes('turn off your adblocker') ||
            textContent.includes('turn off your ad blocker') ||
            textContent.includes('create an account to continue') ||
            textContent.includes('remaining articles') ||
            textContent.includes('free articles') ||
            textContent.includes('newsletter') ||
            textContent.includes('accept cookies') ||
            textContent.includes('agree & close') ||
            textContent.includes('continue reading') ||
            textContent.includes('sign in to read') ||
            textContent.includes('paywall');

          if ((isLargeOverlay && hasGatekeeperSignals) || (isLargeOverlay && zIndex >= 500)) {
            if (this.isSafelyRemovable(htmlEl)) {
              htmlEl.remove();
              count++;
            }
          }
        }
      });
    } catch {}

    return count;
  }

  /**
   * Removes CSS blur and text masking filters on paragraphs and articles
   */
  static removeBlurs(doc: Document = document): number {
    let count = 0;
    try {
      const candidates = doc.querySelectorAll('p, div, article, section, [class*="content" i], [class*="article" i]');
      candidates.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (!htmlEl || typeof window === 'undefined' || !window.getComputedStyle) return;

        const style = window.getComputedStyle(htmlEl);
        const filter = style.filter || (style as any).webkitFilter || '';

        if (filter.includes('blur')) {
          htmlEl.style.setProperty('filter', 'none', 'important');
          htmlEl.style.setProperty('-webkit-filter', 'none', 'important');
          htmlEl.style.setProperty('opacity', '1', 'important');
          htmlEl.style.setProperty('user-select', 'auto', 'important');
          htmlEl.style.setProperty('-webkit-user-select', 'auto', 'important');
          count++;
        }

        // Also check inline style
        const inlineStyle = htmlEl.getAttribute('style') || '';
        if (inlineStyle.includes('blur(')) {
          htmlEl.style.filter = 'none';
          htmlEl.style.opacity = '1';
          count++;
        }
      });
    } catch {}
    return count;
  }

  /**
   * Detects presence of active captcha or verification challenges
   */
  static checkCaptcha(doc: Document = document): boolean {
    for (const selector of CAPTCHA_SELECTORS) {
      try {
        if (doc.querySelector(selector)) return true;
      } catch {}
    }
    return false;
  }

  /**
   * Ensures essential layout elements (main article, body, root) are never accidentally removed
   */
  private static isSafelyRemovable(el: HTMLElement): boolean {
    if (!el || !el.tagName) return false;
    const tag = el.tagName.toUpperCase();
    if (tag === 'BODY' || tag === 'HTML' || tag === 'MAIN' || tag === 'HEAD') return false;
    if (el.getAttribute('role') === 'main') return false;
    if (el.id?.startsWith('overlaybuster-')) return false;
    return true;
  }

  /**
   * Storage helpers: Get or update lifetime stats
   */
  static async getStats(): Promise<BusterStats> {
    const defaultStats: BusterStats = {
      totalOverlaysBusted: 0,
      totalScrollsUnlocked: 0,
      totalBlursRemoved: 0,
      totalSitesCleaned: 0,
    };

    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const data = await chrome.storage.local.get(this.STATS_KEY);
        return data[this.STATS_KEY] || defaultStats;
      }
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(this.STATS_KEY);
        return raw ? JSON.parse(raw) : defaultStats;
      }
      return defaultStats;
    } catch {
      return defaultStats;
    }
  }

  static async recordBust(report: BustReport, domain?: string): Promise<BusterStats> {
    const stats = await this.getStats();
    stats.totalOverlaysBusted += report.overlaysRemoved;
    if (report.scrollUnlocked) stats.totalScrollsUnlocked += 1;
    stats.totalBlursRemoved += report.blursRemoved;
    if (report.overlaysRemoved > 0 || report.scrollUnlocked || report.blursRemoved > 0) {
      stats.totalSitesCleaned += 1;
    }

    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        await chrome.storage.local.set({ [this.STATS_KEY]: stats });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
      }
    } catch {}

    return stats;
  }

  /**
   * Site Config Management
   */
  static async getSiteConfig(domain: string): Promise<SiteConfig> {
    const defaultSite: SiteConfig = {
      domain,
      enabled: true,
      autoBust: true,
      customSelectors: [],
    };

    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const data = await chrome.storage.local.get(this.SITES_KEY);
        const sites: Record<string, SiteConfig> = data[this.SITES_KEY] || {};
        return sites[domain] || defaultSite;
      }
      return defaultSite;
    } catch {
      return defaultSite;
    }
  }

  static async saveSiteConfig(config: SiteConfig): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const data = await chrome.storage.local.get(this.SITES_KEY);
        const sites: Record<string, SiteConfig> = data[this.SITES_KEY] || {};
        sites[config.domain] = config;
        await chrome.storage.local.set({ [this.SITES_KEY]: sites });
      }
    } catch {}
  }
}
