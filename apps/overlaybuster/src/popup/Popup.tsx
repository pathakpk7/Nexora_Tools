import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Zap,
  Unlock,
  BookOpen,
  Settings,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { OverlayBusterService, BustReport, BusterStats } from '../services/overlaybuster';

export const OverlayBusterPopup: React.FC = () => {
  const [currentDomain, setCurrentDomain] = useState<string>('Current Website');
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [statusReport, setStatusReport] = useState<BustReport>({
    scrollUnlocked: false,
    overlaysRemoved: 0,
    blursRemoved: 0,
    elementsZapped: 0,
    captchaDetected: false,
    actions: [],
  });
  const [stats, setStats] = useState<BusterStats>({
    totalOverlaysBusted: 0,
    totalScrollsUnlocked: 0,
    totalBlursRemoved: 0,
    totalSitesCleaned: 0,
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    // 1. Fetch active tab
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const active = tabs[0];
        if (active?.id && active.url) {
          setActiveTabId(active.id);
          try {
            const parsed = new URL(active.url);
            const domain = parsed.hostname.replace(/^www\./, '');
            setCurrentDomain(domain);

            const siteConfig = await OverlayBusterService.getSiteConfig(domain);
            setIsEnabled(siteConfig.enabled);

            // Fetch live status from content script
            chrome.tabs.sendMessage(active.id, { type: 'GET_PAGE_STATUS' }, (res) => {
              if (chrome.runtime.lastError) return;
              if (res?.report) {
                setStatusReport(res.report);
              }
            });
          } catch {}
        }
      });
    }

    // 2. Fetch lifetime stats
    OverlayBusterService.getStats().then(setStats);
  }, []);

  const handleToggleDomain = async () => {
    const nextState = !isEnabled;
    setIsEnabled(nextState);
    await OverlayBusterService.saveSiteConfig({
      domain: currentDomain,
      enabled: nextState,
      autoBust: nextState,
      customSelectors: [],
    });
    setStatusMessage(nextState ? 'Protection enabled' : 'Protection paused for domain');
    setTimeout(() => setStatusMessage(''), 2500);
  };

  const handleBustPage = () => {
    if (!activeTabId) return;
    setIsProcessing(true);
    chrome.tabs.sendMessage(activeTabId, { type: 'TRIGGER_AUTO_BUST' }, (res) => {
      setIsProcessing(false);
      if (res?.report) {
        setStatusReport(res.report);
        setStatusMessage('⚡ Overlays & scroll lock cleared!');
        OverlayBusterService.getStats().then(setStats);
      } else {
        setStatusMessage('Bust pass triggered.');
      }
      setTimeout(() => setStatusMessage(''), 2500);
    });
  };

  const handleStartZap = () => {
    if (!activeTabId) return;
    chrome.tabs.sendMessage(activeTabId, { type: 'START_ZAP_MODE' });
    window.close(); // Close popup so user can click directly on page elements
  };

  const handleReaderMode = () => {
    if (!activeTabId) return;
    chrome.tabs.sendMessage(activeTabId, { type: 'TRIGGER_READER_MODE' });
    window.close();
  };

  const openDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white">OverlayBuster</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded border border-emerald-500/30">
                v1.0.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[190px]">{currentDomain}</p>
          </div>
        </div>

        <button
          onClick={openDashboard}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          title="Open Dashboard"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {/* Domain Enable / Disable Toggle Card */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Shield className={`w-4 h-4 ${isEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
            <div>
              <p className="text-xs font-semibold text-slate-200">Shield Protection</p>
              <p className="text-[10px] text-slate-400">
                {isEnabled ? 'Active on this domain' : 'Paused on this domain'}
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={handleToggleDomain}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {/* Captcha Alert if present */}
        {statusReport.captchaDetected && (
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>Interactive verification/captcha challenge detected on this page.</span>
          </div>
        )}

        {/* Live Page Statistics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-emerald-400">{statusReport.overlaysRemoved}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Overlays Busted</div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-cyan-400">
              {statusReport.scrollUnlocked ? 'Yes' : 'OK'}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Scroll Unlocked</div>
          </div>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-2.5 text-center">
            <div className="text-lg font-bold text-indigo-400">{statusReport.blursRemoved}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">Text Unblurred</div>
          </div>
        </div>

        {/* Quick Action Buttons Grid */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleBustPage}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow transition-all border border-emerald-400/30"
          >
            <Zap className="w-4 h-4 text-emerald-200" />
            <span>{isProcessing ? 'Busting...' : 'Bust Overlays'}</span>
          </button>

          <button
            onClick={handleStartZap}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 rounded-xl text-xs font-semibold shadow transition-all border border-slate-700 hover:border-slate-600"
          >
            <span className="text-red-400 font-bold">🎯</span>
            <span>Zap Element</span>
          </button>

          <button
            onClick={handleBustPage}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700"
          >
            <Unlock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Unlock Scroll</span>
          </button>

          <button
            onClick={handleReaderMode}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Clean Reader</span>
          </button>
        </div>

        {/* Status Notification Toast */}
        {statusMessage && (
          <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-medium text-center animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Action History / Page Report */}
        {statusReport.actions.length > 0 && (
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Page Activity</div>
            {statusReport.actions.slice(-3).map((act, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <span className="text-emerald-400">•</span>
                <span className="truncate">{act}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats Ticker */}
      <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div>
          <span>Total Overlays Busted: </span>
          <span className="font-semibold text-emerald-400">{stats.totalOverlaysBusted}</span>
        </div>
        <div>
          <span>Sites Cleaned: </span>
          <span className="font-semibold text-cyan-400">{stats.totalSitesCleaned}</span>
        </div>
      </div>
    </div>
  );
};
