import React, { useState } from 'react';
import { Badge, Button } from '@nexora/ui';
import {
  Layers,
  Bookmark,
  ShieldCheck,
  Zap,
  Lock,
  Database,
  ExternalLink,
  ChevronRight,
  CheckCircle,
  HelpCircle,
  FolderDown,
  Terminal,
  FilePenLine,
} from 'lucide-react';

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<'home' | 'tabmind' | 'pagepocket' | 'linksentry' | 'formfill' | 'citeright' | 'lecturemark' | 'privacy' | 'docs'>('home');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      {/* Navigation */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => setActivePage('home')}
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
              N
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                Nexora Tools
              </span>
              <span className="text-[10px] block text-slate-400 -mt-1 font-medium">
                Small Tools. Better Browsing.
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              onClick={() => setActivePage('home')}
              className={`hover:text-indigo-600 transition-colors ${
                activePage === 'home' ? 'text-indigo-600 font-semibold' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActivePage('tabmind')}
              className={`hover:text-blue-600 transition-colors ${
                activePage === 'tabmind' ? 'text-blue-600 font-semibold' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              TabMind
            </button>
            <button
              onClick={() => setActivePage('pagepocket')}
              className={`hover:text-purple-600 transition-colors ${
                activePage === 'pagepocket' ? 'text-purple-600 font-semibold' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              PagePocket
            </button>
            <button
              onClick={() => setActivePage('linksentry')}
              className={`hover:text-teal-600 transition-colors ${
                activePage === 'linksentry' ? 'text-teal-600 font-semibold' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              LinkSentry
            </button>
            <button
              onClick={() => setActivePage('formfill')}
              className={`hover:text-amber-600 transition-colors ${
                activePage === 'formfill' ? 'text-amber-600 font-semibold' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              FormFill Pro
            </button>
            <button
              onClick={() => setActivePage('citeright')}
              className={`hover:text-sky-600 transition-colors ${
                activePage === 'citeright' ? 'text-sky-600 font-semibold' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              CiteRight
            </button>
            <button
              onClick={() => setActivePage('lecturemark')}
              className={`hover:text-indigo-600 transition-colors ${
                activePage === 'lecturemark' ? 'text-indigo-600 font-semibold' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              LectureMark
            </button>
            <button
              onClick={() => setActivePage('privacy')}
              className={`hover:text-indigo-600 transition-colors ${
                activePage === 'privacy' ? 'text-indigo-600 font-semibold' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Privacy
            </button>
            <button
              onClick={() => setActivePage('docs')}
              className={`hover:text-indigo-600 transition-colors ${
                activePage === 'docs' ? 'text-indigo-600 font-semibold' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Docs
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="info">Developer Release</Badge>
          </div>
        </div>
      </nav>

      {/* Content Rendering */}
      <div className="flex-1">
        {activePage === 'home' && (
          <div className="max-w-6xl mx-auto px-4 py-16 space-y-20">
            {/* Hero */}
            <div className="text-center max-w-3xl mx-auto space-y-5">
              <Badge variant="info" className="px-3 py-1 text-xs">
                Local-First • Manifest V3 • Zero Tracking
              </Badge>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                Small Tools. <br />
                <span className="text-indigo-600">Better Browsing.</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
                A premium family of focused, privacy-first Chrome browser utility extensions.
                Independently installable tools designed to organize tabs, preserve research, audit links, and eliminate repetitive typing.
              </p>
              <div className="flex items-center justify-center gap-3 pt-4">
                <Button size="lg" variant="primary" onClick={() => setActivePage('docs')}>
                  Installation Guide
                </Button>
                <Button size="lg" variant="outline" onClick={() => setActivePage('privacy')}>
                  Our Privacy Guarantees
                </Button>
              </div>
            </div>

            {/* Product Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* TabMind */}
              <div
                onClick={() => setActivePage('tabmind')}
                className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-blue-400 dark:hover:border-blue-700 transition-all cursor-pointer group space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                    T
                  </div>
                  <Badge variant="info">Tab & Session Manager</Badge>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    TabMind
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Save named workspaces, clean duplicate tabs, group domains, and restore multitasking sessions without losing state.
                  </p>
                </div>
                <div className="flex items-center text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                  Explore TabMind <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>

              {/* PagePocket */}
              <div
                onClick={() => setActivePage('pagepocket')}
                className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-purple-400 dark:hover:border-purple-700 transition-all cursor-pointer group space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    P
                  </div>
                  <Badge variant="info">Web Clipper & Knowledge</Badge>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">
                    PagePocket
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Clip web highlights, read uncluttered articles, organize personal research notes, and export to Markdown/JSON locally.
                  </p>
                </div>
                <div className="flex items-center text-xs font-semibold text-purple-600 group-hover:translate-x-1 transition-transform">
                  Explore PagePocket <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>

              {/* LinkSentry */}
              <div
                onClick={() => setActivePage('linksentry')}
                className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-teal-400 dark:hover:border-teal-700 transition-all cursor-pointer group space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-lg">
                    L
                  </div>
                  <Badge variant="info">Bookmark Health Auditor</Badge>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                    LinkSentry
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Audit bookmark reachability, detect 404s and redirect chains, identify duplicate URLs, and export CSV/JSON audit reports.
                  </p>
                </div>
                <div className="flex items-center text-xs font-semibold text-teal-600 group-hover:translate-x-1 transition-transform">
                  Explore LinkSentry <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>

              {/* FormFill Pro */}
              <div
                onClick={() => setActivePage('formfill')}
                className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-amber-400 dark:hover:border-amber-700 transition-all cursor-pointer group space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white font-bold text-lg">
                    F
                  </div>
                  <Badge variant="warning">Privacy Form Assistant</Badge>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
                    FormFill Pro
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Store customized student and professional profiles locally. Preview matched fields and approve autofill with zero cloud sync.
                  </p>
                </div>
                <div className="flex items-center text-xs font-semibold text-amber-600 group-hover:translate-x-1 transition-transform">
                  Explore FormFill Pro <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>

              {/* CiteRight */}
              <div
                onClick={() => setActivePage('citeright')}
                className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-sky-400 dark:hover:border-sky-700 transition-all cursor-pointer group space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white font-bold text-lg">
                    C
                  </div>
                  <Badge variant="success">Citation & Bibliography</Badge>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-sky-600 transition-colors">
                    CiteRight
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Extract verified metadata, generate APA, MLA, IEEE & BibTeX citations, build collections, and lookup DOIs/ISBNs with zero hallucination.
                  </p>
                </div>
                <div className="flex items-center text-xs font-semibold text-sky-600 group-hover:translate-x-1 transition-transform">
                  Explore CiteRight <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>

              {/* LectureMark */}
              <div
                onClick={() => setActivePage('lecturemark')}
                className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-700 transition-all cursor-pointer group space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow">
                    <FilePenLine className="w-5 h-5 text-white" />
                  </div>
                  <Badge variant="indigo">Video Learning & Notes</Badge>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                    LectureMark
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Take timestamped notes while watching educational videos, jump to exact playback moments, create chapter markers, and revise effortlessly.
                  </p>
                </div>
                <div className="flex items-center text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform">
                  Explore LectureMark <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>

            {/* Core Values */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 mx-auto flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">Local-First Architecture</h4>
                <p className="text-xs text-slate-500">
                  Data lives in your browser's IndexedDB and chrome.storage. No required server, accounts, or telemetry.
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">Zero Cloud Tracking</h4>
                <p className="text-xs text-slate-500">
                  We don't collect browsing logs, analytics, or profile values. Your forms and bookmarks never leave your device.
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 mx-auto flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">Manifest V3 Certified</h4>
                <p className="text-xs text-slate-500">
                  Modern service workers, declarative security standards, and audited permissions conforming to Chrome policies.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TabMind Product Page */}
        {activePage === 'tabmind' && (
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-8 space-y-3">
              <Badge variant="info">Product Specification</Badge>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                TabMind — Intelligent Tab & Session Manager
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                Overcome tab clutter and browser slowdowns with named workspaces and intelligent duplicate detection.
              </p>
            </div>

            <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Key Capabilities</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Open Tab Management:</strong> Filter tabs instantly, activate existing tabs, close duplicates with confirmation.</li>
                <li><strong>Saved Workspaces:</strong> Organize sessions into named sets (e.g. "College", "DSA", "Research", "Personal") that persist across browser restarts.</li>
                <li><strong>Restoration Flexibility:</strong> Restore all saved tabs directly or into an isolated new browser window.</li>
                <li><strong>Native Grouping:</strong> Utilize Chrome's Tab Groups API to automatically group compatible open tabs by domain.</li>
              </ul>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white pt-4">Permissions Required</h3>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <p><code>tabs</code> — Query, activate, and manage open browser tabs.</p>
                <p><code>storage</code> — Save named workspace sessions locally on disk.</p>
                <p><code>tabGroups</code> — Group related domain tabs visually.</p>
              </div>
            </div>
          </div>
        )}

        {/* PagePocket Product Page */}
        {activePage === 'pagepocket' && (
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-8 space-y-3">
              <Badge variant="info">Product Specification</Badge>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                PagePocket — Personal Web Clipper & Knowledge Manager
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                A private, local research repository for web pages, highlighted citations, and clean reader extracts.
              </p>
            </div>

            <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Key Capabilities</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>One-Click Page & Highlight Clipping:</strong> Save entire pages or highlighted text selections directly with tags and notes.</li>
                <li><strong>Clean Reader Extraction:</strong> Heuristically parses core article paragraphs, removing ad clutter and navigation sidebars.</li>
                <li><strong>Knowledge Base Dashboard:</strong> Search by keyword, filter by tags or favorites, and review research offline.</li>
                <li><strong>Local-First Storage & Export:</strong> Stored securely in client-side IndexedDB with one-click JSON and Markdown export.</li>
              </ul>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white pt-4">Permissions Required</h3>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <p><code>activeTab</code> — Inspect current page title, URL, and selected text upon user trigger.</p>
                <p><code>storage</code> — Store user preferences and settings.</p>
                <p><code>contextMenus</code> — Right-click to clip highlights directly to your library.</p>
                <p><code>scripting</code> — Cleanly extract article readable text when requested.</p>
              </div>
            </div>
          </div>
        )}

        {/* LinkSentry Product Page */}
        {activePage === 'linksentry' && (
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-8 space-y-3">
              <Badge variant="info">Product Specification</Badge>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                LinkSentry — Bookmark Health & Link Checker
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                Audit your bookmark collection to eliminate dead links, follow redirects, and remove duplicate bookmarks.
              </p>
            </div>

            <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Key Capabilities</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Honest Health Classification:</strong> Categorizes bookmarks as Healthy, Redirected, Broken, Uncertain, or Unsupported without false positives.</li>
                <li><strong>Controlled Concurrency Engine:</strong> Validates links safely with timeouts and backpressure without flooding target hosts.</li>
                <li><strong>Duplicate URL Discovery:</strong> Flags bookmarks pointing to identical web targets.</li>
                <li><strong>Comprehensive Auditing Reports:</strong> Export audit records in CSV or JSON format for permanent record-keeping.</li>
              </ul>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white pt-4">Permissions Required</h3>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <p><code>bookmarks</code> — Read and optionally delete bookmarks upon explicit user confirmation.</p>
                <p><code>storage</code> — Store scan history and audit configurations.</p>
              </div>
            </div>
          </div>
        )}

        {/* FormFill Pro Product Page */}
        {activePage === 'formfill' && (
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-8 space-y-3">
              <Badge variant="warning">Product Specification</Badge>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                FormFill Pro — Privacy-Focused Form Autofill
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                Eliminate repetitive job application and student form entries with user-controlled profiles and review-before-fill preview.
              </p>
            </div>

            <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Key Capabilities</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Multiple User Profiles:</strong> Manage separate profiles for Personal, Internship, College, and Professional contexts.</li>
                <li><strong>Review-Before-Fill:</strong> Inspect matched fields and review values before approving insertion. Never auto-submits.</li>
                <li><strong>Reusable Text Snippets:</strong> Quick-copy bios, project explanations, and cover statements.</li>
                <li><strong>Strict Privacy:</strong> Absolutely no passwords, financial data, or cloud syncing. Data remains strictly on your local disk.</li>
              </ul>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white pt-4">Permissions Required</h3>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <p><code>activeTab</code> — Inspect form inputs on the active tab when opened.</p>
                <p><code>storage</code> — Securely store your form profiles and snippets locally.</p>
                <p><code>scripting</code> — Insert approved data with synthetic change/input events.</p>
              </div>
            </div>
          </div>
        )}

        {/* CiteRight Product Page */}
        {activePage === 'citeright' && (
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-8 space-y-3">
              <Badge variant="success">Product Specification</Badge>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                CiteRight — Research Citations & Bibliography Generator
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                Extract verified bibliographic metadata, generate accurate APA, MLA, IEEE, and BibTeX citations, and build exportable bibliographies without hallucinated data.
              </p>
            </div>

            <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Key Capabilities</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Verified Metadata Only:</strong> Distinguishes verified bibliographic tags from inferred or missing information. Never hallucinates authors, dates, or page numbers.</li>
                <li><strong>Multiple Citation Formats:</strong> Generates instantaneous references in APA 7th, MLA 9th, IEEE, and BibTeX.</li>
                <li><strong>Authoritative DOI & ISBN Lookup:</strong> Queries CrossRef and OpenLibrary APIs to pull verified metadata for any research paper or book.</li>
                <li><strong>Bibliography Collection Manager:</strong> Organize references into project collections and export full bibliographies as Markdown (.md), BibTeX (.bib), Text (.txt), or JSON.</li>
              </ul>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white pt-4">Permissions Required</h3>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <p><code>activeTab</code> — Inspect publication metadata on the active tab upon click.</p>
                <p><code>storage</code> — Store your collections and saved citations locally in IndexedDB.</p>
                <p><code>scripting</code> — Extract Highwire Press and Schema.org metadata from the page DOM.</p>
              </div>
            </div>
          </div>
        )}

        {/* LectureMark Page */}
        {activePage === 'lecturemark' && (
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-8 space-y-3">
              <Badge variant="indigo">Product Specification</Badge>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                LectureMark — Timestamped Video Notes & Learning Organization
              </h1>
              <p className="text-slate-600 dark:text-slate-300 font-medium italic">
                Tagline: Learn smarter. Remember every moment.
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Take timestamped notes while watching educational videos, jump directly to that point in the video, create custom chapter markers, and revise key exam concepts effortlessly.
              </p>
            </div>

            <div className="space-y-6 text-sm text-slate-700 dark:text-slate-300">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Key Capabilities</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Timestamped Notes:</strong> Automatically captures current playback position on YouTube, NPTEL, and HTML5 video sites. Click any timestamp to instantly seek the player.</li>
                <li><strong>Automatic Lecture Organization:</strong> Dedicated lecture pages storing video titles, instructor/channel, duration, and personal tags with persistent IndexedDB storage.</li>
                <li><strong>Custom Chapter Markers:</strong> Break long lectures down into milestones (e.g. 00:00 Intro, 05:20 Concepts, 16:45 Worked Example).</li>
                <li><strong>Revision Workspace:</strong> Mark notes as revised, track study progress, and filter concepts by Exam, Doubt, Important, or Assignment tags.</li>
                <li><strong>Search Across All Lectures:</strong> Cross-lecture search for university examination preparation. Search terms like "deadlock" or "time complexity" across all saved video courses.</li>
                <li><strong>Export & Backup:</strong> Download structured Markdown notes (.md) with clickable timestamp links, or export/import full JSON backups.</li>
              </ul>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white pt-4">Permissions Required</h3>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <p><code>activeTab</code> — Read video playback time and title from the active tab.</p>
                <p><code>storage</code> — Store lecture metadata and notes in local IndexedDB.</p>
                <p><code>sidePanel</code> — Render side-by-side note-taking workspace in Chrome Side Panel.</p>
                <p><code>scripting</code> — Query video element and seek playback position.</p>
              </div>
            </div>
          </div>
        )}

        {/* Privacy Page */}
        {activePage === 'privacy' && (
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              Nexora Tools Privacy Policy & Guarantees
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Last updated: October 2026. Nexora Tools was founded on the fundamental principle that browser utilities should be local-first, respectful of user resources, and completely free of tracking.
            </p>

            <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">1. Local-First Data Storage</h3>
              <p>
                All data created across TabMind, PagePocket, LinkSentry, FormFill Pro, CiteRight, and LectureMark—including saved workspaces, clipped highlights, bookmark audits, personal form profiles, research bibliographies, and lecture timestamps—is stored exclusively on your device using <code>chrome.storage.local</code> and client-side <code>IndexedDB</code>.
              </p>

              <h3 className="text-base font-bold text-slate-900 dark:text-white">2. No External Telemetry or Analytics</h3>
              <p>
                Nexora Tools extensions do not include Google Analytics, Mixpanel, Sentry, or any third-party telemetry scripts. We do not track your browsing habits, page visits, or usage metrics.
              </p>

              <h3 className="text-base font-bold text-slate-900 dark:text-white">3. Minimal Permissions</h3>
              <p>
                Each extension requests only the minimum required permissions to perform its designated function. We never request broad host permissions (such as <code>*://*/*</code>) unless strictly required for user-initiated content actions (e.g. LinkSentry link validation).
              </p>
            </div>
          </div>
        )}

        {/* Docs / Installation Page */}
        {activePage === 'docs' && (
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              Installation & Developer Documentation
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              How to load and test Nexora Tools extensions in Google Chrome using Developer Mode.
            </p>

            <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Loading Unpacked Extensions</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Open Google Chrome and navigate to <code>chrome://extensions</code>.</li>
                <li>Enable the <strong>Developer mode</strong> toggle located in the top-right corner.</li>
                <li>Click <strong>Load unpacked</strong> in the top-left toolbar.</li>
                <li>
                  Navigate to your <code>dist-zip/</code> folder and select the directory for the desired extension:
                  <ul className="list-disc pl-5 mt-1 text-xs font-mono space-y-1">
                    <li><code>dist-zip/tabmind</code> — TabMind</li>
                    <li><code>dist-zip/pagepocket</code> — PagePocket (with ContextClip)</li>
                    <li><code>dist-zip/linksentry</code> — LinkSentry</li>
                    <li><code>dist-zip/formfill-pro</code> — FormFill Pro</li>
                    <li><code>dist-zip/citeright</code> — CiteRight</li>
                    <li><code>dist-zip/lecturemark</code> — LectureMark</li>
                  </ul>
                </li>
                <li>Click the extension icon in your Chrome toolbar to use the extension!</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-10 mt-20">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">Nexora Tools</span>
            <span>— Small Tools. Better Browsing.</span>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setActivePage('privacy')} className="hover:underline">
              Privacy Disclosures
            </button>
            <button onClick={() => setActivePage('docs')} className="hover:underline">
              Documentation
            </button>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:underline">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
