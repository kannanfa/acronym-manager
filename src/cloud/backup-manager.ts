import { Acronym, AcronymManager, CloudSyncProvider } from '../core/types';
import { GoogleDriveSyncProvider } from './google-drive-sync';
import { ICloudSyncProvider } from './icloud-sync';

export type BackupProviderType = 'google-drive' | 'icloud';

export interface BackupConfig {
  provider: BackupProviderType;
  accessToken: string;
  containerId?: string; // Required for iCloud
  backupFileName?: string;
  backupFolderName?: string; // For Google Drive
}

export class BackupManager {
  private acronymManager: AcronymManager;
  private syncProvider: CloudSyncProvider | null = null;
  private lastBackupTime: Date | null = null;
  private autoBackupInterval: number | null = null;
  private isBackingUp: boolean = false;

  constructor(acronymManager: AcronymManager) {
    this.acronymManager = acronymManager;
  }

  async configureBackup(config: BackupConfig): Promise<void> {
    switch (config.provider) {
      case 'google-drive':
        this.syncProvider = new GoogleDriveSyncProvider(
          config.accessToken,
          config.backupFileName,
          config.backupFolderName
        );
        break;
      case 'icloud':
        if (!config.containerId) {
          throw new Error('Container ID is required for iCloud backup');
        }
        this.syncProvider = new ICloudSyncProvider(
          config.accessToken,
          config.containerId,
          config.backupFileName
        );
        break;
      default:
        throw new Error(`Unsupported backup provider: ${config.provider}`);
    }

    // Get the last sync time
    this.lastBackupTime = await this.syncProvider.getLastSyncTime();
  }

  async backup(): Promise<void> {
    if (!this.syncProvider) {
      throw new Error('Backup provider not configured');
    }

    if (this.isBackingUp) {
      console.log('Backup already in progress');
      return;
    }

    try {
      this.isBackingUp = true;
      
      // Get all acronyms
      const acronyms = await this.acronymManager.getAllAcronyms();
      
      // Upload to cloud
      await this.syncProvider.uploadBackup(acronyms);
      
      // Update last backup time
      this.lastBackupTime = new Date();
      
      console.log('Backup completed successfully');
    } catch (error) {
      console.error('Error during backup:', error);
      throw error;
    } finally {
      this.isBackingUp = false;
    }
  }

  async restore(): Promise<void> {
    if (!this.syncProvider) {
      throw new Error('Backup provider not configured');
    }

    try {
      // Download backup from cloud
      const acronyms = await this.syncProvider.downloadBackup();
      
      if (acronyms.length === 0) {
        console.log('No backup found to restore');
        return;
      }
      
      // Clear existing acronyms (this would need to be implemented in the AcronymManager)
      if ('clearAcronyms' in this.acronymManager) {
        await (this.acronymManager as any).clearAcronyms();
      } else {
        console.warn('clearAcronyms method not available in AcronymManager');
      }
      
      // Add restored acronyms
      for (const acronym of acronyms) {
        // We need to omit the id, createdAt, updatedAt, and usageCount fields
        const { id, createdAt, updatedAt, usageCount, ...acronymData } = acronym;
        await this.acronymManager.addAcronym(acronymData);
      }
      
      console.log(`Restored ${acronyms.length} acronyms successfully`);
    } catch (error) {
      console.error('Error during restore:', error);
      throw error;
    }
  }

  async startAutoBackup(intervalMinutes: number = 60): Promise<void> {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
    }
    
    // Convert minutes to milliseconds
    const intervalMs = intervalMinutes * 60 * 1000;
    
    // Perform initial backup
    await this.backup();
    
    // Set up interval for automatic backups
    this.autoBackupInterval = window.setInterval(async () => {
      await this.backup();
    }, intervalMs);
    
    console.log(`Auto backup started with interval of ${intervalMinutes} minutes`);
  }

  stopAutoBackup(): void {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
      this.autoBackupInterval = null;
      console.log('Auto backup stopped');
    }
  }

  getLastBackupTime(): Date | null {
    return this.lastBackupTime;
  }

  isConfigured(): boolean {
    return this.syncProvider !== null;
  }
} 