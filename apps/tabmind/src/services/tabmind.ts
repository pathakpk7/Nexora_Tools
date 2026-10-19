import { SavedTab, WorkspaceSession } from '@nexora/shared-types';
import { ChromeStorageAdapter } from '@nexora/storage';

const storage = new ChromeStorageAdapter<WorkspaceSession[]>('tabmind');
const WORKSPACES_KEY = 'workspaces';

export class TabMindService {
  /**
   * Retrieves all open tabs in current window (or all windows)
   */
  static async getOpenTabs(): Promise<chrome.tabs.Tab[]> {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      return new Promise((resolve) => {
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
          resolve(tabs || []);
        });
      });
    }
    // Mock development tabs if outside extension context
    return [
      { id: 1, title: 'GitHub - Nexora Tools', url: 'https://github.com/nexora/tools', active: true },
      { id: 2, title: 'React Documentation', url: 'https://react.dev', active: false },
      { id: 3, title: 'MDN Web Docs: Chrome Extensions', url: 'https://developer.mozilla.org', active: false },
      { id: 4, title: 'React Documentation (Duplicate)', url: 'https://react.dev/', active: false },
    ] as chrome.tabs.Tab[];
  }

  /**
   * Switches active tab
   */
  static async activateTab(tabId: number): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      await chrome.tabs.update(tabId, { active: true });
    }
  }

  /**
   * Closes an individual tab
   */
  static async closeTab(tabId: number): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      await chrome.tabs.remove(tabId);
    }
  }

  /**
   * Closes multiple tabs by ID
   */
  static async closeTabs(tabIds: number[]): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.tabs && tabIds.length > 0) {
      await chrome.tabs.remove(tabIds);
    }
  }

  /**
   * Group tabs by domain using Chrome Tab Groups API
   */
  static async groupTabsByDomain(): Promise<number> {
    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabGroups) {
      return 0;
    }

    const tabs = await this.getOpenTabs();
    const domainMap = new Map<string, number[]>();

    for (const tab of tabs) {
      if (!tab.id || !tab.url || tab.pinned) continue;
      try {
        const domain = new URL(tab.url).hostname.replace(/^www\./, '');
        const list = domainMap.get(domain) || [];
        list.push(tab.id);
        domainMap.set(domain, list);
      } catch {
        // ignore invalid urls
      }
    }

    let groupsCreated = 0;
    for (const [domain, tabIds] of domainMap.entries()) {
      if (tabIds.length >= 2) {
        const groupId = await chrome.tabs.group({ tabIds });
        await chrome.tabGroups.update(groupId, { title: domain });
        groupsCreated++;
      }
    }
    return groupsCreated;
  }

  /**
   * Retrieves all existing Chrome Tab Groups in the current window
   */
  static async getTabGroups(): Promise<chrome.tabGroups.TabGroup[]> {
    if (typeof chrome !== 'undefined' && chrome.tabGroups) {
      return new Promise((resolve) => {
        chrome.tabGroups.query({ windowId: chrome.windows.WINDOW_ID_CURRENT }, (groups) => {
          resolve(groups || []);
        });
      });
    }
    return [];
  }

  /**
   * Move a tab into an existing group
   */
  static async moveTabToGroup(tabId: number, groupId: number): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      await chrome.tabs.group({ tabIds: [tabId], groupId });
    }
  }

  /**
   * Create a new group with a tab and optional name
   */
  static async createGroupWithTab(tabId: number, title: string = 'New Group'): Promise<number> {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabGroups) {
      const groupId = await chrome.tabs.group({ tabIds: [tabId] });
      await chrome.tabGroups.update(groupId, { title, color: 'blue' });
      return groupId;
    }
    return 1;
  }

  /**
   * Remove a tab from its group (ungroup)
   */
  static async ungroupTab(tabId: number): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      await chrome.tabs.ungroup(tabId);
    }
  }

  /**
   * Directly creates a tab inside a group without opening in foreground
   */
  static async createTabInGroup(groupId: number, url: string): Promise<chrome.tabs.Tab | null> {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      let finalUrl = url.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `https://${finalUrl}`;
      }
      const newTab = await chrome.tabs.create({ url: finalUrl, active: false });
      if (newTab.id && groupId !== -1) {
        await chrome.tabs.group({ tabIds: [newTab.id], groupId });
      }
      return newTab;
    }
    return null;
  }

  /**
   * Directly creates an ungrouped background tab
   */
  static async createBackgroundTab(url: string): Promise<chrome.tabs.Tab | null> {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      let finalUrl = url.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = `https://${finalUrl}`;
      }
      return await chrome.tabs.create({ url: finalUrl, active: false });
    }
    return null;
  }

  /**
   * Loads all saved workspaces from persistent storage
   */
  static async getWorkspaces(): Promise<WorkspaceSession[]> {
    const list = await storage.get(WORKSPACES_KEY);
    return list || [];
  }

  /**
   * Saves current browsing session as a workspace (preserving all tab groups)
   */
  static async saveCurrentSession(name: string, description?: string): Promise<WorkspaceSession> {
    const [openTabs, tabGroups] = await Promise.all([this.getOpenTabs(), this.getTabGroups()]);
    const groupMap = new Map<number, chrome.tabGroups.TabGroup>();
    tabGroups.forEach((g) => groupMap.set(g.id, g));

    const validTabs: SavedTab[] = openTabs
      .filter((t) => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('edge://'))
      .map((t) => {
        const grp = t.groupId && t.groupId !== -1 ? groupMap.get(t.groupId) : undefined;
        return {
          id: String(t.id || Math.random()),
          title: t.title || 'Untitled Tab',
          url: t.url || '',
          favIconUrl: t.favIconUrl,
          pinned: t.pinned,
          groupName: grp?.title || undefined,
          groupColor: grp?.color || undefined,
        };
      });

    const groupsSummary = Array.from(groupMap.values()).map((g) => ({
      title: g.title || 'Untitled Group',
      color: g.color,
      tabCount: openTabs.filter((t) => t.groupId === g.id).length,
    }));

    const workspace: WorkspaceSession = {
      id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || 'Untitled Workspace',
      description,
      tabs: validTabs,
      groups: groupsSummary,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const current = await this.getWorkspaces();
    current.unshift(workspace);
    await storage.set(WORKSPACES_KEY, current);
    return workspace;
  }

  /**
   * Saves an individual Tab Group directly as a Workspace
   */
  static async saveGroupAsWorkspace(group: chrome.tabGroups.TabGroup): Promise<WorkspaceSession> {
    const openTabs = await this.getOpenTabs();
    const groupTabs = openTabs.filter((t) => t.groupId === group.id);

    const validTabs: SavedTab[] = groupTabs
      .filter((t) => t.url && !t.url.startsWith('chrome://'))
      .map((t) => ({
        id: String(t.id || Math.random()),
        title: t.title || 'Untitled Tab',
        url: t.url || '',
        favIconUrl: t.favIconUrl,
        pinned: t.pinned,
        groupName: group.title || 'Group',
        groupColor: group.color,
      }));

    const workspace: WorkspaceSession = {
      id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: group.title || 'Saved Tab Group',
      description: `Saved from Tab Group with ${validTabs.length} tabs`,
      color: group.color,
      tabs: validTabs,
      groups: [{ title: group.title || 'Group', color: group.color, tabCount: validTabs.length }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const current = await this.getWorkspaces();
    current.unshift(workspace);
    await storage.set(WORKSPACES_KEY, current);
    return workspace;
  }

  /**
   * Updates an existing workspace
   */
  static async updateWorkspace(id: string, updates: Partial<WorkspaceSession>): Promise<void> {
    const current = await this.getWorkspaces();
    const idx = current.findIndex((w) => w.id === id);
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...updates, updatedAt: Date.now() };
      await storage.set(WORKSPACES_KEY, current);
    }
  }

  /**
   * Deletes a workspace
   */
  static async deleteWorkspace(id: string): Promise<void> {
    let current = await this.getWorkspaces();
    current = current.filter((w) => w.id !== id);
    await storage.set(WORKSPACES_KEY, current);
  }

  /**
   * Restores a workspace session, recreating any saved Tab Groups automatically!
   */
  static async restoreWorkspace(workspace: WorkspaceSession, inNewWindow = false): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      console.log('Restoring workspace (dev):', workspace.name, workspace.tabs);
      return;
    }

    const validTabs = workspace.tabs.filter((t) => t.url);
    if (validTabs.length === 0) return;

    let targetWindowId: number | undefined;

    if (inNewWindow && chrome.windows) {
      const win = await chrome.windows.create({ url: validTabs[0].url });
      targetWindowId = win.id;
      // Open the rest of the tabs in this new window
      for (let i = 1; i < validTabs.length; i++) {
        await chrome.tabs.create({ url: validTabs[i].url, windowId: targetWindowId, active: false });
      }
    } else {
      for (const tab of validTabs) {
        await chrome.tabs.create({ url: tab.url, active: false });
      }
    }

    // Regroup tabs if Chrome Tab Groups API is supported
    if (chrome.tabGroups && targetWindowId) {
      const windowTabs = await chrome.tabs.query({ windowId: targetWindowId });
      const groupMap = new Map<string, number[]>();

      windowTabs.forEach((tab) => {
        const matchingSaved = validTabs.find((vt) => vt.url === tab.url && vt.groupName);
        if (matchingSaved && matchingSaved.groupName && tab.id) {
          const list = groupMap.get(matchingSaved.groupName) || [];
          list.push(tab.id);
          groupMap.set(matchingSaved.groupName, list);
        }
      });

      for (const [groupName, tabIds] of groupMap.entries()) {
        if (tabIds.length > 0) {
          const gid = await chrome.tabs.group({ tabIds });
          await chrome.tabGroups.update(gid, { title: groupName });
        }
      }
    }
  }
}
