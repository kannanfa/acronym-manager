// Core types
export * from './core/types';

// Database
export * from './db/sqlite-manager';

// UI components
export * from './ui/text-input';

// Cloud adapters
export * from './cloud/google-cloud-sync';
export * from './cloud/google-drive-sync';
export * from './cloud/icloud-sync';
export * from './cloud/backup-manager';

// React adapter
export * from './adapters/react-adapter';

// Export ML-based acronym generator
export { MLAcronymGenerator } from './ml/acronym-generator'; 