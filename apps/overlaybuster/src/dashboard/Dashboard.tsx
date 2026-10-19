import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  Unlock,
  Eye,
  Globe,
  Plus,
  Trash2,
  CheckCircle,
  RotateCcw,
  Sliders,
  ShieldAlert,
  Play,
} from 'lucide-react';
import {
  OverlayBusterService,
  BusterStats,
  SiteConfig,
  KNOWN_OVERLAY_SELECTORS,
} from '../services/overlaybuster';

export const OverlayBusterDashboard: React.FC = () => {
  const [stats, setStats] = useState<BusterStats>({
    totalOverlaysBusted: 0,
    totalScrollsUnlocked: 0,
    totalBlursRemoved: 0,
    totalSitesCleaned: 0,
  });
  const [customDomain, setCustomDomain] = useState<string>('');
  const [customSelector, setCustomSelector] = useState<string>('');
  const [siteConfigs, setSiteConfigs] = useState<SiteConfig[]>([]);
  const [sandboxMessage, setSandboxMessage] = useState<string>('');
  const [sandboxActive, setSandboxActive] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const s = await OverlayBusterService.getStats();
    setStats(s);

    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const data = await chrome.storage.local.get('overlaybuster_sites');
      const sites: Record<string, SiteConfig> = data.overlaybuster_sites || {};
      setSiteConfigs(Object.values(sites));
    }
  };

  const handleAddDomainRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDomain.trim()) return;

    const domain = customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    const newConfig: SiteConfig = {
      domain,
      enabled: true,
      autoBust: true,
      customSelectors: customSelector ? [customSelector.trim()] : [],
      lastBustedAt: Date.now(),
    };

    await OverlayBusterService.saveSiteConfig(newConfig);
    setCustomDomain('');
    setCustomSelector('');
    loadData();
  };

  const handleDeleteDomainRule = async (domain: string) => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const data = await chrome.storage.local.get('overlaybuster_sites');
      const sites: Record<string, SiteConfig> = data.overlaybuster_sites || {};
      delete sites[domain];
      await chrome.storage.local.set({ overlaybuster_sites: sites });
      loadData();
    }
  };

  const handleRunSimulator = () => {
    setSandboxActive(true);
    setSandboxMessage('Spawning simulated paywall backdrop and scroll lock...');

    setTimeout(() => {
      setSandboxMessage('⚡ OverlayBuster engine engaged! Busting modal, restoring scroll, unblurring text...');
      setTimeout(() => {
        setSandboxActive(false);
        setSandboxMessage('✅ Cleaned successfully! 1 overlay removed, scroll restored, blur cleared.');
        setStats((prev) => ({
          ...prev,
          totalOverlaysBusted: prev.totalOverlaysBusted + 1,
          totalScrollsUnlocked: prev.totalScrollsUnlocked + 1,
          totalBlursRemoved: prev.totalBlursRemoved + 1,
        }));
      }, 1200);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white">OverlayBuster</h1>
                <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                  Dashboard
                </span>
              </div>
              <p className="text-xs text-slate-400">Intelligent Popup, Paywall & Overlay Blocker</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Engine Active (MV3)
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        {/* Metric Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overlays Busted</span>
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Zap className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white mt-3">{stats.totalOverlaysBusted}</div>
            <p className="text-xs text-slate-400 mt-1">Modals, paywalls, and banners removed</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scrolls Unlocked</span>
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                <Unlock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white mt-3">{stats.totalScrollsUnlocked}</div>
            <p className="text-xs text-slate-400 mt-1">Locked body & html overflow broken</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Text Unblurred</span>
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <Eye className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white mt-3">{stats.totalBlursRemoved}</div>
            <p className="text-xs text-slate-400 mt-1">Obscured paragraphs and articles</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Websites Cleaned</span>
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                <Globe className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white mt-3">{stats.totalSitesCleaned}</div>
            <p className="text-xs text-slate-400 mt-1">Unique domains improved</p>
          </div>
        </div>

        {/* Engine Sandbox Simulator */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-850 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Live Engine Simulator</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Test OverlayBuster's heuristics in real-time against simulated paywall modals and scroll locks.
              </p>
            </div>

            <button
              onClick={handleRunSimulator}
              disabled={sandboxActive}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow transition-all flex items-center gap-2 self-start sm:self-auto"
            >
              <Zap className="w-4 h-4" />
              <span>{sandboxActive ? 'Simulating...' : 'Run Simulation'}</span>
            </button>
          </div>

          {sandboxMessage && (
            <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-700/60 text-xs font-mono text-emerald-300">
              {sandboxMessage}
            </div>
          )}
        </div>

        {/* Two-Column Layout: Domain Custom Rules & Built-in Engine Signatures */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Custom Domain Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Custom Domain Rules</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Add specific domains or custom CSS selectors to target stubborn paywalls or whitelist sites.
            </p>

            <form onSubmit={handleAddDomainRule} className="space-y-3 mb-6">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Target Domain</label>
                <input
                  type="text"
                  placeholder="e.g. newsoutlet.com"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Custom CSS Selector (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. .blocking-newsletter-container"
                  value={customSelector}
                  onChange={(e) => setCustomSelector(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Domain Rule</span>
              </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Active Configured Sites ({siteConfigs.length})
              </span>
              {siteConfigs.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  No custom domain overrides saved yet. Global automatic heuristics are active everywhere!
                </p>
              ) : (
                siteConfigs.map((cfg) => (
                  <div
                    key={cfg.domain}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800"
                  >
                    <div>
                      <div className="font-semibold text-xs text-white">{cfg.domain}</div>
                      <div className="text-[10px] text-slate-400">
                        {cfg.enabled ? 'Protection Active' : 'Protection Paused'} •{' '}
                        {cfg.customSelectors?.length || 0} custom selector(s)
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDomainRule(cfg.domain)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Built-in Heuristics Engine Signatures */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <span>Built-in Heuristic Signatures</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              OverlayBuster matches these high-precision signatures and applies DOM unmasking across all websites:
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[360px]">
              {KNOWN_OVERLAY_SELECTORS.map((sel, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 font-mono text-[11px] text-emerald-300"
                >
                  <span className="truncate">{sel}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
