import React, { useState, useEffect } from 'react';
import { PagePocketItem } from '@nexora/shared-types';
import { Button, IconButton, Badge, Input } from '@nexora/ui';
import { generateAPACitation, generateMLACitation, generateIEEECitation, BibliographicMetadata } from '@nexora/browser-utils';
import { PagePocketService, DEFAULT_PROJECTS } from '../services/pagepocket';
import {
  Bookmark,
  Highlighter,
  FileText,
  CheckCircle2,
  ExternalLink,
  FolderPlus,
  Sparkles,
  AlertTriangle,
  Copy,
  Check,
  Quote,
  Plus,
} from 'lucide-react';

export const PagePocketPopup: React.FC = () => {
  const [tabInfo, setTabInfo] = useState<{
    url: string;
    title: string;
    favIconUrl?: string;
    domain: string;
    selectedText?: string;
    metadata?: BibliographicMetadata;
  } | null>(null);

  const [projects, setProjects] = useState<string[]>(DEFAULT_PROJECTS);
  const [selectedProject, setSelectedProject] = useState<string>('GATE Preparation');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const [highlightText, setHighlightText] = useState('');
  const [annotation, setAnnotation] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [smartSummary, setSmartSummary] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [clipMode, setClipMode] = useState<'highlight' | 'page' | 'article'>('highlight');

  // Duplicate detection state
  const [duplicateInfo, setDuplicateInfo] = useState<{ isDuplicate: boolean; existingItem?: PagePocketItem }>({
    isDuplicate: false,
  });

  // Citation state
  const [citationStyle, setCitationStyle] = useState<'apa' | 'mla' | 'ieee'>('apa');
  const [copiedCitation, setCopiedCitation] = useState(false);

  useEffect(() => {
    // Load projects and current tab
    PagePocketService.getProjects().then((projList) => {
      setProjects(projList);
      if (projList.length > 0) setSelectedProject(projList[0]);
    });

    PagePocketService.getCurrentTabInfo().then(async (info) => {
      setTabInfo(info);
      if (info.selectedText) {
        setHighlightText(info.selectedText);
        setClipMode('highlight');

        // Check for duplicates
        const dup = await PagePocketService.checkForDuplicate(info.url, info.selectedText);
        setDuplicateInfo(dup);
      } else {
        setClipMode('page');
      }
    });
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const updated = await PagePocketService.addProject(newProjectName.trim());
    setProjects(updated);
    setSelectedProject(newProjectName.trim());
    setNewProjectName('');
    setIsCreatingProject(false);
  };

  const handleGenerateSummary = () => {
    const textToSummarize = highlightText || tabInfo?.title || '';
    if (!textToSummarize) return;
    const summary = PagePocketService.generateSmartSummary(textToSummarize);
    setSmartSummary(summary);
  };

  const computeCitation = () => {
    if (!tabInfo) return '';
    const meta: BibliographicMetadata = tabInfo.metadata || {
      title: tabInfo.title,
      authors: [],
      journalOrPublisher: tabInfo.domain,
      url: tabInfo.url,
      accessDate: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      sourceType: 'website',
      verifiedFields: {
        title: Boolean(tabInfo.title),
        authors: false,
        publicationDate: false,
        journalOrPublisher: Boolean(tabInfo.domain),
        doi: false,
      },
      inferredFields: {
        year: true,
        sourceType: true,
      },
    };

    if (citationStyle === 'apa') return generateAPACitation(meta);
    if (citationStyle === 'mla') return generateMLACitation(meta);
    return generateIEEECitation(meta, 1);
  };

  const currentCitation = computeCitation();

  const handleCopyCitation = () => {
    if (!currentCitation) return;
    navigator.clipboard.writeText(currentCitation);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  const handleSave = async () => {
    if (!tabInfo || !tabInfo.url) return;

    let cleanArticleText = undefined;
    if (clipMode === 'article') {
      const extracted = await PagePocketService.extractCurrentArticle();
      cleanArticleText = extracted?.cleanArticleText;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (selectedProject && !tags.includes(selectedProject.toLowerCase())) {
      tags.push(selectedProject.toLowerCase());
    }

    const newItem: PagePocketItem = {
      id: `pp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      url: tabInfo.url,
      title: tabInfo.title || 'Untitled Webpage',
      domain: tabInfo.domain,
      favIconUrl: tabInfo.favIconUrl,
      type: clipMode,
      readingStatus: 'unread',
      isFavorite: false,
      userNotes: annotation.trim() || undefined,
      tags: tags.length > 0 ? tags : ['saved'],
      selectedText: clipMode === 'highlight' ? highlightText.trim() : undefined,
      cleanArticleText,
      // ContextClip additions
      project: selectedProject,
      annotation: annotation.trim() || undefined,
      summary: smartSummary.trim() || undefined,
      isDuplicate: duplicateInfo.isDuplicate,
      citation: currentCitation
        ? {
            apa: tabInfo.metadata ? generateAPACitation(tabInfo.metadata) : currentCitation,
            mla: tabInfo.metadata ? generateMLACitation(tabInfo.metadata) : currentCitation,
            ieee: tabInfo.metadata ? generateIEEECitation(tabInfo.metadata, 1) : currentCitation,
          }
        : undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await PagePocketService.saveItem(newItem);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 2500);
  };

  const openDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 select-none">
      {/* Header */}
      <header className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-purple-600 flex items-center justify-center text-white font-bold text-xs">
            P
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              PagePocket <Badge size="sm" variant="info">ContextClip</Badge>
            </span>
          </div>
        </div>
        <IconButton size="sm" ariaLabel="Open Research Studio" onClick={openDashboard} title="Open Studio">
          <ExternalLink className="w-3.5 h-3.5" />
        </IconButton>
      </header>

      {/* Mode selection */}
      <div className="grid grid-cols-3 p-1.5 bg-slate-100/70 dark:bg-slate-800/40 mx-3 mt-2.5 rounded-lg gap-1 border border-slate-200/60 dark:border-slate-800">
        <button
          onClick={() => setClipMode('highlight')}
          className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
            clipMode === 'highlight'
              ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs font-semibold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          title="Clip selected paragraph or highlight"
        >
          <Highlighter className="w-3 h-3" /> Highlight
          {tabInfo?.selectedText && (
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setClipMode('page')}
          className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
            clipMode === 'page'
              ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs font-semibold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Bookmark className="w-3 h-3" /> Full Page
        </button>
        <button
          onClick={() => setClipMode('article')}
          className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
            clipMode === 'article'
              ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs font-semibold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-3 h-3" /> Clean Reader
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-2.5 space-y-3">
        {/* Duplicate Note Warning */}
        {duplicateInfo.isDuplicate && (
          <div className="p-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">
              <span className="font-bold">Duplicate Note:</span> You already clipped this passage in{' '}
              <strong>"{duplicateInfo.existingItem?.project || 'Library'}"</strong> on{' '}
              {new Date(duplicateInfo.existingItem?.createdAt || 0).toLocaleDateString()}. Saving again will create a new reference.
            </div>
          </div>
        )}

        {/* Source info */}
        <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
            {tabInfo?.title || 'Loading current webpage...'}
          </p>
          <p className="text-[10px] text-slate-400 truncate mt-0.5">{tabInfo?.url}</p>
        </div>

        {/* ContextClip Project Picker */}
        <div className="p-2.5 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
              <FolderPlus className="w-3.5 h-3.5 text-purple-600" /> Research Project:
            </span>
            <button
              type="button"
              onClick={() => setIsCreatingProject(!isCreatingProject)}
              className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-medium"
            >
              {isCreatingProject ? 'Cancel' : '+ New Project'}
            </button>
          </div>

          {isCreatingProject ? (
            <form onSubmit={handleCreateProject} className="flex gap-1.5 pt-1">
              <input
                type="text"
                placeholder="e.g. GATE Prep, Thesis"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="flex-1 text-xs px-2 py-1 rounded border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                autoFocus
              />
              <Button size="sm" variant="primary" type="submit" className="h-7 px-2 text-xs bg-purple-600">
                Add
              </Button>
            </form>
          ) : (
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded-md border border-purple-200 dark:border-purple-800/80 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
            >
              {projects.map((proj) => (
                <option key={proj} value={proj}>
                  📂 {proj}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Highlighted text passage */}
        {clipMode === 'highlight' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Highlighter className="w-3 h-3 text-purple-500" />
                <span>Captured Highlight</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateSummary}
                className="text-[10px] text-purple-600 hover:underline flex items-center gap-0.5"
                title="Generate smart summary"
              >
                <Sparkles className="w-2.5 h-2.5" /> Summarize
              </button>
            </div>
            <textarea
              rows={3}
              placeholder="Highlight text on webpage or type quote here..."
              value={highlightText}
              onChange={(e) => setHighlightText(e.target.value)}
              className="w-full text-xs p-2 rounded-lg border border-purple-200 dark:border-slate-700 bg-purple-50/20 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 font-serif leading-relaxed"
            />
          </div>
        )}

        {/* Smart summary display if generated */}
        {smartSummary && (
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <span className="font-semibold text-purple-600 dark:text-purple-400 text-[11px] flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Extracted Summary:
            </span>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {smartSummary}
            </p>
          </div>
        )}

        {/* Personal Annotations */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Personal Annotation (Context & Commentary)
          </label>
          <textarea
            rows={2}
            placeholder="Add personal thoughts, critical points, or why this matters..."
            value={annotation}
            onChange={(e) => setAnnotation(e.target.value)}
            className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* Citation Generator Preview */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Quote className="w-3 h-3 text-purple-500" /> Page Citation
            </span>
            <div className="flex items-center gap-1">
              {(['apa', 'mla', 'ieee'] as const).map((style) => (
                <button
                  key={style}
                  type="button"
                  onClick={() => setCitationStyle(style)}
                  className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                    citationStyle === style
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {style}
                </button>
              ))}
              <button
                type="button"
                onClick={handleCopyCitation}
                className="p-1 text-slate-400 hover:text-purple-600 transition-colors ml-1"
                title="Copy citation"
              >
                {copiedCitation ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono line-clamp-2 leading-relaxed">
            {currentCitation}
          </p>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Tags (comma separated)
          </label>
          <input
            type="text"
            placeholder="e.g. algorithms, gate2027, review"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Save Action Footer */}
      <footer className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <Button
          size="sm"
          variant="primary"
          className="w-full justify-center bg-purple-600 hover:bg-purple-700 text-white font-semibold h-8"
          onClick={handleSave}
          icon={isSaved ? <CheckCircle2 className="w-4 h-4 text-white" /> : undefined}
        >
          {isSaved ? 'Note Clipped to Project!' : `Save to ${selectedProject}`}
        </Button>
      </footer>
    </div>
  );
};
