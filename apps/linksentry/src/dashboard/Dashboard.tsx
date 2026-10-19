import React, { useState, useEffect } from 'react';
import { BookmarkItem, LinkScanResult, ScanSummary } from '@nexora/shared-types';
import { Button, IconButton, SearchInput, Badge, EmptyState, ConfirmationDialog } from '@nexora/ui';
import { downloadCsvFile, downloadJsonFile, findDuplicateUrls } from '@nexora/browser-utils';
import { LinkSentryService } from '../services/linksentry';
import {
  ShieldCheck,
  Play,
  RotateCw,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Download,
} from 'lucide-react';

export const LinkSentryDashboard: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [results, setResults] = useState<LinkScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadBookmarks = async () => {
    const list = await LinkSentryService.getBookmarks();
    setBookmarks(list);
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  const duplicates = findDuplicateUrls(bookmarks);
  const duplicateUrlsSet = new Set(duplicates.keys());

  const handleStartScan = async () => {
    setIsScanning(true);
    setProgress({ completed: 0, total: bookmarks.length });
    const collected: LinkScanResult[] = [];

    await LinkSentryService.scanBatch(bookmarks, 4, (completed, total, res) => {
      collected.push(res);
      setProgress({ completed, total });
    });

    setResults(collected);
    setIsScanning(false);
  };

  const resultMap = new Map<string, LinkScanResult>();
  results.forEach((r) => resultMap.set(r.bookmarkId, r));

  const filteredBookmarks = bookmarks.filter((bm) => {
    const q = search.toLowerCase();
    const matchSearch = bm.title.toLowerCase().includes(q) || bm.url.toLowerCase().includes(q);
    if (!matchSearch) return false;

    const res = resultMap.get(bm.id);
    if (filter === 'all') return true;
    if (filter === 'duplicates') return duplicateUrlsSet.has(bm.url);
    if (!res) return filter === 'unscanned';
    return res.status === filter;
  });

  const summary = LinkSentryService.calculateSummary(results, Array.from(duplicates.values()).reduce((s, l) => s + (l.length - 1), 0));

  const handleExportCsv = () => {
    const headers = ['Title', 'Original URL', 'Final URL', 'Status', 'HTTP Code', 'Error', 'Folder'];
    const rows = bookmarks.map((bm) => {
      const res = resultMap.get(bm.id);
      return [
        bm.title,
        bm.url,
        res?.finalUrl || '',
        res?.status || 'unscanned',
        res?.httpStatus || '',
        res?.error || '',
        bm.folderPath || '',
      ];
    });
    downloadCsvFile('linksentry_audit_report.csv', headers, rows);
  };

  const handleExportJson = () => {
    const data = bookmarks.map((bm) => ({
      ...bm,
      audit: resultMap.get(bm.id) || null,
    }));
    downloadJsonFile('linksentry_audit_report.json', data);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      {/* Top Navbar */}
      <header className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-sm">
            L
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white">
              LinkSentry Health Audit
            </h1>
            <p className="text-xs text-slate-500">
              Audit broken links, redirects, and duplicates in your bookmarks collection
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportJson}
          >
            Export JSON
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={handleStartScan}
            isLoading={isScanning}
            className="bg-teal-600 hover:bg-teal-700 focus:ring-teal-500 text-white font-medium"
            icon={<Play className="w-3.5 h-3.5 fill-current" />}
          >
            {isScanning ? `Auditing (${progress.completed}/${progress.total})` : 'Audit All Links'}
          </Button>
        </div>
      </header>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
        <button
          onClick={() => setFilter('all')}
          className={`p-3 rounded-lg border text-left transition-all ${
            filter === 'all'
              ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] text-slate-500 font-medium uppercase">Total Bookmarks</span>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{bookmarks.length}</p>
        </button>

        <button
          onClick={() => setFilter('healthy')}
          className={`p-3 rounded-lg border text-left transition-all ${
            filter === 'healthy'
              ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] text-emerald-600 font-medium uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Healthy
          </span>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {summary.healthy}
          </p>
        </button>

        <button
          onClick={() => setFilter('redirected')}
          className={`p-3 rounded-lg border text-left transition-all ${
            filter === 'redirected'
              ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] text-amber-600 font-medium uppercase flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Redirected
          </span>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">
            {summary.redirected}
          </p>
        </button>

        <button
          onClick={() => setFilter('unavailable')}
          className={`p-3 rounded-lg border text-left transition-all ${
            filter === 'unavailable'
              ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] text-rose-600 font-medium uppercase flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Broken
          </span>
          <p className="text-xl font-bold text-rose-700 dark:text-rose-400 mt-1">
            {summary.unavailable}
          </p>
        </button>

        <button
          onClick={() => setFilter('duplicates')}
          className={`p-3 rounded-lg border text-left transition-all ${
            filter === 'duplicates'
              ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] text-indigo-600 font-medium uppercase">Duplicates</span>
          <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400 mt-1">
            {summary.duplicates}
          </p>
        </button>

        <button
          onClick={() => setFilter('uncertain')}
          className={`p-3 rounded-lg border text-left transition-all ${
            filter === 'uncertain'
              ? 'border-slate-500 bg-slate-100 dark:bg-slate-800'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[11px] text-slate-500 font-medium uppercase flex items-center gap-1">
            <HelpCircle className="w-3 h-3" /> Uncertain
          </span>
          <p className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-1">
            {summary.uncertain}
          </p>
        </button>
      </div>

      {/* Main Table controls */}
      <div className="p-4 flex items-center justify-between gap-4">
        <div className="w-72">
          <SearchInput
            placeholder="Search links by title or URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
          />
        </div>
        <div className="text-xs text-slate-500">
          Showing {filteredBookmarks.length} of {bookmarks.length} links
        </div>
      </div>

      {/* Audit table */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                <th className="p-3">Title & Destination</th>
                <th className="p-3">Folder</th>
                <th className="p-3">Status</th>
                <th className="p-3">HTTP Response</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBookmarks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No bookmarks matching current filter.
                  </td>
                </tr>
              ) : (
                filteredBookmarks.map((bm) => {
                  const res = resultMap.get(bm.id);
                  return (
                    <tr
                      key={bm.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3 max-w-md">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {bm.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">{bm.url}</div>
                        {res?.finalUrl && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 truncate mt-0.5">
                            ↳ Redirects to: {res.finalUrl}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 max-w-xs truncate">
                        {bm.folderPath || 'Unorganized'}
                      </td>
                      <td className="p-3">
                        {!res ? (
                          <Badge variant="neutral" size="sm">
                            Unscanned
                          </Badge>
                        ) : res.status === 'healthy' ? (
                          <Badge variant="success" size="sm">
                            Healthy
                          </Badge>
                        ) : res.status === 'redirected' ? (
                          <Badge variant="warning" size="sm">
                            Redirected
                          </Badge>
                        ) : res.status === 'unavailable' ? (
                          <Badge variant="danger" size="sm">
                            Broken
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            {res.status}
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {res ? (
                          <div>
                            <span className="font-mono font-medium">{res.statusCodeText || '—'}</span>
                            <span className="text-[10px] text-slate-400 block">{res.durationMs}ms</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={bm.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            title="Open Link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <IconButton
                            size="sm"
                            ariaLabel="Delete Bookmark"
                            variant="danger"
                            onClick={() => setDeleteId(bm.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={Boolean(deleteId)}
        title="Delete Bookmark"
        message="Are you sure you want to delete this bookmark permanently from your browser?"
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await LinkSentryService.deleteBookmark(deleteId);
            setDeleteId(null);
            await loadBookmarks();
          }
        }}
      />
    </div>
  );
};
