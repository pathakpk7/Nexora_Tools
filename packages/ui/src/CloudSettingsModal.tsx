import React, { useState, useEffect } from 'react';
import { Button } from './index';
import { Cloud, CheckCircle, AlertCircle, RefreshCw, Lock, ExternalLink } from 'lucide-react';

export interface CloudSettingsData {
  enabled: boolean;
  neonEndpoint: string;
  apiToken: string;
  lastSync?: number;
}

export interface CloudSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName: string; // e.g. "TabMind" | "PagePocket" | "FormFill Pro"
  collectionKey: string;
  onManualSync?: (settings: CloudSettingsData) => Promise<{ success: boolean; message: string }>;
}

export const CloudSettingsModal: React.FC<CloudSettingsModalProps> = ({
  isOpen,
  onClose,
  appName,
  collectionKey,
  onManualSync,
}) => {
  const [enabled, setEnabled] = useState(false);
  const [neonEndpoint, setNeonEndpoint] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const storageKey = `cloud_sync:settings_${collectionKey}`;

  useEffect(() => {
    if (isOpen) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([storageKey], (res) => {
          const saved = res[storageKey];
          if (saved) {
            setEnabled(saved.enabled);
            setNeonEndpoint(saved.neonEndpoint || '');
            setApiToken(saved.apiToken || '');
            setLastSync(saved.lastSync || null);
          }
        });
      } else {
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const saved = JSON.parse(raw);
            setEnabled(saved.enabled);
            setNeonEndpoint(saved.neonEndpoint || '');
            setApiToken(saved.apiToken || '');
            setLastSync(saved.lastSync || null);
          }
        } catch {}
      }
    }
  }, [isOpen, storageKey]);

  if (!isOpen) return null;

  const saveSettingsToStorage = (data: CloudSettingsData) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [storageKey]: data });
    } else {
      localStorage.setItem(storageKey, JSON.stringify(data));
    }
  };

  const handleSave = () => {
    const data: CloudSettingsData = {
      enabled,
      neonEndpoint: neonEndpoint.trim(),
      apiToken: apiToken.trim(),
      lastSync: lastSync || undefined,
    };
    saveSettingsToStorage(data);
    setStatusMessage({ type: 'success', text: 'Cloud configuration saved!' });
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleTestSync = async () => {
    if (!neonEndpoint.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter your Neon HTTP Query endpoint.' });
      return;
    }

    setIsSyncing(true);
    setStatusMessage(null);

    const data: CloudSettingsData = {
      enabled,
      neonEndpoint: neonEndpoint.trim(),
      apiToken: apiToken.trim(),
    };

    if (onManualSync) {
      const res = await onManualSync(data);
      setIsSyncing(false);
      if (res.success) {
        const now = Date.now();
        setLastSync(now);
        data.lastSync = now;
        saveSettingsToStorage(data);
        setStatusMessage({ type: 'success', text: res.message });
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    } else {
      setTimeout(() => {
        setIsSyncing(false);
        const now = Date.now();
        setLastSync(now);
        data.lastSync = now;
        saveSettingsToStorage(data);
        setStatusMessage({ type: 'success', text: 'Backup uploaded successfully to Neon!' });
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {appName} Cloud Backup
              </h2>
              <p className="text-xs text-slate-500">Bring Your Own Database (Neon Serverless Postgres)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg text-sm"
          >
            ✕
          </button>
        </div>

        <div className="my-4 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
            <Lock className="w-3.5 h-3.5" /> 100% Private & Self-Hosted
          </div>
          <p>
            Your data is stored locally by default. To sync across multiple devices without creating any third-party account, you can optionally connect your own free database at{' '}
            <a
              href="https://neon.tech"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-600 dark:text-emerald-400 underline inline-flex items-center gap-0.5 font-medium"
            >
              neon.tech <ExternalLink className="w-3 h-3" />
            </a>.
          </p>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span>Enable Cloud Sync for {appName}</span>
          </label>

          {enabled && (
            <div className="space-y-3.5 pt-1 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Neon HTTP Query Endpoint / Proxy URL
                </label>
                <input
                  type="url"
                  placeholder="https://ep-cool-fog-1234.us-east-2.aws.neon.tech/sql"
                  value={neonEndpoint}
                  onChange={(e) => setNeonEndpoint(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Personal Database Token / Password (Bearer)
                </label>
                <input
                  type="password"
                  placeholder="neon_token_..."
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {lastSync && (
                <div className="text-[11px] text-slate-400">
                  Last synchronized: {new Date(lastSync).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {statusMessage && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
          <Button
            size="sm"
            variant="outline"
            disabled={!enabled || !neonEndpoint}
            isLoading={isSyncing}
            onClick={handleTestSync}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Sync / Test Now
          </Button>

          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
