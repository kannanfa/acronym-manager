import { Acronym, CloudSyncProvider } from '../core/types';

export class ICloudSyncProvider implements CloudSyncProvider {
  private accessToken: string;
  private backupFileName: string;
  private containerId: string;

  constructor(accessToken: string, containerId: string, backupFileName: string = 'acronyms-backup.json') {
    this.accessToken = accessToken;
    this.containerId = containerId;
    this.backupFileName = backupFileName;
  }

  async uploadBackup(data: Acronym[]): Promise<void> {
    const backupData = {
      acronyms: data,
      lastBackup: new Date().toISOString()
    };
    
    const jsonData = JSON.stringify(backupData, null, 2);
    
    try {
      // Check if file exists
      const fileExists = await this.fileExists();
      
      if (fileExists) {
        // Update existing file
        await this.updateFile(jsonData);
      } else {
        // Create new file
        await this.createFile(jsonData);
      }
    } catch (error) {
      console.error('Error uploading backup to iCloud:', error);
      throw error;
    }
  }

  async downloadBackup(): Promise<Acronym[]> {
    try {
      const response = await fetch(`https://api.apple-cloudkit.com/database/1/${this.containerId}/public/records/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Apple-CloudKit-Request-ISO8601Date': new Date().toISOString(),
          'X-Apple-CloudKit-Request-KeyID': this.containerId
        },
        body: JSON.stringify({
          recordType: 'AcronymBackup',
          query: {
            filterBy: [{
              comparator: 'EQUALS',
              fieldName: 'name',
              fieldValue: { value: this.backupFileName }
            }]
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download backup: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.records || result.records.length === 0) {
        return [];
      }
      
      const record = result.records[0];
      const backupData = JSON.parse(record.fields.data.value);
      return backupData.acronyms || [];
    } catch (error) {
      console.error('Error downloading backup from iCloud:', error);
      return [];
    }
  }

  async getLastSyncTime(): Promise<Date> {
    try {
      const response = await fetch(`https://api.apple-cloudkit.com/database/1/${this.containerId}/public/records/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Apple-CloudKit-Request-ISO8601Date': new Date().toISOString(),
          'X-Apple-CloudKit-Request-KeyID': this.containerId
        },
        body: JSON.stringify({
          recordType: 'AcronymBackup',
          query: {
            filterBy: [{
              comparator: 'EQUALS',
              fieldName: 'name',
              fieldValue: { value: this.backupFileName }
            }]
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get last sync time: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.records || result.records.length === 0) {
        return new Date(0);
      }
      
      const record = result.records[0];
      return new Date(record.modificationDate);
    } catch (error) {
      console.error('Error getting last sync time from iCloud:', error);
      return new Date(0);
    }
  }

  private async fileExists(): Promise<boolean> {
    try {
      const response = await fetch(`https://api.apple-cloudkit.com/database/1/${this.containerId}/public/records/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Apple-CloudKit-Request-ISO8601Date': new Date().toISOString(),
          'X-Apple-CloudKit-Request-KeyID': this.containerId
        },
        body: JSON.stringify({
          recordType: 'AcronymBackup',
          query: {
            filterBy: [{
              comparator: 'EQUALS',
              fieldName: 'name',
              fieldValue: { value: this.backupFileName }
            }]
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to check if file exists: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.records && result.records.length > 0;
    } catch (error) {
      console.error('Error checking if file exists in iCloud:', error);
      return false;
    }
  }

  private async createFile(content: string): Promise<void> {
    const response = await fetch(`https://api.apple-cloudkit.com/database/1/${this.containerId}/public/records/modify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Apple-CloudKit-Request-ISO8601Date': new Date().toISOString(),
        'X-Apple-CloudKit-Request-KeyID': this.containerId
      },
      body: JSON.stringify({
        operations: [{
          operationType: 'CREATE',
          record: {
            recordType: 'AcronymBackup',
            fields: {
              name: { value: this.backupFileName },
              data: { value: content },
              lastModified: { value: new Date().toISOString() }
            }
          }
        }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create file: ${response.statusText}`);
    }
  }

  private async updateFile(content: string): Promise<void> {
    // First, get the record ID
    const recordId = await this.getRecordId();
    if (!recordId) {
      throw new Error('Record ID not found');
    }
    
    const response = await fetch(`https://api.apple-cloudkit.com/database/1/${this.containerId}/public/records/modify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Apple-CloudKit-Request-ISO8601Date': new Date().toISOString(),
        'X-Apple-CloudKit-Request-KeyID': this.containerId
      },
      body: JSON.stringify({
        operations: [{
          operationType: 'UPDATE',
          record: {
            recordName: recordId,
            recordType: 'AcronymBackup',
            fields: {
              data: { value: content },
              lastModified: { value: new Date().toISOString() }
            }
          }
        }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update file: ${response.statusText}`);
    }
  }

  private async getRecordId(): Promise<string | null> {
    try {
      const response = await fetch(`https://api.apple-cloudkit.com/database/1/${this.containerId}/public/records/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Apple-CloudKit-Request-ISO8601Date': new Date().toISOString(),
          'X-Apple-CloudKit-Request-KeyID': this.containerId
        },
        body: JSON.stringify({
          recordType: 'AcronymBackup',
          query: {
            filterBy: [{
              comparator: 'EQUALS',
              fieldName: 'name',
              fieldValue: { value: this.backupFileName }
            }]
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get record ID: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.records || result.records.length === 0) {
        return null;
      }
      
      return result.records[0].recordName;
    } catch (error) {
      console.error('Error getting record ID from iCloud:', error);
      return null;
    }
  }
} 