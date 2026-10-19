import { describe, it, expect } from 'vitest';
import {
  isInternalBrowserUrl,
  extractDomain,
  normalizeUrl,
  findDuplicateUrls,
  generateAPACitation,
  generateMLACitation,
  generateIEEECitation,
  generateBibTeX,
  formatSecondsToTimestamp,
  parseTimestampToSeconds,
  extractYoutubeVideoId,
  buildTimestampedVideoUrl,
} from './index';

describe('Browser Utilities Unit Tests', () => {
  it('correctly identifies internal browser URLs', () => {
    expect(isInternalBrowserUrl('chrome://extensions')).toBe(true);
    expect(isInternalBrowserUrl('chrome-extension://abc/popup.html')).toBe(true);
    expect(isInternalBrowserUrl('edge://settings')).toBe(true);
    expect(isInternalBrowserUrl('about:blank')).toBe(true);
    expect(isInternalBrowserUrl('https://google.com')).toBe(false);
  });

  it('extracts clean domains from URLs', () => {
    expect(extractDomain('https://www.example.com/path?query=1')).toBe('example.com');
    expect(extractDomain('https://sub.domain.co.uk/page')).toBe('sub.domain.co.uk');
  });

  it('normalizes URLs cleanly', () => {
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
    expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
  });

  it('finds duplicate URLs accurately across tabs/bookmarks', () => {
    const list = [
      { id: '1', url: 'https://github.com/nexora' },
      { id: '2', url: 'https://react.dev' },
      { id: '3', url: 'https://github.com/nexora/' },
      { id: '4', url: 'https://vitejs.dev' },
    ];
    const dups = findDuplicateUrls(list);
    expect(dups.has('https://github.com/nexora')).toBe(true);
    expect(dups.get('https://github.com/nexora')?.length).toBe(2);
    expect(dups.has('https://react.dev')).toBe(false);
  });

  it('generates APA, MLA, and IEEE citations correctly without hallucinating missing fields', () => {
    const meta = {
      title: 'Attention Is All You Need',
      authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar'],
      year: '2017',
      journalOrPublisher: 'NeurIPS',
      doi: '10.48550/arXiv.1706.03762',
      url: 'https://arxiv.org/abs/1706.03762',
      accessDate: '18 October 2026',
      sourceType: 'journal' as const,
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
    };

    const apa = generateAPACitation(meta);
    expect(apa).toContain('Vaswani, A., Shazeer, N., & Parmar, N.');
    expect(apa).toContain('(2017)');
    expect(apa).toContain('Attention Is All You Need');
    expect(apa).toContain('https://doi.org/10.48550/arXiv.1706.03762');

    const mla = generateMLACitation(meta);
    expect(mla).toContain('Vaswani, Ashish, et al.');
    expect(mla).toContain('"Attention Is All You Need."');
    expect(mla).toContain('Accessed 18 October 2026');

    const ieee = generateIEEECitation(meta, 1);
    expect(ieee).toContain('[1]');
    expect(ieee).toContain('A. Vaswani, N. Shazeer, and N. Parmar');
    expect(ieee).toContain('doi: 10.48550/arXiv.1706.03762');

    const bibtex = generateBibTeX(meta);
    expect(bibtex).toContain('@article{vaswani2017attention');
    expect(bibtex).toContain('title = {Attention Is All You Need}');
  });

  it('formats seconds to timestamp string and parses back correctly', () => {
    expect(formatSecondsToTimestamp(272)).toBe('04:32');
    expect(formatSecondsToTimestamp(738)).toBe('12:18');
    expect(formatSecondsToTimestamp(1305)).toBe('21:45');
    expect(formatSecondsToTimestamp(3725)).toBe('01:02:05');

    expect(parseTimestampToSeconds('04:32')).toBe(272);
    expect(parseTimestampToSeconds('12:18')).toBe(738);
    expect(parseTimestampToSeconds('01:02:05')).toBe(3725);

    const ytid = extractYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(ytid).toBe('dQw4w9WgXcQ');

    const tsUrl = buildTimestampedVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 272);
    expect(tsUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=272s');
  });
});

