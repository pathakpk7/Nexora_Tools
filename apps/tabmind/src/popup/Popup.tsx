import React, { useState, useEffect } from 'react';
import {
  Button,
  IconButton,
  SearchInput,
  Badge,
  ConfirmationDialog,
  EmptyState,
  CloudSettingsModal,
} from '@nexora/ui';
import { WorkspaceSession } from '@nexora/shared-types';
import { extractDomain, findDuplicateUrls } from '@nexora/browser-utils';
import { TabMindService } from '../services/tabmind';
import {
  LayoutGrid,
  Layers,
  Trash2,
  ExternalLink,
  BookmarkPlus,
  Sparkles,
  FolderDown,
  Cloud,
  FolderPlus,
  Edit2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';
import { NeonCloudSyncClient } from '@nexora/storage';

export const TabMindPopup: React.FC = () => {
  const [activeView, setActiveView] = useState<'tabs' | 'workspaces'>('tabs');
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [groups, setGroups] = useState<chrome.tabGroups.TabGroup[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceSession[]>([]);
  const [search, setSearch] = useState('');
  const [newWsName, setNewWsName] = useState('');
  const [isSavingWs, setIsSavingWs] = useState(false);
  const [isCloudOpen, setIsCloudOpen] = useState(false);

  // Group editing state
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<number, boolean>>({});

  // Drag and drop state
  const [draggedTabId, setDraggedTabId] = useState<number | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<number | 'ungrouped' | null>(null);

  // New Group input modal
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // Quick add URL directly to group
  const [quickAddGroupId, setQuickAddGroupId] = useState<number | null>(null);
  const [quickAddUrl, setQuickAddUrl] = useState('');

  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({ isOpen: false, title: '', message: '', action: () => {} });

  const loadData = async () => {
    const [openTabs, tabGroups, savedWs] = await Promise.all([
      TabMindService.getOpenTabs(),
      TabMindService.getTabGroups(),
      TabMindService.getWorkspaces(),
    ]);
    setTabs(openTabs);
    setGroups(tabGroups);
    setWorkspaces(savedWs);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTabs = tabs.filter((t) => {
    const q = search.toLowerCase();
    return (t.title?.toLowerCase() || '').includes(q) || (t.url?.toLowerCase() || '').includes(q);
  });

  const duplicates = findDuplicateUrls(tabs);
  const duplicateCount = Array.from(duplicates.values()).reduce(
    (sum, list) => sum + (list.length - 1),
    0
  );

  const handleCloseTab = async (tabId?: number) => {
    if (!tabId) return;
    await TabMindService.closeTab(tabId);
    setTabs((prev) => prev.filter((t) => t.id !== tabId));
  };

  const handleCloseDuplicates = () => {
    const toRemove: number[] = [];
    for (const list of duplicates.values()) {
      for (let i = 1; i < list.length; i++) {
        if (list[i].id) toRemove.push(list[i].id as number);
      }
    }
    setDialogState({
      isOpen: true,
      title: 'Close Duplicate Tabs',
      message: `Are you sure you want to close ${toRemove.length} duplicate tab${toRemove.length === 1 ? '' : 's'}?`,
      action: async () => {
        await TabMindService.closeTabs(toRemove);
        await loadData();
      },
    });
  };

  const handleGroupTabs = async () => {
    await TabMindService.groupTabsByDomain();
    await loadData();
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, tabId: number) => {
    setDraggedTabId(tabId);
    e.dataTransfer.setData('text/plain', String(tabId));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, target: number | 'ungrouped') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget(target);
  };

  const handleDropOnGroup = async (e: React.DragEvent, groupId: number) => {
    e.preventDefault();
    setDragOverTarget(null);
    const tabId = Number(e.dataTransfer.getData('text/plain')) || draggedTabId;
    if (!tabId) return;

    await TabMindService.moveTabToGroup(tabId, groupId);
    setDraggedTabId(null);
    await loadData();
  };

  const handleDropOnUngrouped = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
    const tabId = Number(e.dataTransfer.getData('text/plain')) || draggedTabId;
    if (!tabId) return;

    await TabMindService.ungroupTab(tabId);
    setDraggedTabId(null);
    await loadData();
  };

  // Rename Group
  const handleStartRename = (group: chrome.tabGroups.TabGroup) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.title || 'Group');
  };

  const handleSaveRename = async (groupId: number) => {
    if (!editingGroupName.trim()) return;
    await TabMindService.updateGroup(groupId, editingGroupName.trim());
    setEditingGroupId(null);
    await loadData();
  };

  // Create new group
  const handleCreateNewGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || tabs.length === 0) return;
    const firstTab = tabs.find((t) => t.id && t.groupId === -1) || tabs[0];
    if (firstTab?.id) {
      await TabMindService.createGroupWithTab(firstTab.id, newGroupName.trim());
      setNewGroupName('');
      setIsCreatingGroup(false);
      await loadData();
    }
  };

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    await TabMindService.saveCurrentSession(newWsName.trim());
    setNewWsName('');
    setIsSavingWs(false);
    await loadData();
  };

  const openDashboard = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
    }
  };

  // Organize filtered tabs by group
  const groupMap = new Map<number, chrome.tabGroups.TabGroup>();
  groups.forEach((g) => groupMap.set(g.id, g));

  const groupedTabs: Record<number, chrome.tabs.Tab[]> = {};
  const ungroupedTabs: chrome.tabs.Tab[] = [];

  filteredTabs.forEach((tab) => {
    if (tab.groupId && tab.groupId !== -1 && groupMap.has(tab.groupId)) {
      if (!groupedTabs[tab.groupId]) groupedTabs[tab.groupId] = [];
      groupedTabs[tab.groupId].push(tab);
    } else {
      ungroupedTabs.push(tab);
    }
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 select-none text-slate-800 dark:text-slate-100">
      {/* Top Header */}
      <header className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
            T
          </div>
          <span className="font-semibold text-sm tracking-tight text-slate-800 dark:text-slate-100">
            TabMind
          </span>
          <Badge size="sm" variant="info">
            {tabs.length} tabs
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            size="sm"
            ariaLabel="Cloud Backup (Neon)"
            onClick={() => setIsCloudOpen(true)}
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </IconButton>
          <IconButton size="sm" ariaLabel="Open Full Dashboard" onClick={openDashboard}>
            <ExternalLink className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </header>

      {/* Tabs / Workspaces Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-medium">
        <button
          onClick={() => setActiveView('tabs')}
          className={`flex-1 py-2 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
            activeView === 'tabs'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Open Tabs & Groups
        </button>
        <button
          onClick={() => setActiveView('workspaces')}
          className={`flex-1 py-2 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
            activeView === 'workspaces'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" /> Workspaces ({workspaces.length})
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeView === 'tabs' ? (
          <>
            {/* Search and Action Toolbar */}
            <div className="p-2.5 border-b border-slate-100 dark:border-slate-800/80 space-y-2">
              <SearchInput
                placeholder="Search open tabs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClear={() => setSearch('')}
              />
              <div className="flex items-center justify-between text-xs pt-0.5">
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleGroupTabs}
                    className="h-7 text-xs"
                    title="Automatically create groups by domain"
                  >
                    <Sparkles className="w-3 h-3 mr-1 text-blue-600" /> Auto Group
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsCreatingGroup(!isCreatingGroup)}
                    className="h-7 text-xs text-blue-600"
                  >
                    <FolderPlus className="w-3 h-3 mr-1" /> New Group
                  </Button>
                </div>
                {duplicateCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCloseDuplicates}
                    className="h-7 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900"
                  >
                    Close {duplicateCount} dups
                  </Button>
                )}
              </div>

              {/* New Group Inline Form */}
              {isCreatingGroup && (
                <form onSubmit={handleCreateNewGroup} className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Group name (e.g. Study, Work)..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs rounded border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Button size="sm" type="submit" variant="primary">
                    Create
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsCreatingGroup(false)}>
                    Cancel
                  </Button>
                </form>
              )}
            </div>

            {/* Scrollable Groups & Tabs Container */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {filteredTabs.length === 0 ? (
                <div className="p-8">
                  <EmptyState title="No tabs found" description="Try a different search query" />
                </div>
              ) : (
                <>
                  {/* Render Chrome Tab Groups */}
                  {groups.map((group) => {
                    const groupTabList = groupedTabs[group.id] || [];
                    const isCollapsed = collapsedGroups[group.id];
                    const isDragOver = dragOverTarget === group.id;

                    return (
                      <div
                        key={group.id}
                        onDragOver={(e) => handleDragOver(e, group.id)}
                        onDragLeave={() => setDragOverTarget(null)}
                        onDrop={(e) => handleDropOnGroup(e, group.id)}
                        className={`rounded-xl border transition-all ${
                          isDragOver
                            ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-400'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60'
                        }`}
                      >
                        {/* Group Header */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/60 dark:border-slate-800/60">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() =>
                                setCollapsedGroups((prev) => ({
                                  ...prev,
                                  [group.id]: !prev[group.id],
                                }))
                              }
                              className="text-slate-400 hover:text-slate-600"
                            >
                              {isCollapsed ? (
                                <ChevronRight className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {editingGroupId === group.id ? (
                              <div className="flex items-center gap-1.5 flex-1 pr-2">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingGroupName}
                                  onChange={(e) => setEditingGroupName(e.target.value)}
                                  className="px-2 py-0.5 text-xs font-semibold rounded border border-blue-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 flex-1"
                                />
                                <IconButton
                                  size="sm"
                                  ariaLabel="Save group name"
                                  onClick={() => handleSaveRename(group.id)}
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                </IconButton>
                                <IconButton
                                  size="sm"
                                  ariaLabel="Cancel"
                                  onClick={() => setEditingGroupId(null)}
                                >
                                  <X className="w-3.5 h-3.5 text-slate-400" />
                                </IconButton>
                              </div>
                            ) : (
                              <div
                                className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                                onClick={() => handleStartRename(group)}
                                title="Click to rename group"
                              >
                                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                                  {group.title || 'Untitled Group'}
                                </span>
                                <Badge size="sm" variant="info">
                                  {groupTabList.length} tabs
                                </Badge>
                                <Edit2 className="w-3 h-3 text-slate-400 hover:text-blue-600 opacity-60 hover:opacity-100" />
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickAddGroupId(quickAddGroupId === group.id ? null : group.id);
                              }}
                              className="text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1"
                              title="Add a URL directly into this group without opening it"
                            >
                              + URL
                            </button>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await TabMindService.saveGroupAsWorkspace(group);
                                await loadData();
                                setActiveView('workspaces');
                              }}
                              className="text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/60 inline-flex items-center gap-1"
                              title="Save this group as a persistent Workspace"
                            >
                              <BookmarkPlus className="w-3 h-3" /> Save as Workspace
                            </button>
                          </div>
                        </div>

                        {/* Inline Quick Add URL to Group Form */}
                        {quickAddGroupId === group.id && (
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (!quickAddUrl.trim()) return;
                              await TabMindService.createTabInGroup(group.id, quickAddUrl.trim());
                              setQuickAddUrl('');
                              setQuickAddGroupId(null);
                              await loadData();
                            }}
                            className="p-2 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center gap-1.5 bg-blue-50/40 dark:bg-blue-950/20"
                          >
                            <input
                              type="text"
                              autoFocus
                              placeholder="Paste URL (e.g. github.com)..."
                              value={quickAddUrl}
                              onChange={(e) => setQuickAddUrl(e.target.value)}
                              className="flex-1 px-2 py-1 text-xs rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <Button size="sm" type="submit" variant="primary" className="h-6 text-[11px] px-2">
                              Add
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[11px] px-1.5"
                              onClick={() => setQuickAddGroupId(null)}
                            >
                              Cancel
                            </Button>
                          </form>
                        )}

                        {/* Tabs inside this group */}
                        {!isCollapsed && (
                          <div className="divide-y divide-slate-100 dark:divide-slate-800/40 p-1">
                            {groupTabList.length === 0 ? (
                              <div className="p-3 text-center text-[11px] text-slate-400 italic">
                                Drop tabs here to add to this group
                              </div>
                            ) : (
                              groupTabList.map((tab) => renderTabItem(tab, true))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Ungrouped Tabs Section */}
                  <div
                    onDragOver={(e) => handleDragOver(e, 'ungrouped')}
                    onDragLeave={() => setDragOverTarget(null)}
                    onDrop={handleDropOnUngrouped}
                    className={`rounded-xl border transition-all ${
                      dragOverTarget === 'ungrouped'
                        ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 flex items-center justify-between">
                      <span>Ungrouped Tabs ({ungroupedTabs.length})</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Drag tabs between groups or here
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800/40 p-1">
                      {ungroupedTabs.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 italic">
                          All tabs are currently organized into groups!
                        </div>
                      ) : (
                        ungroupedTabs.map((tab) => renderTabItem(tab, false))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Save Workspace Action */}
            <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
              {isSavingWs ? (
                <form onSubmit={handleSaveWorkspace} className="flex gap-1.5">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Workspace name (e.g. Research)..."
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <Button size="sm" type="submit" variant="primary">
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsSavingWs(false)}>
                    Cancel
                  </Button>
                </form>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-center"
                  onClick={() => setIsSavingWs(true)}
                  icon={<BookmarkPlus className="w-3.5 h-3.5 text-blue-600" />}
                >
                  Save Current Tabs as Workspace
                </Button>
              )}
            </div>
          </>
        ) : (
          /* Workspaces View */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {workspaces.length === 0 ? (
                <EmptyState
                  title="No saved workspaces"
                  description="Save your open tabs as named workspaces to resume projects anytime."
                  action={{
                    label: 'Save Open Session',
                    onClick: () => {
                      setActiveView('tabs');
                      setIsSavingWs(true);
                    },
                  }}
                />
              ) : (
                workspaces.map((ws) => (
                  <div
                    key={ws.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                          {ws.name}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {ws.tabs.length} tabs • Updated{' '}
                          {new Date(ws.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <IconButton
                        size="sm"
                        ariaLabel="Delete workspace"
                        onClick={() =>
                          setDialogState({
                            isOpen: true,
                            title: 'Delete Workspace',
                            message: `Delete workspace "${ws.name}"? This cannot be undone.`,
                            action: async () => {
                              await TabMindService.deleteWorkspace(ws.id);
                              await loadData();
                            },
                          })
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-500" />
                      </IconButton>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs flex-1 h-7"
                        onClick={() => TabMindService.restoreWorkspace(ws, false)}
                        icon={<FolderDown className="w-3 h-3 text-blue-600" />}
                      >
                        Restore Tabs
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => TabMindService.restoreWorkspace(ws, true)}
                      >
                        New Window
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={dialogState.isOpen}
        title={dialogState.title}
        message={dialogState.message}
        onClose={() => setDialogState((s) => ({ ...s, isOpen: false }))}
        onConfirm={dialogState.action}
      />

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

  // Helper render item for draggable tabs
  function renderTabItem(tab: chrome.tabs.Tab, isInGroup: boolean) {
    const domain = extractDomain(tab.url);
    const isBeingDragged = draggedTabId === tab.id;

    return (
      <div
        key={tab.id}
        draggable
        onDragStart={(e) => tab.id && handleDragStart(e, tab.id)}
        className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors group cursor-grab active:cursor-grabbing ${
          isBeingDragged ? 'opacity-40 bg-blue-100 dark:bg-blue-900/40' : ''
        } ${
          tab.active
            ? 'bg-blue-50/70 dark:bg-blue-950/30'
            : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <GripVertical className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 shrink-0" />
          <div
            className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
            onClick={() => tab.id && TabMindService.activateTab(tab.id)}
          >
            {tab.favIconUrl ? (
              <img
                src={tab.favIconUrl}
                alt=""
                className="w-3.5 h-3.5 rounded shrink-0"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            ) : (
              <div className="w-3.5 h-3.5 rounded bg-slate-200 dark:bg-slate-700 shrink-0" />
            )}
            <div className="min-w-0 flex-1 pr-1">
              <p className="truncate font-medium text-slate-800 dark:text-slate-200 leading-tight">
                {tab.title || 'Untitled'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">{domain}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isInGroup && (
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                if (tab.id) {
                  await TabMindService.ungroupTab(tab.id);
                  await loadData();
                }
              }}
              className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700"
              title="Ungroup this tab"
            >
              Ungroup
            </button>
          )}
          <IconButton
            size="sm"
            variant="ghost"
            ariaLabel="Close tab"
            onClick={(e) => {
              e.stopPropagation();
              handleCloseTab(tab.id);
            }}
          >
            <Trash2 className="w-3 h-3 text-slate-400 hover:text-rose-500" />
          </IconButton>
        </div>
      </div>
    );
  }
};
