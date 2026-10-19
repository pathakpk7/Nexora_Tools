import React, { useState, useEffect } from 'react';
import { WorkspaceSession, SavedTab } from '@nexora/shared-types';
import { Button, IconButton, SearchInput, Badge, ConfirmationDialog, EmptyState, Input, CloudSettingsModal } from '@nexora/ui';
import { TabMindService } from '../services/tabmind';
import {
  FolderDown,
  Trash2,
  Layers,
  Plus,
  ExternalLink,
  Globe,
  Sparkles,
  Download,
  Copy,
  FolderPlus,
  FolderHeart,
  Check,
  Cloud,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  BookmarkPlus,
} from 'lucide-react';
import { downloadJsonFile, downloadMarkdownFile } from '@nexora/browser-utils';
import { NeonCloudSyncClient } from '@nexora/storage';

export const TabMindDashboard: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<WorkspaceSession[]>([]);
  const [search, setSearch] = useState('');
  const [selectedWs, setSelectedWs] = useState<WorkspaceSession | null>(null);
  const [tabFilter, setTabFilter] = useState('');

  // Quick Create Workspace modal
  const [isCreatingWs, setIsCreatingWs] = useState(false);
  const [newWsTitle, setNewWsTitle] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');

  // Add individual tab to selected workspace
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [newTabTitle, setNewTabTitle] = useState('');
  const [newTabUrl, setNewTabUrl] = useState('');

  // Responsive sidebar collapse / slide state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Group-targeted URL addition modal / popup
  const [targetGroupForUrl, setTargetGroupForUrl] = useState<string | null>(null);
  const [groupTabUrl, setGroupTabUrl] = useState('');
  const [groupTabTitle, setGroupTabTitle] = useState('');

  const [copiedWsId, setCopiedWsId] = useState<string | null>(null);
  const [isCloudOpen, setIsCloudOpen] = useState(false);

  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({ isOpen: false, title: '', message: '', action: () => {} });

  const loadWorkspaces = async () => {
    const list = await TabMindService.getWorkspaces();
    setWorkspaces(list);
    if (!selectedWs && list.length > 0) {
      setSelectedWs(list[0]);
    } else if (selectedWs) {
      const refreshed = list.find((w) => w.id === selectedWs.id);
      setSelectedWs(refreshed || (list.length > 0 ? list[0] : null));
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const filteredWorkspaces = workspaces.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  // Quick save current open tabs directly from dashboard
  const handleSaveCurrentSessionDirect = async () => {
    const name = `Workspace ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const ws = await TabMindService.saveCurrentSession(name, 'Saved from TabMind Dashboard');
    await loadWorkspaces();
    setSelectedWs(ws);
  };

  const handleCreateCustomWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsTitle.trim()) return;

    const ws = await TabMindService.saveCurrentSession(
      newWsTitle.trim(),
      newWsDesc.trim() || undefined
    );
    setNewWsTitle('');
    setNewWsDesc('');
    setIsCreatingWs(false);
    await loadWorkspaces();
    setSelectedWs(ws);
  };

  const handleAddManualTab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWs || !newTabUrl.trim()) return;

    let finalUrl = newTabUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`;
    }

    const newTab: SavedTab = {
      id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: newTabTitle.trim() || finalUrl,
      url: finalUrl,
      groupName: 'Manual Entry',
    };

    const updatedTabs = [...selectedWs.tabs, newTab];
    await TabMindService.updateWorkspace(selectedWs.id, { tabs: updatedTabs });
    setNewTabTitle('');
    setNewTabUrl('');
    setIsAddingTab(false);
    await loadWorkspaces();
  };

  const handleAddTabToSpecificGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWs || !groupTabUrl.trim() || !targetGroupForUrl) return;

    let finalUrl = groupTabUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`;
    }

    const newTab: SavedTab = {
      id: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: groupTabTitle.trim() || finalUrl,
      url: finalUrl,
      groupName: targetGroupForUrl,
    };

    const updatedTabs = [...selectedWs.tabs, newTab];
    await TabMindService.updateWorkspace(selectedWs.id, { tabs: updatedTabs });
    setGroupTabTitle('');
    setGroupTabUrl('');
    setTargetGroupForUrl(null);
    await loadWorkspaces();
  };

  const handleRemoveSingleTab = async (tabIndex: number) => {
    if (!selectedWs) return;
    const updated = selectedWs.tabs.filter((_, idx) => idx !== tabIndex);
    await TabMindService.updateWorkspace(selectedWs.id, { tabs: updated });
    await loadWorkspaces();
  };

  const handleExportWorkspaceJson = (ws: WorkspaceSession) => {
    downloadJsonFile(`${ws.name.toLowerCase().replace(/\s+/g, '_')}_workspace.json`, ws);
  };

  const handleExportWorkspaceMarkdown = (ws: WorkspaceSession) => {
    let md = `# Workspace: ${ws.name}\n${ws.description ? `*${ws.description}*\n` : ''}\n`;
    md += `Updated: ${new Date(ws.updatedAt).toLocaleString()}\n`;
    md += `Total Tabs: ${ws.tabs.length}\n\n`;

    // Grouping
    const groups: Record<string, SavedTab[]> = {};
    ws.tabs.forEach((t) => {
      const g = t.groupName || 'Ungrouped Tabs';
      if (!groups[g]) groups[g] = [];
      groups[g].push(t);
    });

    for (const [groupName, tabs] of Object.entries(groups)) {
      md += `### ${groupName} (${tabs.length})\n`;
      tabs.forEach((t) => {
        md += `- [${t.title}](${t.url})\n`;
      });
      md += '\n';
    }

    downloadMarkdownFile(`${ws.name.toLowerCase().replace(/\s+/g, '_')}.md`, md);
  };

  const handleCopyUrls = (ws: WorkspaceSession) => {
    const text = ws.tabs.map((t) => `${t.title}: ${t.url}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedWsId(ws.id);
    setTimeout(() => setCopiedWsId(null), 2000);
  };

  const visibleTabs = selectedWs
    ? selectedWs.tabs.filter(
        (t) =>
          t.title.toLowerCase().includes(tabFilter.toLowerCase()) ||
          t.url.toLowerCase().includes(tabFilter.toLowerCase()) ||
          (t.groupName && t.groupName.toLowerCase().includes(tabFilter.toLowerCase()))
      )
    : [];

  // Group tabs by saved group name
  const tabGroupsMap: Record<string, SavedTab[]> = {};
  visibleTabs.forEach((tab) => {
    const grp = tab.groupName || 'Ungrouped';
    if (!tabGroupsMap[grp]) tabGroupsMap[grp] = [];
    tabGroupsMap[grp].push(tab);
  });

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-hidden relative">
      {/* Sidebar with smooth slider transition */}
      <aside
        className={`border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col transition-all duration-300 ease-in-out shrink-0 z-20 ${
          isSidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full overflow-hidden border-none'
        }`}
      >
        <div className="w-80 flex flex-col h-full">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                T
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight">TabMind Studio</span>
                <p className="text-[10px] text-slate-400">Workspace & Tab Management</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsCloudOpen(true)}
                className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors relative group"
                title="Cloud Sync (Neon Serverless Postgres) — Backup & sync workspaces across computers"
              >
                <Cloud className="w-4 h-4" />
                {/* Tooltip on hover */}
                <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-48 bg-slate-900 text-white text-[11px] p-2 rounded-lg shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  <strong>Cloud Backup (Neon)</strong>
                  <br />
                  Sync workspaces to your own free database across devices.
                </span>
              </button>
              <Badge variant="info">{workspaces.length}</Badge>
              {/* Button to collapse sidebar */}
              <IconButton
                size="sm"
                variant="ghost"
                ariaLabel="Collapse sidebar"
                onClick={() => setIsSidebarOpen(false)}
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
              </IconButton>
            </div>
          </div>

          {/* Quick action bar */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 space-y-2">
            <SearchInput
              placeholder="Search workspaces..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
            />
            <div className="flex gap-1.5 pt-0.5">
              <Button
                size="sm"
                variant="primary"
                className="flex-1 text-xs h-7.5 bg-blue-600 hover:bg-blue-700 text-white justify-center"
                onClick={handleSaveCurrentSessionDirect}
                icon={<Sparkles className="w-3 h-3 text-blue-200" />}
              >
                Save Open Tabs
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7.5"
                onClick={() => setIsCreatingWs(true)}
                icon={<FolderPlus className="w-3 h-3 text-slate-500" />}
              >
                New
              </Button>
            </div>
          </div>

          {/* Workspace List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredWorkspaces.length === 0 ? (
              <div className="p-6 text-center">
                <FolderHeart className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No Workspaces Yet
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Click "Save Open Tabs" above or create a new workspace.
                </p>
              </div>
            ) : (
              filteredWorkspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => setSelectedWs(ws)}
                  className={`w-full text-left p-3 rounded-xl text-xs font-medium transition-all border ${
                    selectedWs?.id === ws.id
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-800 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate font-bold text-slate-900 dark:text-slate-100 text-xs">
                      {ws.name}
                    </span>
                    <Badge size="sm" variant="info">
                      {ws.tabs.length} tabs
                    </Badge>
                  </div>
                  {ws.description && (
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 font-normal">
                      {ws.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-normal">
                    <span>
                      {ws.groups && ws.groups.length > 0
                        ? `${ws.groups.length} group${ws.groups.length > 1 ? 's' : ''}`
                        : 'Ungrouped'}
                    </span>
                    <span>{new Date(ws.updatedAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
        {selectedWs ? (
          <>
            {/* Header */}
            <header className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {!isSidebarOpen && (
                  <IconButton
                    size="md"
                    variant="ghost"
                    ariaLabel="Open sidebar"
                    onClick={() => setIsSidebarOpen(true)}
                    title="Open sidebar"
                    className="border border-slate-200 dark:border-slate-700 shadow-2xs"
                  >
                    <PanelLeftOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </IconButton>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      {selectedWs.name}
                    </h1>
                    <Badge variant="info">{selectedWs.tabs.length} tabs</Badge>
                    {selectedWs.groups && selectedWs.groups.length > 0 && (
                      <Badge variant="neutral">
                        {selectedWs.groups.length} saved group
                        {selectedWs.groups.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {selectedWs.description || 'Saved Browsing Session'} • Updated{' '}
                    {new Date(selectedWs.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => TabMindService.restoreWorkspace(selectedWs, false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  icon={<FolderDown className="w-4 h-4" />}
                >
                  Restore All Tabs
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => TabMindService.restoreWorkspace(selectedWs, true)}
                >
                  Restore in New Window
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyUrls(selectedWs)}
                  icon={
                    copiedWsId === selectedWs.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )
                  }
                >
                  {copiedWsId === selectedWs.id ? 'Copied!' : 'Copy URLs'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportWorkspaceMarkdown(selectedWs)}
                  icon={<Download className="w-3.5 h-3.5" />}
                >
                  Export Markdown
                </Button>
                <IconButton
                  size="md"
                  ariaLabel="Delete workspace"
                  variant="danger"
                  onClick={() =>
                    setDialogState({
                      isOpen: true,
                      title: 'Delete Workspace',
                      message: `Are you sure you want to delete "${selectedWs.name}"?`,
                      action: async () => {
                        await TabMindService.deleteWorkspace(selectedWs.id);
                        await loadWorkspaces();
                      },
                    })
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </IconButton>
              </div>
            </header>

            {/* Filter and Tab Adding Toolbar */}
            <div className="p-4 border-b border-slate-200/60 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex items-center justify-between gap-4">
              <div className="w-72">
                <SearchInput
                  placeholder="Filter tabs inside this workspace..."
                  value={tabFilter}
                  onChange={(e) => setTabFilter(e.target.value)}
                  onClear={() => setTabFilter('')}
                />
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddingTab(!isAddingTab)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Link to Workspace
              </Button>
            </div>

            {/* Inline add tab form */}
            {isAddingTab && (
              <form
                onSubmit={handleAddManualTab}
                className="p-4 bg-blue-50/40 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-900/60 flex items-center gap-3 animate-in fade-in duration-150"
              >
                <Input
                  placeholder="Tab Title (e.g. Design Specs)"
                  value={newTabTitle}
                  onChange={(e) => setNewTabTitle(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="URL (e.g. https://github.com/...)"
                  value={newTabUrl}
                  onChange={(e) => setNewTabUrl(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" type="submit" variant="primary">
                  Add Tab
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsAddingTab(false)}>
                  Cancel
                </Button>
              </form>
            )}

            {/* Tab Cards View (Organized by Saved Groups) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {Object.keys(tabGroupsMap).length === 0 ? (
                <EmptyState
                  title="No Tabs in Workspace"
                  description="Add tabs to this workspace or save an active session."
                />
              ) : (
                Object.entries(tabGroupsMap).map(([groupName, groupTabs]) => (
                  <div key={groupName} className="space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          {groupName}
                        </h3>
                        <Badge size="sm" variant="info">
                          {groupTabs.length} tabs
                        </Badge>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[11px] h-6 px-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        onClick={() => {
                          if (targetGroupForUrl === groupName) {
                            setTargetGroupForUrl(null);
                          } else {
                            setTargetGroupForUrl(groupName);
                            setGroupTabTitle('');
                            setGroupTabUrl('');
                          }
                        }}
                        icon={<Plus className="w-3 h-3" />}
                      >
                        {targetGroupForUrl === groupName ? 'Close' : '+ Add URL to Group'}
                      </Button>
                    </div>

                    {/* Inline form to add URL directly to this specific group without opening it */}
                    {targetGroupForUrl === groupName && (
                      <form
                        onSubmit={handleAddTabToSpecificGroup}
                        className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex flex-wrap items-center gap-2.5 animate-in fade-in duration-150"
                      >
                        <div className="flex-1 min-w-[200px]">
                          <Input
                            placeholder="Title (optional, e.g. Roadmap Doc)"
                            value={groupTabTitle}
                            onChange={(e) => setGroupTabTitle(e.target.value)}
                          />
                        </div>
                        <div className="flex-1 min-w-[240px]">
                          <Input
                            placeholder="Paste URL (e.g. https://...)"
                            value={groupTabUrl}
                            onChange={(e) => setGroupTabUrl(e.target.value)}
                            required
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" type="submit" variant="primary">
                            Save to {groupName}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setTargetGroupForUrl(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {groupTabs.map((tab, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors group"
                        >
                          <div className="flex items-start gap-2.5">
                            {tab.favIconUrl ? (
                              <img
                                src={tab.favIconUrl}
                                alt=""
                                className="w-4 h-4 rounded shrink-0 mt-0.5"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                            ) : (
                              <Globe className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">
                                {tab.title}
                              </h4>
                              <p className="text-[10px] text-slate-400 truncate mt-1">{tab.url}</p>
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-medium">
                              {tab.groupName || 'Ungrouped'}
                            </span>
                            <div className="flex items-center gap-2">
                              <a
                                href={tab.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                              >
                                Open <ExternalLink className="w-3 h-3" />
                              </a>
                              <IconButton
                                size="sm"
                                ariaLabel="Remove tab from workspace"
                                variant="danger"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveSingleTab(selectedWs.tabs.indexOf(tab))}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </IconButton>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mb-4">
              <FolderHeart className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              No Workspace Selected
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
              Select an existing workspace from the left sidebar or save your current tabs into a
              workspace now.
            </p>
            <Button
              size="md"
              variant="primary"
              onClick={handleSaveCurrentSessionDirect}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              icon={<Sparkles className="w-4 h-4" />}
            >
              Save Open Tabs as New Workspace
            </Button>
          </div>
        )}
      </main>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        onClose={() => setDialogState((s) => ({ ...s, isOpen: false }))}
        onConfirm={dialogState.action}
      />

      {/* Cloud Settings Modal */}
      <CloudSettingsModal
        isOpen={isCloudOpen}
        appName="TabMind"
        collectionKey="workspaces"
        onClose={() => setIsCloudOpen(false)}
        onManualSync={async (settings) => {
          const client = new NeonCloudSyncClient({
            enabled: settings.enabled,
            endpointUrl: settings.neonEndpoint,
            authToken: settings.apiToken,
          });
          const success = await client.pushBackup('tabmind_workspaces', workspaces);
          return {
            success,
            message: success
              ? `Successfully backed up ${workspaces.length} workspaces to Neon!`
              : 'Failed to connect to Neon endpoint. Check your URL and token.',
          };
        }}
      />
    </div>
  );
};
