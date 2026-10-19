// PagePocket & ContextClip Content Script
// Captures selected text, context, and page metadata for citations

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_SELECTION') {
    const selectedText = window.getSelection()?.toString()?.trim() || '';
    const metadata = extractPageMetadata();
    sendResponse({ selectedText, metadata });
    return false;
  }

  if (message.type === 'EXTRACT_ARTICLE') {
    const article = extractReadableArticle();
    sendResponse(article);
    return false;
  }
});

function getMetaContent(names: string[]): string {
  for (const n of names) {
    const el =
      document.querySelector(`meta[name="${n}"]`) ||
      document.querySelector(`meta[property="${n}"]`);
    const val = el?.getAttribute('content')?.trim();
    if (val) return val;
  }
  return '';
}

function extractPageMetadata() {
  const title =
    getMetaContent(['citation_title', 'dc.title', 'og:title', 'twitter:title']) ||
    document.title;
  const authorStr = getMetaContent([
    'citation_author',
    'dc.creator',
    'author',
    'article:author',
  ]);
  const journal = getMetaContent([
    'citation_journal_title',
    'citation_publisher',
    'og:site_name',
  ]);
  const date = getMetaContent([
    'citation_publication_date',
    'citation_date',
    'dc.date',
    'article:published_time',
  ]);
  const doi = getMetaContent(['citation_doi', 'dc.identifier']);

  let year = '';
  if (date) {
    const m = date.match(/\b(19\d\d|20\d\d)\b/);
    if (m) year = m[1];
  }

  const authors = authorStr
    ? authorStr.split(/[,;]/).map((a) => a.trim()).filter(Boolean)
    : [];

  return {
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
  };
}

function extractReadableArticle() {
  const articleTag =
    document.querySelector('article') ||
    document.querySelector('main') ||
    document.querySelector('[role="main"]');
  const target = articleTag || document.body;

  const clone = target.cloneNode(true) as HTMLElement;
  const toRemove = clone.querySelectorAll(
    'script, style, nav, footer, header, aside, noscript, svg, form'
  );
  toRemove.forEach((el) => el.remove());

  const paragraphs = Array.from(clone.querySelectorAll('p, h1, h2, h3, h4, li'))
    .map((el) => el.textContent?.trim() || '')
    .filter((text) => text.length > 20);

  return {
    title: document.title,
    url: window.location.href,
    cleanArticleText: paragraphs.join('\n\n'),
    byline: document.querySelector('meta[name="author"]')?.getAttribute('content') || undefined,
  };
}
