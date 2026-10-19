import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  Unlock,
  Eye,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Lock,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import { OverlayBusterService } from '../services/overlaybuster';

export const DemoPage: React.FC = () => {
  const [hasPaywallModal, setHasPaywallModal] = useState<boolean>(true);
  const [hasNewsletterPopup, setHasNewsletterPopup] = useState<boolean>(false);
  const [isTextBlurred, setIsTextBlurred] = useState<boolean>(true);
  const [isScrollLocked, setIsScrollLocked] = useState<boolean>(true);
  const [logMessages, setLogMessages] = useState<string[]>([
    'Demo site initialized: Paywall modal active, body scroll locked, text blurred.',
  ]);

  // Sync scroll lock on document.body when state changes
  useEffect(() => {
    if (isScrollLocked) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    }
  }, [isScrollLocked]);

  const addLog = (msg: string) => {
    setLogMessages((prev) => [msg, ...prev.slice(0, 9)]);
  };

  const handleSpawnPaywall = () => {
    setHasPaywallModal(true);
    setIsScrollLocked(true);
    addLog('🔒 Spawned full-screen paywall modal & locked page scroll.');
  };

  const handleSpawnNewsletter = () => {
    setHasNewsletterPopup(true);
    addLog('📬 Spawned intrusive newsletter subscription overlay.');
  };

  const handleToggleBlur = () => {
    setIsTextBlurred((prev) => !prev);
    addLog(!isTextBlurred ? '🌫️ Applied CSS blur filter to article paragraphs.' : '👁️ Text blur cleared.');
  };

  const handleManualBust = () => {
    // Run real OverlayBuster engine on document
    const report = OverlayBusterService.scanAndBust(document);
    setHasPaywallModal(false);
    setHasNewsletterPopup(false);
    setIsScrollLocked(false);
    setIsTextBlurred(false);

    addLog(
      `⚡ OverlayBuster executed! Removed ${report.overlaysRemoved} overlay(s), unblurred ${report.blursRemoved} paragraph(s), and restored page scrolling.`
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
      {/* Top Test Control Toolbar */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 shadow-lg">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">OverlayBuster Live Test Site</span>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                  Simulation Arena
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Interactive verification sandbox for paywall modals, blurs, and scroll locks
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSpawnPaywall}
              disabled={hasPaywallModal}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Spawn Paywall</span>
            </button>

            <button
              onClick={handleSpawnNewsletter}
              disabled={hasNewsletterPopup}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <span>Spawn Newsletter</span>
            </button>

            <button
              onClick={handleToggleBlur}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isTextBlurred ? 'Clear Blur' : 'Apply Blur'}</span>
            </button>

            <button
              onClick={handleManualBust}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5 border border-emerald-400/30"
            >
              <Zap className="w-4 h-4 text-emerald-200" />
              <span>⚡ Bust Overlays Now</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area: Article & Live Telemetry */}
      <main className="max-w-5xl mx-auto px-6 py-8 flex-1 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Article Column */}
        <article className="lg:col-span-2 space-y-5 bg-slate-900 border border-slate-800 rounded-2xl p-7 shadow-sm">
          <div className="space-y-2 border-b border-slate-800 pb-5">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Engineering & Technology
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              Autonomous Browser Intelligence: Building Resilient Web Utilities
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
              <span>By Nexora Labs</span>
              <span>•</span>
              <span>October 19, 2026</span>
              <span>•</span>
              <span>5 min read</span>
            </div>
          </div>

          <p className="text-slate-300 text-base leading-relaxed">
            The modern web is inundated with distractions, intrusive modal dialogs, and aggressive subscription
            gates that disrupt the reading flow. When researching technical documentation or academic papers,
            few things are as frustrating as having your screen blanketed by a multi-layered popup.
          </p>

          <p className="text-slate-300 text-base leading-relaxed">
            Many publishers implement soft paywalls by setting <code className="text-emerald-300 font-mono text-xs bg-slate-800 px-1.5 py-0.5 rounded">overflow: hidden</code> on the document body and overlaying a high z-index backdrop with blur filters. This technique artificially locks user scrolling while obscuring the underlying paragraph text.
          </p>

          {/* Section subject to blur */}
          <div className="relative p-5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Deep-Dive: In-Memory Heuristics & DOM Manipulation</span>
              {isTextBlurred && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 font-mono">
                  Protected Content (Blurred)
                </span>
              )}
            </div>

            <div
              className={`transition-all duration-300 ${
                isTextBlurred
                  ? 'filter blur-sm select-none opacity-40 pointer-events-none'
                  : 'filter-none opacity-100 select-auto'
              }`}
            >
              <p className="text-slate-300 text-sm leading-relaxed mb-3">
                OverlayBuster solves this by analyzing the rendered DOM layout tree. Rather than relying solely on rigid URL blacklists, it evaluates element geometries, z-index hierarchies, modal backdrop characteristics, and computed overflow states.
              </p>
              <p className="text-slate-300 text-sm leading-relaxed">
                When triggered, it unlocks body and html scroll constraints with high-priority CSS overrides, vaporizes modal container nodes, and removes filter masks without breaking legitimate site navigations.
              </p>
            </div>
          </div>

          <p className="text-slate-300 text-base leading-relaxed">
            Try opening your <strong>OverlayBuster Extension Popup</strong> right now from your Chrome toolbar while on this page, or click the green <strong>"⚡ Bust Overlays Now"</strong> button above to watch the paywall and blurs instantly vanish!
          </p>
        </article>

        {/* Live Diagnostics Sidebar */}
        <aside className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Live Page State</span>
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Paywall Modal:</span>
                <span className={`font-semibold font-mono ${hasPaywallModal ? 'text-red-400' : 'text-emerald-400'}`}>
                  {hasPaywallModal ? 'ACTIVE (BLOCKING)' : 'CLEARED ✅'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Newsletter Popup:</span>
                <span className={`font-semibold font-mono ${hasNewsletterPopup ? 'text-red-400' : 'text-emerald-400'}`}>
                  {hasNewsletterPopup ? 'ACTIVE (BLOCKING)' : 'NONE ✅'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Scroll Lock:</span>
                <span className={`font-semibold font-mono ${isScrollLocked ? 'text-amber-400' : 'text-cyan-400'}`}>
                  {isScrollLocked ? 'LOCKED (overflow: hidden)' : 'UNLOCKED ✅'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Article Text:</span>
                <span className={`font-semibold font-mono ${isTextBlurred ? 'text-amber-400' : 'text-indigo-400'}`}>
                  {isTextBlurred ? 'BLURRED' : 'CRYSTAL CLEAR ✅'}
                </span>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Event Timeline</h2>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 text-[11px] font-mono text-slate-300">
              {logMessages.map((msg, i) => (
                <div key={i} className="p-2 rounded bg-slate-950 border border-slate-800/80 leading-normal">
                  {msg}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {/* ------------------------------------------------------------- */}
      {/* SIMULATED INTRUSIVE PAYWALL MODAL (Matches KNOWN_OVERLAY_SELECTORS) */}
      {/* ------------------------------------------------------------- */}
      {hasPaywallModal && (
        <div
          id="demo-paywall-modal"
          className="paywall-backdrop-modal"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '20px',
              padding: '36px',
              maxWidth: '480px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 16px',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              🔒
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
              Subscribe to Read Full Article
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>
              You have read your 0 free complimentary articles for this month. Unlock full unlimited access to investigative journalism and technical engineering reports for $1/week.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '13px',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Join for $1 / Week
              </button>
              <button
                onClick={() => {
                  setHasPaywallModal(false);
                  setIsScrollLocked(false);
                  addLog('Manually closed simulated paywall dialog.');
                }}
                style={{
                  backgroundColor: 'transparent',
                  color: '#64748b',
                  fontSize: '12px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Close Demo Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SIMULATED NEWSLETTER POPUP (Matches newsletter-popup selector) */}
      {/* ------------------------------------------------------------- */}
      {hasNewsletterPopup && (
        <div
          id="demo-newsletter-popup"
          className="newsletter-popup"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '360px',
            zIndex: 99990,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>📬 Don't Miss an Update</span>
            <button
              onClick={() => {
                setHasNewsletterPopup(false);
                addLog('Manually dismissed newsletter popup.');
              }}
              style={{ color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>
            Subscribe to our weekly software newsletter to receive the top articles in your inbox.
          </p>
          <input
            type="email"
            placeholder="your@email.com"
            style={{
              width: '100%',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '12px',
              color: 'white',
              marginBottom: '10px',
            }}
          />
          <button
            style={{
              width: '100%',
              backgroundColor: '#4f46e5',
              color: 'white',
              fontSize: '12px',
              fontWeight: 600,
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Subscribe Now
          </button>
        </div>
      )}
    </div>
  );
};
