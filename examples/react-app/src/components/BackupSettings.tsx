import React, { useState, useEffect } from 'react';
import { BackupManager, BackupConfig, BackupProviderType } from 'acronym-manager';
import { SQLiteAcronymManager } from 'acronym-manager';
import './BackupSettings.css';

interface BackupSettingsProps {
  acronymManager: SQLiteAcronymManager;
}

const BackupSettings: React.FC<BackupSettingsProps> = ({ acronymManager }) => {
  const [backupManager, setBackupManager] = useState<BackupManager | null>(null);
  const [provider, setProvider] = useState<BackupProviderType>('google-drive');
  const [accessToken, setAccessToken] = useState<string>('');
  const [containerId, setContainerId] = useState<string>('');
  const [backupFileName, setBackupFileName] = useState<string>('acronyms-backup.json');
  const [backupFolderName, setBackupFolderName] = useState<string>('AcronymManager');
  const [autoBackupInterval, setAutoBackupInterval] = useState<number>(60);
  const [lastBackupTime, setLastBackupTime] = useState<Date | null>(null);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Initialize backup manager
    const manager = new BackupManager(acronymManager);
    setBackupManager(manager);
  }, [acronymManager]);

  const handleConfigureBackup = async () => {
    if (!backupManager) return;

    try {
      setError(null);
      setSuccess(null);

      const config: BackupConfig = {
        provider,
        accessToken,
        backupFileName,
        ...(provider === 'google-drive' && { backupFolderName }),
        ...(provider === 'icloud' && { containerId })
      };

      await backupManager.configureBackup(config);
      setLastBackupTime(backupManager.getLastBackupTime());
      setSuccess('Backup configured successfully');
    } catch (err) {
      setError(`Error configuring backup: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleBackup = async () => {
    if (!backupManager) return;

    try {
      setError(null);
      setSuccess(null);
      setIsBackingUp(true);

      await backupManager.backup();
      setLastBackupTime(backupManager.getLastBackupTime());
      setSuccess('Backup completed successfully');
    } catch (err) {
      setError(`Error during backup: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!backupManager) return;

    try {
      setError(null);
      setSuccess(null);
      setIsRestoring(true);

      await backupManager.restore();
      setSuccess('Restore completed successfully');
    } catch (err) {
      setError(`Error during restore: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleStartAutoBackup = async () => {
    if (!backupManager) return;

    try {
      setError(null);
      setSuccess(null);

      await backupManager.startAutoBackup(autoBackupInterval);
      setSuccess(`Auto backup started with interval of ${autoBackupInterval} minutes`);
    } catch (err) {
      setError(`Error starting auto backup: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleStopAutoBackup = () => {
    if (!backupManager) return;

    try {
      setError(null);
      setSuccess(null);

      backupManager.stopAutoBackup();
      setSuccess('Auto backup stopped');
    } catch (err) {
      setError(`Error stopping auto backup: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="backup-settings">
      <h2>Backup & Restore</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div className="form-group">
        <label htmlFor="provider">Backup Provider:</label>
        <select
          id="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as BackupProviderType)}
        >
          <option value="google-drive">Google Drive</option>
          <option value="icloud">iCloud</option>
        </select>
      </div>
      
      <div className="form-group">
        <label htmlFor="accessToken">Access Token:</label>
        <input
          type="text"
          id="accessToken"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder="Enter access token"
        />
      </div>
      
      {provider === 'icloud' && (
        <div className="form-group">
          <label htmlFor="containerId">Container ID:</label>
          <input
            type="text"
            id="containerId"
            value={containerId}
            onChange={(e) => setContainerId(e.target.value)}
            placeholder="Enter iCloud container ID"
          />
        </div>
      )}
      
      {provider === 'google-drive' && (
        <div className="form-group">
          <label htmlFor="backupFolderName">Folder Name:</label>
          <input
            type="text"
            id="backupFolderName"
            value={backupFolderName}
            onChange={(e) => setBackupFolderName(e.target.value)}
            placeholder="Enter backup folder name"
          />
        </div>
      )}
      
      <div className="form-group">
        <label htmlFor="backupFileName">Backup File Name:</label>
        <input
          type="text"
          id="backupFileName"
          value={backupFileName}
          onChange={(e) => setBackupFileName(e.target.value)}
          placeholder="Enter backup file name"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="autoBackupInterval">Auto Backup Interval (minutes):</label>
        <input
          type="number"
          id="autoBackupInterval"
          value={autoBackupInterval}
          onChange={(e) => setAutoBackupInterval(parseInt(e.target.value, 10))}
          min="1"
          max="1440"
        />
      </div>
      
      <div className="button-group">
        <button onClick={handleConfigureBackup} disabled={!accessToken || (provider === 'icloud' && !containerId)}>
          Configure Backup
        </button>
        <button onClick={handleBackup} disabled={!backupManager?.isConfigured() || isBackingUp}>
          {isBackingUp ? 'Backing Up...' : 'Backup Now'}
        </button>
        <button onClick={handleRestore} disabled={!backupManager?.isConfigured() || isRestoring}>
          {isRestoring ? 'Restoring...' : 'Restore'}
        </button>
        <button onClick={handleStartAutoBackup} disabled={!backupManager?.isConfigured()}>
          Start Auto Backup
        </button>
        <button onClick={handleStopAutoBackup} disabled={!backupManager?.isConfigured()}>
          Stop Auto Backup
        </button>
      </div>
      
      {lastBackupTime && (
        <div className="last-backup">
          <p>Last backup: {lastBackupTime.toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};

export default BackupSettings; 