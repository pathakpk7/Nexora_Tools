import React, { useState, useEffect } from 'react';
import { BibliographicMetadata, CitationStyle, CitationItem } from '@nexora/shared-types';
import { Button, IconButton, Badge } from '@nexora/ui';
import {
  generateAPACitation,
  generateMLACitation,
  generateIEEECitation,
  generateBibTeX,
} from '@nexora/browser-utils';
import { CiteRightService, DEFAULT_COLLECTIONS } from '../services/citeright';
import {
  Quote,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FolderPlus,
  BookOpen,
  BookmarkPlus,
  RefreshCw,
} from 'lucide-react';

export const CiteRightPopup: React.FC = () => {
  const [metadata, setMetadata] = useState<BibliographicMetadata | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<CitationStyle>('apa');
  const [collections, setCollections] = useState<string[]>(DEFAULT_COLLECTIONS);
  const [selectedCollection, setSelectedCollection] = useState<string>('Literature Review');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const loadData = async () => {
    setIsScanning(true);
    try {
      const [colls, tabData] = await Promise.all([
        CiteRightService.getCollections(),
        CiteRightService.extractActiveTabMetadata(),
      ]);
      setCollections(colls);
      if (colls.length > 0) setSelectedCollection(colls[0]);
      setMetadata(tabData.metadata);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getFormattedCitation = (): string => {
    if (!metadata) return '';
    if (selectedStyle === 'apa') return generateAPACitation(metadata);
    if (selectedStyle === 'mla') return generateMLACitation(metadata);
    if (selectedStyle === 'ieee') return generateIEEECitation(metadata, 1);
    if (selectedStyle === 'bibtex') return generateBibTeX(metadata);
    return generateAPACitation(metadata);
  };

  const citationText = getFormattedCitation();

  const handleCopyCitation = () => {
    if (!citationText) return;
    navigator.clipboard.writeText(citationText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    const updated = await CiteRightService.addCollection(newCollectionName.trim());
    setCollections(updated);
    setSelectedCollection(newCollectionName.trim());
    setNewCollectionName('');
    setIsCreatingCollection(false);
  };

  const handleSaveToBibliography = async () => {
    if (!metadata) return;

    const item: CitationItem = {
      id: `cite_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      metadata,
      project: selectedCollection,
      tags: [selectedCollection.toLowerCase().replace(/\s+/g, '-')],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await CiteRightService.saveCitation(item);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const openStudio = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-sky-600 flex items-center justify-center text-white font-bold text-xs">
            C
          </div>
          <span className="font-semibold text-sm tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            CiteRight
          </span>
          <Badge size="sm" variant="success">
            Verified
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            size="sm"
            ariaLabel="Re-scan metadata"
            title="Re-scan active page"
            onClick={loadData}
            className={isScanning ? 'animate-spin' : ''}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton
            size="sm"
            ariaLabel="Open Bibliography Studio"
            title="Open Fullscreen Studio"
            onClick={openStudio}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </header>

      {/* Style selector pills */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold p-1.5 bg-slate-50/70 dark:bg-slate-900/40">
        {(['apa', 'mla', 'ieee', 'bibtex'] as const).map((style) => (
          <button
            key={style}
            onClick={() => setSelectedStyle(style)}
            className={`flex-1 py-1.5 text-center rounded-md uppercase transition-all text-[11px] ${
              selectedStyle === style
                ? 'bg-sky-600 text-white shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {style}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {/* Formatted Citation Output Box */}
        <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/30 dark:bg-sky-950/20 space-y-2 relative group">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-sky-900 dark:text-sky-200 uppercase tracking-wider text-[10px] flex items-center gap-1">
              <Quote className="w-3 h-3 text-sky-600" /> {selectedStyle.toUpperCase()} Reference
            </span>
            <button
              onClick={handleCopyCitation}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy Reference
                </>
              )}
            </button>
          </div>

          <div className="text-xs text-slate-800 dark:text-slate-200 font-serif leading-relaxed select-text p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
            {citationText || 'Extracting citation metadata...'}
          </div>
        </div>

        {/* Verified vs Inferred Breakdown Cards */}
        {metadata && (
          <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Metadata Verification
              </span>
              <span className="text-[10px] text-slate-400">Never Hallucinated</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {/* Authors badge */}
              <div className="p-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500">Author:</span>
                {metadata.verifiedFields.authors ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate ml-1">
                    ✓ {metadata.authors.length} verified
                  </span>
                ) : (
                  <span className="text-slate-400 italic">No author [n.a.]</span>
                )}
              </div>

              {/* Year badge */}
              <div className="p-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500">Date:</span>
                {metadata.verifiedFields.publicationDate ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate ml-1">
                    ✓ {metadata.year || 'Verified'}
                  </span>
                ) : metadata.inferredFields.year ? (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold truncate ml-1">
                    ~ {metadata.year} (inferred)
                  </span>
                ) : (
                  <span className="text-slate-400 italic">No date [n.d.]</span>
                )}
              </div>

              {/* Publication / Journal */}
              <div className="p-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500">Source:</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold truncate ml-1 max-w-[100px]">
                  {metadata.journalOrPublisher}
                </span>
              </div>

              {/* DOI badge */}
              <div className="p-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500">DOI / ISBN:</span>
                {metadata.doi ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate ml-1">
                    ✓ Verified
                  </span>
                ) : (
                  <span className="text-slate-400 italic">None</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bibliography Collection Target */}
        <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px]">
              <FolderPlus className="w-3.5 h-3.5 text-sky-600" /> Save To Collection:
            </span>
            <button
              onClick={() => setIsCreatingCollection(!isCreatingCollection)}
              className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline font-medium"
            >
              {isCreatingCollection ? 'Cancel' : '+ New Collection'}
            </button>
          </div>

          {isCreatingCollection ? (
            <form onSubmit={handleCreateCollection} className="flex gap-1.5 pt-1">
              <input
                type="text"
                placeholder="Collection name (e.g. Chapter 1)"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="flex-1 text-xs px-2 py-1 rounded border border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                autoFocus
              />
              <Button size="sm" variant="primary" type="submit" className="h-7 px-2 text-xs bg-sky-600">
                Add
              </Button>
            </form>
          ) : (
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
            >
              {collections.map((c) => (
                <option key={c} value={c}>
                  📚 {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <footer className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
        <Button
          size="sm"
          variant="primary"
          className="w-full justify-center bg-sky-600 hover:bg-sky-700 text-white font-semibold h-8"
          onClick={handleSaveToBibliography}
          icon={isSaved ? <Check className="w-4 h-4 text-white" /> : <BookmarkPlus className="w-4 h-4" />}
        >
          {isSaved ? 'Saved to Bibliography!' : `Add to ${selectedCollection}`}
        </Button>
      </footer>
    </div>
  );
};
