import { PagePocketItem } from '@nexora/shared-types';
import { LocalIndexedDB, ChromeStorageAdapter } from '@nexora/storage';
import { generateAPACitation, generateMLACitation, generateIEEECitation, BibliographicMetadata } from '@nexora/browser-utils';

const db = new LocalIndexedDB<PagePocketItem>('PagePocketDB', 'items', 1);
const projectStorage = new ChromeStorageAdapter<string[]>('pagepocket');
const PROJECTS_KEY = 'contextclip_projects';

export const DEFAULT_PROJECTS = [
  'GATE Preparation',
  'Final Year Project',
  'Research Paper',
  'General Research',
];

export class PagePocketService {
  static async getAllItems(): Promise<PagePocketItem[]> {
    const items = await db.getAll();
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }

  static async saveItem(item: PagePocketItem): Promise<void> {
    await db.put(item);
  }

  static async deleteItem(id: string): Promise<void> {
    await db.delete(id);
  }

  static async toggleFavorite(id: string): Promise<void> {
    const item = await db.get(id);
    if (item) {
      item.isFavorite = !item.isFavorite;
      item.updatedAt = Date.now();
      await db.put(item);
    }
  }

  static async updateStatus(id: string, status: PagePocketItem['readingStatus']): Promise<void> {
    const item = await db.get(id);
    if (item) {
      item.readingStatus = status;
      item.updatedAt = Date.now();
      await db.put(item);
    }
  }

  static async updateItem(item: PagePocketItem): Promise<void> {
    item.updatedAt = Date.now();
    await db.put(item);
  }

  // -------------------------
  // ContextClip Project Management
  // -------------------------
  static async getProjects(): Promise<string[]> {
    const stored = await projectStorage.get(PROJECTS_KEY);
    if (!stored || stored.length === 0) {
      await projectStorage.set(PROJECTS_KEY, DEFAULT_PROJECTS);
      return DEFAULT_PROJECTS;
    }
    return stored;
  }

  static async addProject(projectName: string): Promise<string[]> {
    const trimmed = projectName.trim();
    if (!trimmed) return await this.getProjects();
    const list = await this.getProjects();
    if (!list.includes(trimmed)) {
      list.push(trimmed);
      await projectStorage.set(PROJECTS_KEY, list);
    }
    return list;
  }

  static async deleteProject(projectName: string): Promise<string[]> {
    let list = await this.getProjects();
    list = list.filter((p) => p !== projectName);
    await projectStorage.set(PROJECTS_KEY, list);
    return list;
  }

  // -------------------------
  // Duplicate Note Detection
  // -------------------------
  static async checkForDuplicate(
    url: string,
    selectedText?: string
  ): Promise<{ isDuplicate: boolean; existingItem?: PagePocketItem }> {
    if (!url || !selectedText) return { isDuplicate: false };
    const all = await this.getAllItems();
    const cleanSnippet = selectedText.trim().toLowerCase();

    for (const item of all) {
      if (item.url === url && item.selectedText) {
        const existingText = item.selectedText.trim().toLowerCase();
        // Exact match or significant overlap
        if (
          existingText === cleanSnippet ||
          existingText.includes(cleanSnippet) ||
          cleanSnippet.includes(existingText)
        ) {
          return { isDuplicate: true, existingItem: item };
        }
      }
    }

    return { isDuplicate: false };
  }

  // -------------------------
  // Smart Summary Generator
  // -------------------------
  static generateSmartSummary(text: string): string {
    if (!text || text.trim().length === 0) return '';
    const clean = text.trim();
    if (clean.length < 120) return clean;

    const sentences = clean
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);

    if (sentences.length <= 2) return sentences.join(' ');

    // Extract lead thesis and concluding takeaway
    const first = sentences[0];
    const middle = sentences.find(
      (s, i) => i > 0 && i < sentences.length - 1 && (s.includes('because') || s.includes('result') || s.includes('shows') || s.includes('important'))
    ) || sentences[1];
    const last = sentences[sentences.length - 1];

    const bullets = Array.from(new Set([first, middle, last])).filter(Boolean);
    return bullets.map((b) => `• ${b}`).join('\n');
  }

  // -------------------------
  // Tab & Metadata Extraction
  // -------------------------
  static async getCurrentTabInfo(): Promise<{
    url: string;
    title: string;
    favIconUrl?: string;
    domain: string;
    selectedText?: string;
    metadata?: BibliographicMetadata;
  }> {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      let domain = '';
      if (tab?.url) {
        try {
          domain = new URL(tab.url).hostname.replace(/^www\./, '');
        } catch {}
      }

      let selectedText = '';
      let metadata: BibliographicMetadata | undefined = undefined;

      if (tab?.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://') && !tab.url.startsWith('about:')) {
        // Attempt 1: sendMessage
        try {
          const res = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' });
          if (res?.selectedText) selectedText = res.selectedText;
          if (res?.metadata) metadata = res.metadata;
        } catch {}

        // Attempt 2: fallback to executeScript
        try {
          if (!selectedText && chrome.scripting) {
            const results = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                const text = window.getSelection()?.toString()?.trim() || '';

                // Extract metadata tags
                const getMeta = (names: string[]): string => {
                  for (const n of names) {
                    const el =
                      document.querySelector(`meta[name="${n}"]`) ||
                      document.querySelector(`meta[property="${n}"]`);
                    const c = el?.getAttribute('content')?.trim();
                    if (c) return c;
                  }
                  return '';
                };

                const title =
                  getMeta(['citation_title', 'dc.title', 'og:title', 'twitter:title']) ||
                  document.title;
                const authorStr = getMeta([
                  'citation_author',
                  'dc.creator',
                  'author',
                  'article:author',
                ]);
                const journal = getMeta([
                  'citation_journal_title',
                  'citation_publisher',
                  'og:site_name',
                ]);
                const date = getMeta([
                  'citation_publication_date',
                  'citation_date',
                  'dc.date',
                  'article:published_time',
                ]);
                const doi = getMeta(['citation_doi', 'dc.identifier']);

                let year = '';
                if (date) {
                  const m = date.match(/\b(19\d\d|20\d\d)\b/);
                  if (m) year = m[1];
                }

                const authors = authorStr ? authorStr.split(/[,;]/).map((a) => a.trim()).filter(Boolean) : [];

                return {
                  selectedText: text,
                  meta: {
                    title,
                    authors,
                    publicationDate: date || undefined,
                    year: year || undefined,
                    journalOrPublisher: journal || window.location.hostname.replace(/^www\./, ''),
                    doi: doi || undefined,
                    url: window.location.href,
                    accessDate: new Date().toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }),
                    sourceType: (doi ? 'journal' : 'website') as 'journal' | 'website',
                    verifiedFields: {
                      title: Boolean(title),
                      authors: authors.length > 0,
                      publicationDate: Boolean(date),
                      journalOrPublisher: Boolean(journal),
                      doi: Boolean(doi),
                    },
                    inferredFields: {
                      year: Boolean(year && !date),
                      sourceType: !doi,
                    },
                  },
                };
              },
            });

            if (results && results[0] && results[0].result) {
              if (results[0].result.selectedText) selectedText = results[0].result.selectedText;
              if (results[0].result.meta) metadata = results[0].result.meta;
            }
          }
        } catch (scriptErr) {
          console.warn('Selection script error:', scriptErr);
        }
      }

      return {
        url: tab?.url || '',
        title: tab?.title || '',
        favIconUrl: tab?.favIconUrl,
        domain,
        selectedText,
        metadata,
      };
    }

    return {
      url: 'https://arxiv.org/abs/1706.03762',
      title: 'Attention Is All You Need',
      domain: 'arxiv.org',
      selectedText:
        'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.',
      metadata: {
        title: 'Attention Is All You Need',
        authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar'],
        year: '2017',
        journalOrPublisher: 'NeurIPS',
        doi: '10.48550/arXiv.1706.03762',
        url: 'https://arxiv.org/abs/1706.03762',
        accessDate: '18 October 2026',
        sourceType: 'journal',
        verifiedFields: {
          title: true,
          authors: true,
          publicationDate: true,
          journalOrPublisher: true,
          doi: true,
        },
        inferredFields: {
          year: false,
          sourceType: false,
        },
      },
    };
  }

  static async extractCurrentArticle(): Promise<{
    title: string;
    cleanArticleText: string;
    byline?: string;
  } | null> {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://') && !tab.url.startsWith('about:')) {
        try {
          const res = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_ARTICLE' });
          if (res?.cleanArticleText) return res;
        } catch {
          // fallback to executeScript
          try {
            if (chrome.scripting) {
              const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                  const articleTag =
                    document.querySelector('article') ||
                    document.querySelector('main') ||
                    document.querySelector('[role="main"]') ||
                    document.body;
                  const clone = articleTag.cloneNode(true) as HTMLElement;
                  clone
                    .querySelectorAll(
                      'script, style, nav, footer, header, aside, noscript, svg, form'
                    )
                    .forEach((el) => el.remove());
                  const paragraphs = Array.from(clone.querySelectorAll('p, h1, h2, h3, h4, li'))
                    .map((el) => el.textContent?.trim() || '')
                    .filter((text) => text.length > 20);
                  return {
                    title: document.title,
                    cleanArticleText: paragraphs.join('\n\n'),
                    byline:
                      document.querySelector('meta[name="author"]')?.getAttribute('content') ||
                      undefined,
                  };
                },
              });
              if (results && results[0] && results[0].result) {
                return results[0].result;
              }
            }
          } catch {}
        }
      }
    }
    return null;
  }

  // -------------------------
  // Structured Research Document Export
  // -------------------------
  static generateResearchDocument(items: PagePocketItem[], projectName?: string): string {
    const title = projectName
      ? `Research Synthesis: ${projectName}`
      : 'Comprehensive Research & Notes Synthesis';
    const dateStr = new Date().toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    let doc = `# ${title}\n\n`;
    doc += `*Generated by PagePocket (ContextClip Engine) on ${dateStr}*\n`;
    doc += `*Total Notes & Highlights: ${items.length}*\n\n`;
    doc += `---\n\n`;

    // Group items by project or domain
    const groups: Record<string, PagePocketItem[]> = {};
    for (const item of items) {
      const g = item.project || 'General Research';
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    }

    doc += `## Table of Contents\n`;
    Object.keys(groups).forEach((gName, idx) => {
      doc += `${idx + 1}. [${gName}](#${gName.toLowerCase().replace(/[^a-z0-9]/g, '-')}) (${groups[gName].length} notes)\n`;
    });
    doc += `\n---\n\n`;

    // Notes sections
    for (const [gName, gItems] of Object.entries(groups)) {
      doc += `## ${gName}\n\n`;
      gItems.forEach((item, i) => {
        doc += `### ${i + 1}. ${item.title}\n`;
        doc += `- **Source URL**: [${item.domain}](${item.url})\n`;
        doc += `- **Captured Date**: ${new Date(item.createdAt).toLocaleDateString()}\n`;
        if (item.tags && item.tags.length > 0) doc += `- **Tags**: \`${item.tags.join('`, `')}\`\n`;

        if (item.selectedText) {
          doc += `\n#### Highlighted Excerpt\n> "${item.selectedText.replace(/\n+/g, ' ')}"\n\n`;
        }

        if (item.annotation) {
          doc += `**Personal Annotation**: *${item.annotation}*\n\n`;
        } else if (item.userNotes) {
          doc += `**Personal Notes**: *${item.userNotes}*\n\n`;
        }

        if (item.summary) {
          doc += `**Smart Summary**:\n${item.summary}\n\n`;
        }

        if (item.citation?.apa) {
          doc += `**APA Citation**:\n> ${item.citation.apa}\n\n`;
        }

        if (item.cleanArticleText) {
          doc += `<details><summary>View Full Extracted Content</summary>\n\n${item.cleanArticleText}\n\n</details>\n\n`;
        }

        doc += `---\n\n`;
      });
    }

    // Compiled References / Bibliography section at the bottom
    doc += `## Compiled References\n\n`;
    const uniqueCitations = new Set<string>();
    items.forEach((item) => {
      if (item.citation?.apa) {
        uniqueCitations.add(item.citation.apa);
      } else {
        uniqueCitations.add(`*${item.title}*. [Online]. Available: ${item.url}`);
      }
    });

    Array.from(uniqueCitations)
      .sort()
      .forEach((cite, idx) => {
        doc += `${idx + 1}. ${cite}\n`;
      });

    return doc;
  }
}
