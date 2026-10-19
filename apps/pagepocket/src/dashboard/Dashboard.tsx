import React, { useState, useEffect } from 'react';
import { PagePocketItem } from '@nexora/shared-types';
import { Button, IconButton, SearchInput, Badge, EmptyState, ConfirmationDialog } from '@nexora/ui';
import { downloadJsonFile, downloadMarkdownFile } from '@nexora/browser-utils';
import { PagePocketService, DEFAULT_PROJECTS } from '../services/pagepocket';
import {
  Bookmark,
  Highlighter,
  FileText,
  Star,
  Trash2,
  ExternalLink,
  Download,
  BookOpen,
  Folder,
  FolderPlus,
  Quote,
  Sparkles,
  Copy,
  Check,
  AlertTriangle,
  Edit3,
} from 'lucide-react';

export const PagePocketDashboard: React.FC = () => {
  const [items, setItems] = useState<PagePocketItem[]>([]);
  const [projects, setProjects] = useState<string[]>(DEFAULT_PROJECTS);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<PagePocketItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // New project modal / inline
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Editing annotation state
  const [isEditingAnnotation, setIsEditingAnnotation] = useState(false);
  const [annotationDraft, setAnnotationDraft] = useState('');

  // Citation style in viewer
  const [citationStyle, setCitationStyle] = useState<'apa' | 'mla' | 'ieee'>('apa');
  const [copiedCitation, setCopiedCitation] = useState(false);

  const loadData = async () => {
    const [allItems, projList] = await Promise.all([
      PagePocketService.getAllItems(),
      PagePocketService.getProjects(),
    ]);

    setItems(allItems);
    setProjects(projList);

    if (!selectedItem && allItems.length > 0) {
      setSelectedItem(allItems[0]);
      setAnnotationDraft(allItems[0].annotation || allItems[0].userNotes || '');
    } else if (selectedItem) {
      const refreshed = allItems.find((i) => i.id === selectedItem.id);
      setSelectedItem(refreshed || (allItems.length > 0 ? allItems[0] : null));
      if (refreshed) {
        setAnnotationDraft(refreshed.annotation || refreshed.userNotes || '');
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const updated = await PagePocketService.addProject(newProjectName.trim());
    setProjects(updated);
    setSelectedProject(newProjectName.trim());
    setNewProjectName('');
    setIsAddingProject(false);
  };

  const handleSaveAnnotation = async () => {
    if (!selectedItem) return;
    const updated: PagePocketItem = {
      ...selectedItem,
      annotation: annotationDraft.trim() || undefined,
      userNotes: annotationDraft.trim() || undefined,
      updatedAt: Date.now(),
    };
    await PagePocketService.updateItem(updated);
    setSelectedItem(updated);
    setIsEditingAnnotation(false);
    await loadData();
  };

  const handleReassignProject = async (proj: string) => {
    if (!selectedItem) return;
    const updated: PagePocketItem = {
      ...selectedItem,
      project: proj,
      updatedAt: Date.now(),
    };
    await PagePocketService.updateItem(updated);
    setSelectedItem(updated);
    await loadData();
  };

  const handleCopyCitation = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  // Filter items by search, type, and project
  const filteredItems = items.filter((item) => {
    // Project filter
    if (selectedProject !== 'all') {
      const p = item.project || 'General Research';
      if (p.toLowerCase() !== selectedProject.toLowerCase()) return false;
    }

    // Type filter
    if (selectedType === 'duplicates') {
      if (!item.isDuplicate) return false;
    } else if (selectedType === 'favorites') {
      if (!item.isFavorite) return false;
    } else if (selectedType !== 'all') {
      if (item.type !== selectedType) return false;
    }

    // Search query
    const q = search.toLowerCase();
    if (!q) return true;

    return (
      item.title.toLowerCase().includes(q) ||
      item.url.toLowerCase().includes(q) ||
      (item.selectedText && item.selectedText.toLowerCase().includes(q)) ||
      (item.annotation && item.annotation.toLowerCase().includes(q)) ||
      (item.userNotes && item.userNotes.toLowerCase().includes(q)) ||
      (item.project && item.project.toLowerCase().includes(q)) ||
      item.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const handleExportJson = () => {
    const filename =
      selectedProject === 'all'
        ? 'contextclip_all_research.json'
        : `contextclip_${selectedProject.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
    downloadJsonFile(filename, filteredItems);
  };

  const handleExportResearchDoc = () => {
    const doc = PagePocketService.generateResearchDocument(
      filteredItems,
      selectedProject === 'all' ? undefined : selectedProject
    );
    const filename =
      selectedProject === 'all'
        ? 'research_synthesis_collection.md'
        : `${selectedProject.toLowerCase().replace(/[^a-z0-9]/g, '_')}_synthesis.md`;
    downloadMarkdownFile(filename, doc);
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      {/* Sidebar navigation */}
      <aside className="w-84 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
        {/* Brand */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-purple-600 flex items-center justify-center text-white font-bold text-xs">
              P
            </div>
            <div>
              <span className="font-semibold text-sm">PagePocket</span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-medium">
                ContextClip Studio
              </span>
            </div>
          </div>
          <Badge variant="info">{items.length} notes</Badge>
        </div>

        {/* Project Selector Section */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <Folder className="w-3.5 h-3.5 text-purple-500" /> Research Projects
            </span>
            <button
              onClick={() => setIsAddingProject(!isAddingProject)}
              className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5"
            >
              <FolderPlus className="w-3 h-3" /> {isAddingProject ? 'Cancel' : 'New'}
            </button>
          </div>

          {isAddingProject && (
            <form onSubmit={handleCreateProject} className="flex gap-1.5 pt-1 animate-in fade-in">
              <input
                type="text"
                placeholder="Project title (e.g. GATE Prep)"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="flex-1 text-xs px-2 py-1 rounded border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900"
                autoFocus
              />
              <Button size="sm" variant="primary" type="submit" className="h-7 px-2 text-xs bg-purple-600">
                Add
              </Button>
            </form>
          )}

          {/* Project Pills */}
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            <button
              onClick={() => setSelectedProject('all')}
              className={`text-[11px] px-2.5 py-1 rounded-md transition-all font-medium ${
                selectedProject === 'all'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All ({items.length})
            </button>
            {projects.map((proj) => {
              const count = items.filter(
                (i) => (i.project || 'General Research').toLowerCase() === proj.toLowerCase()
              ).length;
              return (
                <button
                  key={proj}
                  onClick={() => setSelectedProject(proj)}
                  className={`text-[11px] px-2.5 py-1 rounded-md transition-all font-medium ${
                    selectedProject.toLowerCase() === proj.toLowerCase()
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {proj} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter pills & Search */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 space-y-2">
          <SearchInput
            placeholder="Search notes, quotes, citations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
          <div className="flex items-center gap-1 overflow-x-auto text-xs pb-0.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'highlight', label: 'Highlights' },
              { id: 'page', label: 'Pages' },
              { id: 'article', label: 'Articles' },
              { id: 'duplicates', label: 'Duplicates' },
              { id: 'favorites', label: 'Starred' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`px-2 py-0.5 rounded-md whitespace-nowrap text-[11px] transition-colors ${
                  selectedType === t.id
                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredItems.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No saved notes found"
                description="Highlight paragraphs on webpages or clip pages to populate this project collection."
              />
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedItem(item);
                  setAnnotationDraft(item.annotation || item.userNotes || '');
                }}
                className={`w-full text-left p-3 rounded-xl text-xs transition-colors border ${
                  selectedItem?.id === item.id
                    ? 'border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 shadow-2xs'
                    : 'border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1">
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                      {item.type === 'highlight' && <Highlighter className="w-3 h-3 text-purple-500" />}
                      {item.type === 'page' && <Bookmark className="w-3 h-3 text-blue-500" />}
                      {item.type === 'article' && <FileText className="w-3 h-3 text-emerald-500" />}
                      {item.project || 'General'}
                    </span>
                    {item.isDuplicate && (
                      <span className="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-1 py-0.2 rounded font-bold">
                        DUP
                      </span>
                    )}
                  </div>
                  {item.isFavorite && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                </div>

                <h4 className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{item.title}</h4>

                {item.selectedText && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-1 italic font-serif">
                    "{item.selectedText}"
                  </p>
                )}

                {item.annotation && (
                  <p className="text-[10px] text-purple-700 dark:text-purple-300 line-clamp-1 mt-1 font-medium">
                    ✎ {item.annotation}
                  </p>
                )}

                <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                  <span>{item.domain}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Structured Export Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900">
          <span className="text-[11px] text-slate-500 font-medium">Export Collection:</span>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={handleExportJson} className="h-7 text-xs">
              JSON
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={handleExportResearchDoc}
              className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium flex items-center gap-1"
              title="Export structured research synthesis with TOC, citations & notes"
            >
              <Download className="w-3 h-3" /> Research .MD
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Item Detail Panel */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
        {selectedItem ? (
          <>
            <header className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="info">{selectedItem.type}</Badge>
                  {/* Project Selector Badge in Header */}
                  <select
                    value={selectedItem.project || 'General Research'}
                    onChange={(e) => handleReassignProject(e.target.value)}
                    className="text-xs px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold focus:outline-none"
                  >
                    {projects.map((p) => (
                      <option key={p} value={p}>
                        📂 {p}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-400">{selectedItem.domain}</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-400">
                    {new Date(selectedItem.createdAt).toLocaleString()}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white line-clamp-2">
                  {selectedItem.title}
                </h1>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <IconButton
                  size="md"
                  ariaLabel="Toggle Favorite"
                  onClick={async () => {
                    await PagePocketService.toggleFavorite(selectedItem.id);
                    await loadData();
                  }}
                >
                  <Star
                    className={`w-4 h-4 ${
                      selectedItem.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                    }`}
                  />
                </IconButton>
                <a
                  href={selectedItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Source <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <IconButton
                  size="md"
                  ariaLabel="Delete Item"
                  variant="danger"
                  onClick={() => setDeleteConfirmId(selectedItem.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </IconButton>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 max-w-4xl space-y-6">
              {/* Duplicate Notice */}
              {selectedItem.isDuplicate && (
                <div className="p-3 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>
                    This excerpt was identified as a duplicate note from another research session.
                  </span>
                </div>
              )}

              {/* Highlight Callout */}
              {selectedItem.selectedText && (
                <div className="p-5 rounded-2xl border-l-4 border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 shadow-2xs space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
                    <Quote className="w-3 h-3" /> Highlighted Passage
                  </span>
                  <div className="text-slate-900 dark:text-slate-100 text-base leading-relaxed italic font-serif">
                    "{selectedItem.selectedText}"
                  </div>
                </div>
              )}

              {/* Personal Annotations Section */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-purple-500" /> Personal Annotation & Commentary
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditingAnnotation) handleSaveAnnotation();
                      else setIsEditingAnnotation(true);
                    }}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                  >
                    {isEditingAnnotation ? 'Save Annotation' : 'Edit Annotation'}
                  </button>
                </div>

                {isEditingAnnotation ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      rows={3}
                      value={annotationDraft}
                      onChange={(e) => setAnnotationDraft(e.target.value)}
                      placeholder="Add personal thoughts, critical points, or analysis..."
                      className="w-full text-xs p-2.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setIsEditingAnnotation(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" variant="primary" onClick={handleSaveAnnotation} className="bg-purple-600">
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {selectedItem.annotation || selectedItem.userNotes || (
                      <span className="italic text-slate-400">No annotation added yet. Click edit to add your thoughts.</span>
                    )}
                  </p>
                )}
              </div>

              {/* Smart Summary if available */}
              {selectedItem.summary && (
                <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-2">
                  <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Extracted Summary
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                    {selectedItem.summary}
                  </p>
                </div>
              )}

              {/* Citation Generator Panel */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Quote className="w-3.5 h-3.5 text-purple-500" /> Academic Citation Generator
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {(['apa', 'mla', 'ieee'] as const).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setCitationStyle(style)}
                        className={`text-xs px-2 py-0.5 rounded-md font-bold uppercase transition-colors ${
                          citationStyle === style
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs px-2 ml-1"
                      onClick={() => {
                        const cite =
                          selectedItem.citation?.[citationStyle] ||
                          `*${selectedItem.title}*. [Online]. Available: ${selectedItem.url}`;
                        handleCopyCitation(cite);
                      }}
                      icon={
                        copiedCitation ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )
                      }
                    >
                      {copiedCitation ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedItem.citation?.[citationStyle] ||
                    `*${selectedItem.title}*. [Online]. Available: ${selectedItem.url}`}
                </div>
              </div>

              {/* Extracted clean article reader view */}
              {selectedItem.cleanArticleText && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-500" /> Clean Reader View
                  </h3>
                  <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line p-4 rounded-xl bg-slate-50/60 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 font-serif">
                    {selectedItem.cleanArticleText}
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedItem.tags && selectedItem.tags.length > 0 && (
                <div className="flex items-center gap-1.5 pt-2">
                  <span className="text-xs text-slate-400 font-medium">Tags:</span>
                  {selectedItem.tags.map((t, idx) => (
                    <Badge key={idx} size="sm" variant="neutral">
                      #{t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <EmptyState
              title="No Item Selected"
              description="Select a note or highlight from your research collection."
            />
          </div>
        )}
      </main>

      <ConfirmationDialog
        isOpen={Boolean(deleteConfirmId)}
        title="Delete Saved Note"
        message="Are you sure you want to remove this research note from PagePocket?"
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={async () => {
          if (deleteConfirmId) {
            await PagePocketService.deleteItem(deleteConfirmId);
            setDeleteConfirmId(null);
            await loadData();
          }
        }}
      />
    </div>
  );
};
