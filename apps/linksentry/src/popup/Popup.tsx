import React, { useState, useEffect } from 'react';
import { BookmarkItem, LinkScanResult, ScanSummary } from '@nexora/shared-types';
import { Button, IconButton, Badge, EmptyState } from '@nexora/ui';
import { findDuplicateUrls } from '@nexora/browser-utils';
import { LinkSentryService } from '../services/linksentry';
import { ShieldCheck, Play, CheckCircle2, AlertTriangle, XCircle, HelpCircle, ExternalLink } from 'lucide-react';

export const LinkSentryPopup: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [results, setResults] = useState<LinkScanResult[]>([]);

  useEffect(() => {
    LinkSentryService.getBookmarks().then(setBookmarks);
  }, []);

  const duplicates = findDuplicateUrls(bookmarks);
  const duplicateCount = Array.from(duplicates.values()).reduce((sum, list) => sum + (list.length - 1), 0);

  const startScan = async () => {
    setIsScanning(true);
    setProgress({ completed: 0, total: bookmarks.length });
    const collectedResults: LinkScanResult[] = [];

    await LinkSentryService.scanBatch(bookmarks, 3, (completed, total, res) => {
      collectedResults.push(res);
      setProgress({ completed, total });
    });

    setResults(collectedResults);
    const sum = LinkSentryService.calculateSummary(collectedResults, duplicateCount);
    setSummary(sum);
    setIsScanning(false);
  };

  const openDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 select-none">
      <header className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-teal-600 flex items-center justify-center text-white font-bold text-xs">
            L
          </div>
          <span className="font-semibold text-sm tracking-tight text-slate-800 dark:text-slate-100">
            LinkSentry
          </span>
          <Badge size="sm" variant="info">
            {bookmarks.length} links
          </Badge>
        </div>
        <IconButton size="sm" ariaLabel="Open Audit Dashboard" onClick={openDashboard}>
          <ExternalLink className="w-3.5 h-3.5" />
        </IconButton>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Quick status / start card */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Bookmark Collection Health
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {bookmarks.length} bookmarks found across your browser
              </p>
            </div>
            <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          </div>

          {isScanning ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Checking link integrity...</span>
                <span>
                  {progress.completed} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-teal-600 h-full transition-all duration-200"
                  style={{ width: `${(progress.completed / (progress.total || 1)) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={startScan}
              className="w-full justify-center bg-teal-600 hover:bg-teal-700 text-white focus:ring-teal-500 font-medium h-8"
              icon={<Play className="w-3.5 h-3.5 fill-current" />}
            >
              Scan Bookmarks Now
            </Button>
          )}
        </div>

        {/* Scan Summary results */}
        {summary && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4" /> Healthy
              </div>
              <span className="font-bold text-emerald-800 dark:text-emerald-200">{summary.healthy}</span>
            </div>

            <div className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4" /> Redirects
              </div>
              <span className="font-bold text-amber-800 dark:text-amber-200">{summary.redirected}</span>
            </div>

            <div className="p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                <XCircle className="w-4 h-4" /> Broken
              </div>
              <span className="font-bold text-rose-800 dark:text-rose-200">{summary.unavailable}</span>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <HelpCircle className="w-4 h-4" /> Uncertain
              </div>
              <span className="font-bold text-slate-700 dark:text-slate-300">{summary.uncertain}</span>
            </div>
          </div>
        )}

        {/* Duplicates info */}
        {duplicateCount > 0 && (
          <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 flex items-center justify-between text-xs">
            <span className="text-amber-800 dark:text-amber-300 font-medium">
              {duplicateCount} duplicate URL{duplicateCount > 1 ? 's' : ''} detected
            </span>
            <Button size="sm" variant="outline" onClick={openDashboard} className="h-6 text-[11px] px-2">
              Review
            </Button>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-center">
        <button
          onClick={openDashboard}
          className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium inline-flex items-center gap-1"
        >
          View Full Link Audit Report & Export <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
