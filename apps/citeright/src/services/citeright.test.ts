import { describe, it, expect } from 'vitest';
import {
  generateAPACitation,
  generateMLACitation,
  generateIEEECitation,
  generateBibTeX,
  buildBibliography,
} from '@nexora/browser-utils';
import { BibliographicMetadata } from '@nexora/shared-types';

describe('CiteRight Citation Engine Tests', () => {
  const sampleMeta: BibliographicMetadata = {
    title: 'Deep Residual Learning for Image Recognition',
    authors: ['Kaiming He', 'Xiangyu Zhang', 'Shaoqing Ren', 'Jian Sun'],
    publicationDate: '2016',
    year: '2016',
    journalOrPublisher: 'IEEE Conference on Computer Vision and Pattern Recognition (CVPR)',
    pages: '770–778',
    doi: '10.1109/CVPR.2016.90',
    url: 'https://doi.org/10.1109/CVPR.2016.90',
    accessDate: '19 October 2026',
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
  };

  it('generates APA citation accurately without hallucination', () => {
    const apa = generateAPACitation(sampleMeta);
    expect(apa).toContain('He, K., Zhang, X., Ren, S., & Sun, J.');
    expect(apa).toContain('(2016)');
    expect(apa).toContain('Deep Residual Learning for Image Recognition');
    expect(apa).toContain('https://doi.org/10.1109/CVPR.2016.90');
  });

  it('generates MLA citation accurately', () => {
    const mla = generateMLACitation(sampleMeta);
    expect(mla).toContain('He, Kaiming, et al.');
    expect(mla).toContain('"Deep Residual Learning for Image Recognition."');
    expect(mla).toContain('pp. 770–778');
    expect(mla).toContain('Accessed 19 October 2026');
  });

  it('generates IEEE citation with correct numbering', () => {
    const ieee = generateIEEECitation(sampleMeta, 3);
    expect(ieee).toContain('[3]');
    expect(ieee).toContain('K. He, X. Zhang, S. Ren, and J. Sun');
    expect(ieee).toContain('doi: 10.1109/CVPR.2016.90');
  });

  it('handles missing author and date gracefully with official style conventions', () => {
    const noAuthorMeta: BibliographicMetadata = {
      title: 'Python Software Foundation Documentation',
      authors: [],
      url: 'https://python.org',
      accessDate: '19 October 2026',
      sourceType: 'website',
      verifiedFields: {
        title: true,
        authors: false,
        publicationDate: false,
        journalOrPublisher: false,
        doi: false,
      },
      inferredFields: {
        year: true,
        sourceType: true,
      },
    };

    const apa = generateAPACitation(noAuthorMeta);
    expect(apa).toContain('*Python Software Foundation Documentation*. (n.d.).');
    expect(apa).not.toContain('undefined');
    expect(apa).not.toContain('null');
  });

  it('builds a sorted alphabetized bibliography from multiple records', () => {
    const metaB: BibliographicMetadata = {
      title: 'BERT: Pre-training of Deep Bidirectional Transformers',
      authors: ['Jacob Devlin', 'Ming-Wei Chang'],
      year: '2019',
      journalOrPublisher: 'NAACL',
      url: 'https://arxiv.org/abs/1810.04805',
      accessDate: '19 October 2026',
      sourceType: 'preprint',
      verifiedFields: {
        title: true,
        authors: true,
        publicationDate: true,
        journalOrPublisher: true,
        doi: false,
      },
      inferredFields: {
        year: false,
        sourceType: false,
      },
    };

    const bib = buildBibliography([sampleMeta, metaB], 'apa');
    // Devlin should appear before He in APA author alphabetization
    const devlinIndex = bib.indexOf('Devlin');
    const heIndex = bib.indexOf('He');
    expect(devlinIndex).toBeLessThan(heIndex);
  });
});
