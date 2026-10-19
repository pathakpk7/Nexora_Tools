import React, { useState, useEffect } from 'react';
import { CitationItem, CitationStyle, BibliographicMetadata } from '@nexora/shared-types';
import { Button, IconButton, SearchInput, Badge, EmptyState, ConfirmationDialog, Input } from '@nexora/ui';
import {
  generateAPACitation,
  generateMLACitation,
  generateIEEECitation,
  generateBibTeX,
  buildBibliography,
  downloadMarkdownFile,
  downloadTextFile,
  downloadJsonFile,
} from '@nexora/browser-utils';
import { CiteRightService, DEFAULT_COLLECTIONS } from '../services/citeright';
import {
  Quote,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Download,
  Folder,
  FolderPlus,
  BookOpen,
  Search,
  Plus,
  ShieldCheck,
  Edit2,
  FileText,
  Sparkles,
} from 'lucide-react';

export const CiteRightDashboard: React.FC = () => {
  const [citations, setCitations] = useState<CitationItem[]>([]);
  const [collections, setCollections] = useState<string[]>(DEFAULT_COLLECTIONS);
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [selectedStyle, setSelectedStyle] = useState<CitationStyle>('apa');
  const [search, setSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // New Collection State
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // DOI / ISBN lookup state
  const [lookupQuery, setLookupQuery] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupFeedback, setLookupFeedback] = useState<string | null>(null);

  // Editing state for an item
  const [editingItem, setEditingItem] = useState<CitationItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthors, setEditAuthors] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editJournal, setEditJournal] = useState('');
  const [editVolume, setEditVolume] = useState('');
  const [editPages, setEditPages] = useState('');

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedBibliography, setCopiedBibliography] = useState(false);

  const loadData = async () => {
    const [allCites, colls] = await Promise.all([
      CiteRightService.getAllCitations(),
      CiteRightService.getCollections(),
    ]);
    setCitations(allCites);
    setCollections(colls);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    const updated = await CiteRightService.addCollection(newCollectionName.trim());
    setCollections(updated);
    setSelectedCollection(newCollectionName.trim());
    setNewCollectionName('');
    setIsAddingCollection(false);
  };

  // Perform authoritative DOI or ISBN lookup via CrossRef / OpenLibrary
  const handlePerformLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = lookupQuery.trim();
    if (!q) return;

    setIsLookingUp(true);
    setLookupFeedback(null);

    try {
      let meta: BibliographicMetadata | null = null;
      if (q.includes('10.') || q.startsWith('doi:')) {
        meta = await CiteRightService.lookupDOI(q);
      } else {
        meta = await CiteRightService.lookupISBN(q);
        if (!meta && q.includes('/')) {
          meta = await CiteRightService.lookupDOI(q);
        }
      }

      if (meta) {
        const targetColl = selectedCollection === 'all' ? collections[0] || 'Literature Review' : selectedCollection;
        const newItem: CitationItem = {
          id: `cite_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          metadata: meta,
          project: targetColl,
          tags: [targetColl.toLowerCase().replace(/\s+/g, '-')],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await CiteRightService.saveCitation(newItem);
        setLookupQuery('');
        setLookupFeedback(`✓ Successfully added: "${meta.title}" (${meta.year || 'verified'})`);
        await loadData();
        setTimeout(() => setLookupFeedback(null), 4000);
      } else {
        setLookupFeedback('⚠️ Could not find verified record for this DOI or ISBN. Check identifier format.');
      }
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleStartEdit = (item: CitationItem) => {
    setEditingItem(item);
    setEditTitle(item.metadata.title);
    setEditAuthors(item.metadata.authors.join(', '));
    setEditYear(item.metadata.year || '');
    setEditJournal(item.metadata.journalOrPublisher || '');
    setEditVolume(item.metadata.volume || '');
    setEditPages(item.metadata.pages || '');
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const authorsArr = editAuthors
      .split(/[,;]/)
      .map((a) => a.trim())
      .filter(Boolean);

    const updated: CitationItem = {
      ...editingItem,
      metadata: {
        ...editingItem.metadata,
        title: editTitle.trim(),
        authors: authorsArr,
        year: editYear.trim() || undefined,
        journalOrPublisher: editJournal.trim(),
        volume: editVolume.trim() || undefined,
        pages: editPages.trim() || undefined,
        verifiedFields: {
          ...editingItem.metadata.verifiedFields,
          title: true,
          authors: authorsArr.length > 0,
          publicationDate: Boolean(editYear.trim()),
          journalOrPublisher: Boolean(editJournal.trim()),
        },
      },
      updatedAt: Date.now(),
    };

    await CiteRightService.updateCitation(updated);
    setEditingItem(null);
    await loadData();
  };

  const handleCopySingleCitation = (item: CitationItem) => {
    let str = '';
    if (selectedStyle === 'apa') str = generateAPACitation(item.metadata);
    else if (selectedStyle === 'mla') str = generateMLACitation(item.metadata);
    else if (selectedStyle === 'ieee') str = generateIEEECitation(item.metadata, 1);
    else if (selectedStyle === 'bibtex') str = generateBibTeX(item.metadata);

    navigator.clipboard.writeText(str);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredCitations = citations.filter((c) => {
    if (selectedCollection !== 'all') {
      const p = c.project || 'General';
      if (p.toLowerCase() !== selectedCollection.toLowerCase()) return false;
    }
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      c.metadata.title.toLowerCase().includes(q) ||
      c.metadata.authors.some((a) => a.toLowerCase().includes(q)) ||
      (c.metadata.journalOrPublisher && c.metadata.journalOrPublisher.toLowerCase().includes(q)) ||
      (c.metadata.doi && c.metadata.doi.toLowerCase().includes(q))
    );
  });

  const compiledBibliography = buildBibliography(
    filteredCitations.map((c) => c.metadata),
    selectedStyle
  );

  const handleCopyBibliography = () => {
    if (!compiledBibliography) return;
    navigator.clipboard.writeText(compiledBibliography);
    setCopiedBibliography(true);
    setTimeout(() => setCopiedBibliography(false), 2000);
  };

  const handleExportMarkdown = () => {
    const doc = CiteRightService.exportBibliographyMarkdown(
      filteredCitations,
      selectedStyle,
      selectedCollection === 'all' ? undefined : selectedCollection
    );
    const fname = `bibliography_${selectedCollection.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${selectedStyle}.md`;
    downloadMarkdownFile(fname, doc);
  };

  const handleExportBibTeX = () => {
    const bib = buildBibliography(filteredCitations.map((c) => c.metadata), 'bibtex');
    const fname = `references_${selectedCollection.toLowerCase().replace(/[^a-z0-9]/g, '_')}.bib`;
    downloadTextFile(fname, bib, 'application/x-bibtex');
  };

  const handleExportText = () => {
    const fname = `bibliography_${selectedCollection.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`;
    downloadTextFile(fname, compiledBibliography);
  };

  const handleExportJson = () => {
    const fname = `citeright_export_${selectedCollection.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
    downloadJsonFile(fname, filteredCitations);
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      {/* Sidebar */}
      <aside className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
        {/* Brand */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-sky-600 flex items-center justify-center text-white font-bold text-xs">
              C
            </div>
            <div>
              <span className="font-semibold text-sm">CiteRight Studio</span>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 block font-medium">
                Verified Bibliographies
              </span>
            </div>
          </div>
          <Badge variant="info">{citations.length} sources</Badge>
        </div>

        {/* Collections Nav */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-sky-600" /> Collections
            </span>
            <button
              onClick={() => setIsAddingCollection(!isAddingCollection)}
              className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5"
            >
              <FolderPlus className="w-3 h-3" /> {isAddingCollection ? 'Cancel' : 'New'}
            </button>
          </div>

          {isAddingCollection && (
            <form onSubmit={handleCreateCollection} className="flex gap-1.5 pt-1 animate-in fade-in">
              <input
                type="text"
                placeholder="Collection name (e.g. Chapter 2)"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="flex-1 text-xs px-2 py-1 rounded border border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900"
                autoFocus
              />
              <Button size="sm" variant="primary" type="submit" className="h-7 px-2 text-xs bg-sky-600">
                Add
              </Button>
            </form>
          )}

          {/* Collection pills */}
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            <button
              onClick={() => setSelectedCollection('all')}
              className={`text-[11px] px-2.5 py-1 rounded-md transition-all font-medium ${
                selectedCollection === 'all'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All Sources ({citations.length})
            </button>
            {collections.map((c) => {
              const count = citations.filter(
                (item) => (item.project || '').toLowerCase() === c.toLowerCase()
              ).length;
              return (
                <button
                  key={c}
                  onClick={() => setSelectedCollection(c)}
                  className={`text-[11px] px-2.5 py-1 rounded-md transition-all font-medium ${
                    selectedCollection.toLowerCase() === c.toLowerCase()
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {c} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Style Selector & Search */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 space-y-2">
          <SearchInput
            placeholder="Search by title, author, journal, DOI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
          <div className="flex items-center gap-1 overflow-x-auto text-xs pb-0.5">
            {(['apa', 'mla', 'ieee', 'bibtex'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStyle(s)}
                className={`flex-1 py-1 rounded-md uppercase font-bold text-[10px] transition-colors ${
                  selectedStyle === s
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Saved Reference List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredCitations.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No citations found"
                description="Save references from the extension popup or lookup a DOI / ISBN above."
              />
            </div>
          ) : (
            filteredCitations.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-1.5 group hover:border-sky-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">
                    {item.metadata.sourceType}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopySingleCitation(item)}
                      className="p-1 text-slate-400 hover:text-sky-600 transition-colors"
                      title="Copy reference"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="p-1 text-slate-400 hover:text-slate-700 transition-colors opacity-0 group-hover:opacity-100"
                      title="Edit reference metadata"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete reference"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                  {item.metadata.title}
                </h4>

                <p className="text-[11px] text-slate-500 line-clamp-1">
                  {item.metadata.authors.length > 0
                    ? item.metadata.authors.join(', ')
                    : '[No Author]'}
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                  <span className="truncate max-w-[140px]">{item.metadata.journalOrPublisher}</span>
                  <span>{item.metadata.year || 'n.d.'}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bulk Export Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">Export:</span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={handleExportMarkdown} className="h-6 text-[10px] px-2">
              .MD
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportBibTeX} className="h-6 text-[10px] px-2">
              .BIB
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportText} className="h-6 text-[10px] px-2">
              .TXT
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportJson} className="h-6 text-[10px] px-2">
              JSON
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Panel: DOI/ISBN Search + Full Bibliography Preview */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
        <header className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{selectedCollection === 'all' ? 'All Collections' : selectedCollection}</span>
              <Badge variant="info">{selectedStyle.toUpperCase()}</Badge>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Accurate bibliographic references verified against scholarly sources.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              className="bg-sky-600 hover:bg-sky-700 text-white font-medium"
              onClick={handleCopyBibliography}
              icon={copiedBibliography ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copiedBibliography ? 'Copied Whole Bibliography' : 'Copy Bibliography'}
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-4xl space-y-6">
          {/* Authoritative DOI / ISBN Lookup Box */}
          <div className="p-4 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/40 dark:bg-sky-950/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-sky-600" /> Direct DOI / ISBN Lookup (CrossRef & OpenLibrary)
              </span>
              <span className="text-[10px] text-sky-700 dark:text-sky-300">
                Authoritative metadata retrieval
              </span>
            </div>

            <form onSubmit={handlePerformLookup} className="flex gap-2">
              <input
                type="text"
                placeholder="Paste DOI (e.g. 10.1038/s41586-020-2649-2) or ISBN (e.g. 9780132350884)..."
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <Button
                size="sm"
                variant="primary"
                type="submit"
                disabled={isLookingUp || !lookupQuery.trim()}
                className="bg-sky-600 hover:bg-sky-700 text-white px-4 text-xs font-semibold"
              >
                {isLookingUp ? 'Fetching...' : 'Lookup & Add'}
              </Button>
            </form>

            {lookupFeedback && (
              <div
                className={`text-xs p-2 rounded-lg font-medium animate-in fade-in ${
                  lookupFeedback.startsWith('✓')
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                }`}
              >
                {lookupFeedback}
              </div>
            )}
          </div>

          {/* Edit Metadata Modal / Panel */}
          {editingItem && (
            <div className="p-4 rounded-xl border border-sky-400 dark:border-sky-800 bg-white dark:bg-slate-900 shadow-lg space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-sky-900 dark:text-sky-200">
                  Edit Reference Metadata
                </h3>
                <span className="text-[11px] text-slate-400">All changes instantly update citations</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Input
                    label="Title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    label="Authors (comma-separated: First Last, First Last)"
                    value={editAuthors}
                    onChange={(e) => setEditAuthors(e.target.value)}
                  />
                </div>
                <Input
                  label="Journal / Publisher / Site"
                  value={editJournal}
                  onChange={(e) => setEditJournal(e.target.value)}
                />
                <Input
                  label="Year of Publication"
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                />
                <Input
                  label="Volume / Issue (e.g. 42(3))"
                  value={editVolume}
                  onChange={(e) => setEditVolume(e.target.value)}
                />
                <Input
                  label="Pages (e.g. 100-115)"
                  value={editPages}
                  onChange={(e) => setEditPages(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" onClick={handleSaveEdit} className="bg-sky-600">
                  Save Changes
                </Button>
              </div>
            </div>
          )}

          {/* Formatted Bibliography Preview */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-600" /> Compiled {selectedStyle.toUpperCase()} References
              </h2>
              <span className="text-xs text-slate-400">
                Alphabetized & formatted according to official style guidelines
              </span>
            </div>

            {filteredCitations.length === 0 ? (
              <div className="text-center py-10 text-slate-400 italic text-sm">
                No citations in this collection yet. Open any research paper or article and click the extension icon to add it here.
              </div>
            ) : (
              <div className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-serif whitespace-pre-line p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 select-text">
                {compiledBibliography}
              </div>
            )}
          </div>
        </div>
      </main>

      <ConfirmationDialog
        isOpen={Boolean(deleteConfirmId)}
        title="Delete Citation"
        message="Are you sure you want to remove this citation from your library?"
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={async () => {
          if (deleteConfirmId) {
            await CiteRightService.deleteCitation(deleteConfirmId);
            setDeleteConfirmId(null);
            await loadData();
          }
        }}
      />
    </div>
  );
};
