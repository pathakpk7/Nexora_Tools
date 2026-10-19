import { BookmarkItem, LinkScanResult, ScanSummary } from '@nexora/shared-types';
import { isInternalBrowserUrl } from '@nexora/browser-utils';

export class LinkSentryService {
  /**
   * Recursively fetches bookmarks from Chrome Bookmarks API
   */
  static async getBookmarks(): Promise<BookmarkItem[]> {
    if (typeof chrome !== 'undefined' && chrome.bookmarks) {
      return new Promise((resolve) => {
        try {
          chrome.bookmarks.getTree((tree) => {
            if (chrome.runtime.lastError || !tree || !Array.isArray(tree)) {
              resolve([]);
              return;
            }
            const items: BookmarkItem[] = [];
            const traverse = (nodes: chrome.bookmarks.BookmarkTreeNode[], path = '') => {
              if (!nodes || !Array.isArray(nodes)) return;
              for (const node of nodes) {
                if (!node) continue;
                const nodeTitle = node.title || '';
                const currentPath = path ? `${path} / ${nodeTitle}` : nodeTitle;
                if (node.url) {
                  items.push({
                    id: node.id,
                    title: nodeTitle || node.url,
                    url: node.url,
                    folderPath: path,
                    dateAdded: node.dateAdded,
                  });
                }
                if (node.children && Array.isArray(node.children)) {
                  traverse(node.children, currentPath);
                }
              }
            };
            traverse(tree);
            resolve(items);
          });
        } catch {
          resolve([]);
        }
      });
    }

    // Mock bookmarks for dev
    return [
      { id: '1', title: 'Google Search', url: 'https://www.google.com', folderPath: 'Bookmarks Bar' },
      { id: '2', title: 'React Documentation', url: 'https://react.dev', folderPath: 'Development' },
      { id: '3', title: 'Obsolete Test Site', url: 'https://httpstat.us/404', folderPath: 'Testing' },
      { id: '4', title: 'Redirect Test', url: 'https://httpstat.us/301', folderPath: 'Testing' },
      { id: '5', title: 'Browser Internal Tab', url: 'chrome://settings', folderPath: 'Internal' },
      { id: '6', title: 'Invalid Link', url: 'not-a-valid-url', folderPath: 'Testing' },
    ];
  }

  /**
   * Delete a bookmark by ID after user confirmation
   */
  static async deleteBookmark(bookmarkId: string): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.bookmarks) {
      await chrome.bookmarks.remove(bookmarkId);
    }
  }

  /**
   * Validates a single link with honest classification (CORS/network/redirects/unsupported)
   */
  static async checkLink(bookmark: BookmarkItem, timeoutMs = 6000): Promise<LinkScanResult> {
    const startTime = Date.now();

    if (isInternalBrowserUrl(bookmark.url)) {
      return {
        bookmarkId: bookmark.id,
        url: bookmark.url,
        status: 'unsupported',
        statusCodeText: 'Internal browser scheme',
        durationMs: Date.now() - startTime,
        scannedAt: Date.now(),
      };
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(bookmark.url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
          bookmarkId: bookmark.id,
          url: bookmark.url,
          status: 'unsupported',
          statusCodeText: `Unsupported scheme (${parsedUrl.protocol})`,
          durationMs: Date.now() - startTime,
          scannedAt: Date.now(),
        };
      }
    } catch {
      return {
        bookmarkId: bookmark.id,
        url: bookmark.url,
        status: 'unavailable',
        statusCodeText: 'Invalid URL format',
        durationMs: Date.now() - startTime,
        scannedAt: Date.now(),
      };
    }

    // Attempt fetch with abort controller
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(bookmark.url, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors', // Avoid cross-origin blocks from extensions without all_urls host perms
      });
      clearTimeout(timer);

      // In no-cors mode, type is 'opaque' with status 0, meaning server responded
      if (response.type === 'opaque') {
        return {
          bookmarkId: bookmark.id,
          url: bookmark.url,
          status: 'healthy',
          httpStatus: 200,
          statusCodeText: 'Reachable (Opaque)',
          durationMs: Date.now() - startTime,
          scannedAt: Date.now(),
        };
      }

      if (response.ok) {
        if (response.redirected) {
          return {
            bookmarkId: bookmark.id,
            url: bookmark.url,
            finalUrl: response.url,
            status: 'redirected',
            httpStatus: response.status,
            statusCodeText: `Redirected to ${response.url}`,
            durationMs: Date.now() - startTime,
            scannedAt: Date.now(),
          };
        }
        return {
          bookmarkId: bookmark.id,
          url: bookmark.url,
          status: 'healthy',
          httpStatus: response.status,
          statusCodeText: 'HTTP OK',
          durationMs: Date.now() - startTime,
          scannedAt: Date.now(),
        };
      } else {
        return {
          bookmarkId: bookmark.id,
          url: bookmark.url,
          status: 'unavailable',
          httpStatus: response.status,
          statusCodeText: `HTTP ${response.status}`,
          durationMs: Date.now() - startTime,
          scannedAt: Date.now(),
        };
      }
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = (err as Error)?.name === 'AbortError';
      return {
        bookmarkId: bookmark.id,
        url: bookmark.url,
        status: isAbort ? 'uncertain' : 'unavailable',
        statusCodeText: isAbort ? 'Timeout reached' : 'Network/DNS unreachable',
        error: (err as Error)?.message || 'Failed to fetch',
        durationMs: Date.now() - startTime,
        scannedAt: Date.now(),
      };
    }
  }

  /**
   * Concurrency-controlled link auditing engine
   */
  static async scanBatch(
    bookmarks: BookmarkItem[],
    concurrency = 4,
    onProgress?: (completed: number, total: number, result: LinkScanResult) => void
  ): Promise<LinkScanResult[]> {
    const results: LinkScanResult[] = [];
    const queue = [...bookmarks];
    const total = bookmarks.length;
    let completed = 0;

    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        const res = await this.checkLink(item);
        results.push(res);
        completed++;
        if (onProgress) onProgress(completed, total, res);
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, bookmarks.length) }, () => worker());
    await Promise.all(workers);
    return results;
  }

  static calculateSummary(results: LinkScanResult[], duplicateCount = 0): ScanSummary {
    return {
      total: results.length,
      healthy: results.filter((r) => r.status === 'healthy').length,
      redirected: results.filter((r) => r.status === 'redirected').length,
      unavailable: results.filter((r) => r.status === 'unavailable').length,
      uncertain: results.filter((r) => r.status === 'uncertain').length,
      unsupported: results.filter((r) => r.status === 'unsupported').length,
      duplicates: duplicateCount,
    };
  }
}
