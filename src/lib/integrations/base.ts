/**
 * Base interface for all external service integrations.
 */

export interface IntegrationMetadata {
  id: string;
  name: string;
  description: string;
  connected: boolean;
  userEmail?: string;
  scopesGranted: string[];
  lastSyncedAt?: string;
  isMock: boolean;
}

export interface IIntegrationAdapter {
  metadata(): Promise<IntegrationMetadata>;
  isConnected(): Promise<boolean>;
  disconnect(): Promise<void>;
}
