// CiteRight Content Script
// Extracts verified bibliographic metadata from webpages, preprints, journals, and books

import { BibliographicMetadata } from '@nexora/shared-types';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_METADATA') {
    const metadata = extractComprehensiveMetadata();
    sendResponse({ metadata });
    return false;
  }
});

function getMetaContent(names: string[]): string {
  for (const n of names) {
    const el =
      document.querySelector(`meta[name="${n}" i]`) ||
      document.querySelector(`meta[property="${n}" i]`);
    const val = el?.getAttribute('content')?.trim();
    if (val) return val;
  }
  return '';
}

function getAllMetaContents(names: string[]): string[] {
  const results: string[] = [];
  for (const n of names) {
    const els = document.querySelectorAll(`meta[name="${n}" i], meta[property="${n}" i]`);
    els.forEach((el) => {
      const val = el.getAttribute('content')?.trim();
      if (val && !results.includes(val)) results.push(val);
    });
  }
  return results;
}

export function extractComprehensiveMetadata(): BibliographicMetadata {
  const verified = {
    title: false,
    authors: false,
    publicationDate: false,
    journalOrPublisher: false,
    doi: false,
    isbn: false,
  };

  const inferred = {
    year: false,
    sourceType: false,
  };

  // 1. Highwire Press & Dublin Core Tags (Gold standard for academic papers)
  let title = getMetaContent([
    'citation_title',
    'dc.title',
    'dcterms.title',
    'og:title',
    'twitter:title',
  ]);
  if (title) verified.title = true;
  else title = document.title || 'Untitled Document';

  // Authors (collect all authors)
  let authors = getAllMetaContents([
    'citation_author',
    'dc.creator',
    'dcterms.creator',
    'author',
    'article:author',
  ]);

  if (authors.length > 0) {
    verified.authors = true;
  }

  // Publication Date
  let pubDate = getMetaContent([
    'citation_publication_date',
    'citation_date',
    'dc.date',
    'dcterms.date',
    'article:published_time',
  ]);
  if (pubDate) verified.publicationDate = true;

  // Journal or Publisher
  let journal = getMetaContent([
    'citation_journal_title',
    'citation_publisher',
    'dc.publisher',
    'citation_conference_title',
    'og:site_name',
  ]);
  if (journal) verified.journalOrPublisher = true;

  // DOI
  let doi = getMetaContent(['citation_doi', 'dc.identifier.doi', 'dc.identifier']);
  if (doi && doi.includes('10.')) {
    verified.doi = true;
    doi = doi.replace(/^https?:\/\/doi\.org\//, '').replace(/^doi:\s*/i, '').trim();
  } else {
    doi = '';
  }

  // Volume, Issue, Pages
  const volume = getMetaContent(['citation_volume']);
  const issue = getMetaContent(['citation_issue']);
  const firstPage = getMetaContent(['citation_firstpage']);
  const lastPage = getMetaContent(['citation_lastpage']);
  const pages =
    firstPage && lastPage ? `${firstPage}–${lastPage}` : firstPage || undefined;

  // ISBN / ISSN
  const isbn = getMetaContent(['citation_isbn']);
  const issn = getMetaContent(['citation_issn']);
  if (isbn) verified.isbn = true;

  // 2. Schema.org JSON-LD Extraction (Fallback / Complement)
  try {
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    jsonLdScripts.forEach((script) => {
      try {
        const data = JSON.parse(script.textContent || '{}');
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (!item) continue;
          if (
            ['ScholarlyArticle', 'TechArticle', 'NewsArticle', 'Article', 'Book', 'Report'].includes(
              item['@type']
            )
          ) {
            if (!verified.title && (item.headline || item.name)) {
              title = item.headline || item.name;
              verified.title = true;
            }
            if (!verified.authors && item.author) {
              const ldAuthors = Array.isArray(item.author) ? item.author : [item.author];
              ldAuthors.forEach((a: any) => {
                const name = typeof a === 'string' ? a : a.name;
                if (name && !authors.includes(name)) authors.push(name);
              });
              if (authors.length > 0) verified.authors = true;
            }
            if (!verified.publicationDate && (item.datePublished || item.dateCreated)) {
              pubDate = item.datePublished || item.dateCreated;
              verified.publicationDate = true;
            }
            if (!verified.journalOrPublisher && item.publisher?.name) {
              journal = item.publisher.name;
              verified.journalOrPublisher = true;
            }
          }
        }
      } catch {}
    });
  } catch {}

  // 3. Page DOM & URL heuristics for DOI / ISBN if not yet found
  if (!doi) {
    const doiMatch = document.body.innerText.match(/\b(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)\b/);
    if (doiMatch) {
      doi = doiMatch[1].replace(/[.,;)]+$/, '');
      verified.doi = true;
    }
  }

  // 4. Year derivation
  let year = '';
  if (pubDate) {
    const yMatch = pubDate.match(/\b(19\d\d|20\d\d)\b/);
    if (yMatch) {
      year = yMatch[1];
    }
  }
  if (!year) {
    // Try URL or copyright
    const urlYear = window.location.href.match(/\b(20\d\d|19\d\d)\b/);
    if (urlYear) {
      year = urlYear[1];
      inferred.year = true;
    }
  }

  // Fallback publisher to domain if missing
  if (!journal) {
    journal = window.location.hostname.replace(/^www\./, '');
  }

  // Determine Source Type
  let sourceType: BibliographicMetadata['sourceType'] = 'website';
  if (doi || getMetaContent(['citation_journal_title'])) {
    sourceType = 'journal';
  } else if (isbn) {
    sourceType = 'book';
  } else if (window.location.hostname.includes('arxiv.org') || window.location.hostname.includes('biorxiv.org')) {
    sourceType = 'preprint';
  } else {
    inferred.sourceType = true;
  }

  return {
    title: title.trim(),
    authors,
    publicationDate: pubDate || undefined,
    year: year || undefined,
    journalOrPublisher: journal,
    volume: volume || undefined,
    issue: issue || undefined,
    pages,
    doi: doi || undefined,
    isbn: isbn || undefined,
    issn: issn || undefined,
    url: window.location.href,
    accessDate: new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    sourceType,
    verifiedFields: verified,
    inferredFields: inferred,
  };
}
