import { Acronym, CloudSyncProvider } from '../core/types';

export class GoogleDriveSyncProvider implements CloudSyncProvider {
  private accessToken: string;
  private backupFileName: string;
  private backupFolderName: string;
  private folderId: string | null = null;

  constructor(accessToken: string, backupFileName: string = 'acronyms-backup.json', backupFolderName: string = 'AcronymManager') {
    this.accessToken = accessToken;
    this.backupFileName = backupFileName;
    this.backupFolderName = backupFolderName;
  }

  async uploadBackup(data: Acronym[]): Promise<void> {
    await this.ensureFolderExists();
    
    const backupData = {
      acronyms: data,
      lastBackup: new Date().toISOString()
    };
    
    const jsonData = JSON.stringify(backupData, null, 2);
    const fileMetadata = {
      name: this.backupFileName,
      mimeType: 'application/json'
    };
    
    // Check if file already exists
    const existingFileId = await this.findFile(this.backupFileName);
    
    if (existingFileId) {
      // Update existing file
      await this.updateFile(existingFileId, jsonData);
    } else {
      // Create new file
      await this.createFile(jsonData, fileMetadata);
    }
  }

  async downloadBackup(): Promise<Acronym[]> {
    await this.ensureFolderExists();
    
    const fileId = await this.findFile(this.backupFileName);
    if (!fileId) {
      return [];
    }
    
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download backup: ${response.statusText}`);
      }
      
      const backupData = await response.json();
      return backupData.acronyms || [];
    } catch (error) {
      console.error('Error downloading backup:', error);
      return [];
    }
  }

  async getLastSyncTime(): Promise<Date> {
    await this.ensureFolderExists();
    
    const fileId = await this.findFile(this.backupFileName);
    if (!fileId) {
      return new Date(0);
    }
    
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=modifiedTime`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get file metadata: ${response.statusText}`);
      }
      
      const metadata = await response.json();
      return new Date(metadata.modifiedTime);
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return new Date(0);
    }
  }

  private async ensureFolderExists(): Promise<void> {
    if (this.folderId) {
      return;
    }
    
    // Check if folder already exists
    const existingFolderId = await this.findFolder(this.backupFolderName);
    if (existingFolderId) {
      this.folderId = existingFolderId;
      return;
    }
    
    // Create folder
    const folderMetadata = {
      name: this.backupFolderName,
      mimeType: 'application/vnd.google-apps.folder'
    };
    
    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(folderMetadata)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create folder: ${response.statusText}`);
    }
    
    const folder = await response.json();
    this.folderId = folder.id;
  }

  private async findFolder(folderName: string): Promise<string | null> {
    const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to search for folder: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
  }

  private async findFile(fileName: string): Promise<string | null> {
    if (!this.folderId) {
      return null;
    }
    
    const query = `name='${fileName}' and '${this.folderId}' in parents and trashed=false`;
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to search for file: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
  }

  private async createFile(content: string, metadata: any): Promise<void> {
    if (!this.folderId) {
      throw new Error('Folder ID is not set');
    }
    
    // Create multipart request with metadata and content
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelimiter = "\r\n--" + boundary + "--";
    
    const metadataPart = delimiter + "Content-Type: application/json\r\n\r\n" + JSON.stringify(metadata);
    const contentPart = delimiter + "Content-Type: application/json\r\n\r\n" + content;
    
    const multipartRequestBody = metadataPart + contentPart + closeDelimiter;
    
    const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create file: ${response.statusText}`);
    }
    
    const file = await response.json();
    
    // Move file to the folder
    await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?addParents=${this.folderId}&fields=id,parents`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });
  }

  private async updateFile(fileId: string, content: string): Promise<void> {
    const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: content
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update file: ${response.statusText}`);
    }
  }
} 