import { Storage } from '@google-cloud/storage';
import { Acronym, CloudSyncProvider } from '../core/types';

export class GoogleCloudSyncProvider implements CloudSyncProvider {
  private storage: Storage;
  private bucket: string;
  private backupPath: string;

  constructor(projectId: string, bucketName: string, credentials?: any) {
    this.storage = new Storage({
      projectId,
      credentials
    });
    this.bucket = bucketName;
    this.backupPath = 'acronyms-backup.json';
  }

  async uploadBackup(data: Acronym[]): Promise<void> {
    const bucket = this.storage.bucket(this.bucket);
    const file = bucket.file(this.backupPath);

    const backupData = {
      acronyms: data,
      lastBackup: new Date().toISOString()
    };

    await file.save(JSON.stringify(backupData, null, 2), {
      metadata: {
        contentType: 'application/json'
      }
    });
  }

  async downloadBackup(): Promise<Acronym[]> {
    const bucket = this.storage.bucket(this.bucket);
    const file = bucket.file(this.backupPath);

    try {
      const [content] = await file.download();
      const backupData = JSON.parse(content.toString());
      return backupData.acronyms;
    } catch (error) {
      if ((error as any).code === 404) {
        return [];
      }
      throw error;
    }
  }

  async getLastSyncTime(): Promise<Date> {
    const bucket = this.storage.bucket(this.bucket);
    const file = bucket.file(this.backupPath);

    try {
      const [metadata] = await file.getMetadata();
      return new Date(metadata.updated);
    } catch (error) {
      if ((error as any).code === 404) {
        return new Date(0);
      }
      throw error;
    }
  }
} 