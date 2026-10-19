import { BibliographicMetadata, CitationStyle } from '@nexora/shared-types';

/**
 * Formats authors for APA 7th Edition:
 * - One author: Smith, J. D.
 * - Two authors: Smith, J. D., & Doe, A. B.
 * - Three+ authors: Smith, J. D., Doe, A. B., & Brown, C.
 */
export function formatAuthorsAPA(authors: string[]): string {
  if (!authors || authors.length === 0) return '';
  const formatted = authors.map((author) => {
    const parts = author.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const lastName = parts[parts.length - 1];
    const initials = parts
      .slice(0, parts.length - 1)
      .map((p) => `${p[0]?.toUpperCase()}.`)
      .join(' ');
    return `${lastName}, ${initials}`;
  });

  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`;
  return `${formatted.slice(0, -1).join(', ')}, & ${formatted[formatted.length - 1]}`;
}

/**
 * Formats authors for MLA 9th Edition:
 * - One author: Smith, John.
 * - Two authors: Smith, John, and Alex Doe.
 * - Three+ authors: Smith, John, et al.
 */
export function formatAuthorsMLA(authors: string[]): string {
  if (!authors || authors.length === 0) return '';
  const formatted = authors.map((author, index) => {
    const parts = author.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    if (index === 0) {
      const lastName = parts[parts.length - 1];
      const firstName = parts.slice(0, parts.length - 1).join(' ');
      return `${lastName}, ${firstName}`;
    }
    return author.trim();
  });

  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]}, and ${formatted[1]}`;
  return `${formatted[0]}, et al.`;
}

/**
 * Formats authors for IEEE:
 * - One author: J. D. Smith
 * - Two authors: J. D. Smith and A. B. Doe
 * - Three+ authors: J. D. Smith, A. B. Doe, and C. Brown
 */
export function formatAuthorsIEEE(authors: string[]): string {
  if (!authors || authors.length === 0) return '';
  const formatted = authors.map((author) => {
    const parts = author.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const lastName = parts[parts.length - 1];
    const initials = parts
      .slice(0, parts.length - 1)
      .map((p) => `${p[0]?.toUpperCase()}.`)
      .join(' ');
    return `${initials} ${lastName}`;
  });

  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
  return `${formatted.slice(0, -1).join(', ')}, and ${formatted[formatted.length - 1]}`;
}

/**
 * Formats clean DOI URL
 */
export function formatDoiUrl(doi?: string): string {
  if (!doi) return '';
  const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//, '').replace(/^doi:\s*/i, '').trim();
  return `https://doi.org/${cleanDoi}`;
}

/**
 * Generates official APA 7th edition citation:
 * Journal: Author, A. A. (Year). Title of article. Journal Title, volume(issue), pages. DOI/URL
 * Webpage: Author, A. A. (Year, Month Day). Title of work. Site Name. URL
 * Without Author: Title of work. (Year, Month Day). Site Name. URL
 * Without Date: Author, A. A. (n.d.). Title of work. Site Name. URL
 */
export function generateAPACitation(meta: BibliographicMetadata): string {
  const authorStr = formatAuthorsAPA(meta.authors);
  const yearStr = meta.year ? `(${meta.year})` : '(n.d.)';
  const title = meta.title.trim().replace(/\.$/, '');
  const journalOrSite = meta.journalOrPublisher ? meta.journalOrPublisher.trim() : '';
  const doiUrl = formatDoiUrl(meta.doi);

  if (meta.sourceType === 'journal') {
    let loc = '';
    if (meta.volume) {
      loc += meta.volume;
      if (meta.issue) loc += `(${meta.issue})`;
    }
    if (meta.pages) {
      loc += loc ? `, ${meta.pages}` : meta.pages;
    }

    if (authorStr) {
      let cite = `${authorStr} ${yearStr}. ${title}.`;
      if (journalOrSite) cite += ` *${journalOrSite}*`;
      if (loc) cite += `, ${loc}`;
      cite += '.';
      if (doiUrl) cite += ` ${doiUrl}`;
      else if (meta.url) cite += ` ${meta.url}`;
      return cite;
    } else {
      let cite = `${title}. ${yearStr}.`;
      if (journalOrSite) cite += ` *${journalOrSite}*`;
      if (loc) cite += `, ${loc}`;
      cite += '.';
      if (doiUrl) cite += ` ${doiUrl}`;
      else if (meta.url) cite += ` ${meta.url}`;
      return cite;
    }
  }

  // Webpage or other source
  if (authorStr) {
    let cite = `${authorStr} ${yearStr}. *${title}*.`;
    if (journalOrSite) cite += ` ${journalOrSite}.`;
    if (doiUrl) cite += ` ${doiUrl}`;
    else if (meta.url) cite += ` ${meta.url}`;
    return cite;
  } else {
    let cite = `*${title}*. ${yearStr}.`;
    if (journalOrSite) cite += ` ${journalOrSite}.`;
    if (doiUrl) cite += ` ${doiUrl}`;
    else if (meta.url) cite += ` ${meta.url}`;
    return cite;
  }
}

/**
 * Generates official MLA 9th edition citation:
 * Journal: Author. "Title." Journal Title, vol. X, no. Y, Year, pp. Z. DOI/URL. Accessed Date.
 * Webpage: Author. "Title of Webpage." Site Name, Publisher, Date, URL. Accessed Date.
 */
export function generateMLACitation(meta: BibliographicMetadata): string {
  const authorStr = formatAuthorsMLA(meta.authors);
  const title = meta.title.trim().replace(/\.$/, '');
  const container = meta.journalOrPublisher ? `*${meta.journalOrPublisher.trim()}*` : '';
  const year = meta.year || meta.publicationDate || 'n.d.';
  const doiUrl = formatDoiUrl(meta.doi);
  const sourceLink = doiUrl || meta.url;

  const parts: string[] = [];
  if (authorStr) parts.push(`${authorStr}.`);
  parts.push(`"${title}."`);
  if (container) parts.push(`${container},`);

  if (meta.volume) parts.push(`vol. ${meta.volume},`);
  if (meta.issue) parts.push(`no. ${meta.issue},`);
  if (meta.pages) parts.push(`pp. ${meta.pages},`);

  parts.push(`${year},`);
  if (sourceLink) parts.push(`${sourceLink}.`);
  if (meta.accessDate) parts.push(`Accessed ${meta.accessDate}.`);

  return parts.join(' ').replace(/\s+,/g, ',').replace(/\s+\./g, '.');
}

/**
 * Generates official IEEE citation:
 * [1] Authors, "Title of article," Abbrev. Journal, vol. x, no. y, pp. xxx-xxx, Month, year, doi: 10.xxxx.
 */
export function generateIEEECitation(meta: BibliographicMetadata, index = 1): string {
  const authorStr = formatAuthorsIEEE(meta.authors);
  const title = meta.title.trim().replace(/\.$/, '');
  const journal = meta.journalOrPublisher ? `*${meta.journalOrPublisher.trim()}*` : '';
  const year = meta.year || 'n.d.';
  const doi = meta.doi ? `doi: ${meta.doi.replace(/^https?:\/\/doi\.org\//, '').trim()}` : '';

  const details: string[] = [];
  if (meta.volume) details.push(`vol. ${meta.volume}`);
  if (meta.issue) details.push(`no. ${meta.issue}`);
  if (meta.pages) details.push(`pp. ${meta.pages}`);
  if (year !== 'n.d.') details.push(year);

  const prefix = `[${index}] `;
  let cite = prefix;
  if (authorStr) cite += `${authorStr}, `;
  cite += `"${title},"`;
  if (journal) cite += ` ${journal},`;
  if (details.length > 0) cite += ` ${details.join(', ')}.`;
  else cite += '.';
  if (doi) cite += ` ${doi}.`;
  else if (meta.url) cite += ` [Online]. Available: ${meta.url}. [Accessed: ${meta.accessDate}].`;

  return cite;
}

/**
 * Generates standard BibTeX entry
 */
export function generateBibTeX(meta: BibliographicMetadata): string {
  const firstAuthorLast = meta.authors[0]
    ? meta.authors[0].split(/\s+/).pop()?.toLowerCase() || 'unknown'
    : 'unknown';
  const year = meta.year || 'nodate';
  const firstWord = meta.title.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'entry';
  const citationKey = `${firstAuthorLast}${year}${firstWord}`;

  const entryType = meta.sourceType === 'journal' ? 'article' : 'misc';
  const authorsFormatted = meta.authors.join(' and ');

  const fields: string[] = [];
  if (meta.title) fields.push(`  title = {${meta.title}}`);
  if (authorsFormatted) fields.push(`  author = {${authorsFormatted}}`);
  if (meta.journalOrPublisher) {
    if (meta.sourceType === 'journal') fields.push(`  journal = {${meta.journalOrPublisher}}`);
    else fields.push(`  publisher = {${meta.journalOrPublisher}}`);
  }
  if (meta.year) fields.push(`  year = {${meta.year}}`);
  if (meta.volume) fields.push(`  volume = {${meta.volume}}`);
  if (meta.issue) fields.push(`  number = {${meta.issue}}`);
  if (meta.pages) fields.push(`  pages = {${meta.pages}}`);
  if (meta.doi) fields.push(`  doi = {${meta.doi}}`);
  if (meta.isbn) fields.push(`  isbn = {${meta.isbn}}`);
  if (meta.url) fields.push(`  url = {${meta.url}}`);
  if (meta.accessDate) fields.push(`  urldate = {${meta.accessDate}}`);

  return `@${entryType}{${citationKey},\n${fields.join(',\n')}\n}`;
}

/**
 * Generates citations in all supported formats for a given metadata record
 */
export function generateAllCitations(
  meta: BibliographicMetadata,
  index = 1
): Record<CitationStyle, string> {
  return {
    apa: generateAPACitation(meta),
    mla: generateMLACitation(meta),
    ieee: generateIEEECitation(meta, index),
    chicago: generateAPACitation(meta), // Standard author-date approximation
    harvard: generateAPACitation(meta), // Standard author-date approximation
    bibtex: generateBibTeX(meta),
  };
}

/**
 * Builds formatted bibliography from multiple metadata records
 */
export function buildBibliography(
  items: BibliographicMetadata[],
  style: CitationStyle = 'apa'
): string {
  // Sort alphabetically by primary author last name or title
  const sorted = [...items].sort((a, b) => {
    const aLead = (a.authors[0] || a.title).toLowerCase();
    const bLead = (b.authors[0] || b.title).toLowerCase();
    return aLead.localeCompare(bLead);
  });

  if (style === 'bibtex') {
    return sorted.map((item) => generateBibTeX(item)).join('\n\n');
  }

  return sorted
    .map((item, idx) => {
      if (style === 'ieee') return generateIEEECitation(item, idx + 1);
      if (style === 'mla') return generateMLACitation(item);
      return generateAPACitation(item);
    })
    .join('\n\n');
}
