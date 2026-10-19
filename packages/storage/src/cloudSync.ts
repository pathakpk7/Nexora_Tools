// ==========================================
// OPTIONAL CLOUD SYNC ADAPTER (NEON POSTGRES)
// ==========================================
// By default, Nexora Tools operates local-first.
// This module provides an optional sync gateway allowing users to optionally
// connect a Neon Serverless Postgres DB endpoint or HTTPS sync proxy.

export interface CloudSyncConfig {
  enabled: boolean;
  endpointUrl?: string;
  authToken?: string;
}

export interface CloudSyncStatus {
  lastSyncTimestamp: number | null;
  status: 'idle' | 'syncing' | 'error' | 'success';
  message?: string;
}

export class NeonCloudSyncClient {
  private config: CloudSyncConfig;

  constructor(config: CloudSyncConfig) {
    this.config = config;
  }

  public isConfigured(): boolean {
    return Boolean(this.config.enabled && this.config.endpointUrl);
  }

  /**
   * Optionally backup or push local items to Neon HTTP query gateway
   */
  public async pushBackup<T>(collectionName: string, items: T[]): Promise<boolean> {
    if (!this.isConfigured() || !this.config.endpointUrl) {
      console.warn('[NeonCloudSync] Sync is disabled or endpoint not configured.');
      return false;
    }

    try {
      const response = await fetch(`${this.config.endpointUrl}/api/v1/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.authToken ? { Authorization: `Bearer ${this.config.authToken}` } : {}),
        },
        body: JSON.stringify({
          collection: collectionName,
          timestamp: Date.now(),
          payload: items,
        }),
      });

      return response.ok;
    } catch (err) {
      console.error('[NeonCloudSync] Sync failure:', err);
      return false;
    }
  }

  /**
   * Optionally pull remote items from Neon HTTP query gateway
   */
  public async pullBackup<T>(collectionName: string): Promise<T[] | null> {
    if (!this.isConfigured() || !this.config.endpointUrl) {
      return null;
    }

    try {
      const response = await fetch(`${this.config.endpointUrl}/api/v1/sync?collection=${encodeURIComponent(collectionName)}`, {
        method: 'GET',
        headers: {
          ...(this.config.authToken ? { Authorization: `Bearer ${this.config.authToken}` } : {}),
        },
      });

      if (!response.ok) return null;
      const data = await response.json();
      return (data?.payload as T[]) || null;
    } catch (err) {
      console.error('[NeonCloudSync] Pull failure:', err);
      return null;
    }
  }
}
