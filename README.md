# Acronym Manager

A portable text input component that automatically detects, manages, and expands acronyms in real-time. Built with TypeScript and designed to work with any modern frontend framework.

## Features

- Real-time acronym detection and expansion
- Tab completion for acronyms
- Suggestion list with keyboard navigation
- SQLite database storage
- Cloud backup to Google Cloud Storage
- Framework-agnostic core with React adapter
- Customizable styling and behavior

## Installation

```bash
npm install acronym-manager
```

## Usage

### Basic Usage with React

```tsx
import { AcronymInput } from 'acronym-manager/adapters/react';
import { SQLiteAcronymManager } from 'acronym-manager/db/sqlite-manager';

const acronymManager = new SQLiteAcronymManager();

function App() {
  return (
    <AcronymInput
      acronymManager={acronymManager}
      placeholder="Type your text here..."
      onChange={(text) => console.log('Text changed:', text)}
      onAcronymDetected={(acronym) => console.log('Acronym detected:', acronym)}
    />
  );
}
```

### Cloud Backup Setup

```typescript
import { GoogleCloudSyncProvider } from 'acronym-manager/cloud/google-cloud-sync';

const cloudSync = new GoogleCloudSyncProvider(
  'your-project-id',
  'your-bucket-name',
  {
    // Your Google Cloud credentials
  }
);

// Backup acronyms
await cloudSync.uploadBackup(await acronymManager.getAllAcronyms());

// Restore acronyms
const acronyms = await cloudSync.downloadBackup();
for (const acronym of acronyms) {
  await acronymManager.addAcronym(acronym);
}
```

## API Reference

### AcronymInput Props

| Prop | Type | Description |
|------|------|-------------|
| acronymManager | AcronymManager | Required. The acronym manager instance |
| value | string | Optional. Controlled input value |
| onChange | (value: string) => void | Optional. Called when text changes |
| onAcronymDetected | (acronym: string) => void | Optional. Called when an acronym is detected |
| placeholder | string | Optional. Input placeholder text |
| autoExpand | boolean | Optional. Auto-expand acronyms on tab (default: true) |
| showSuggestions | boolean | Optional. Show suggestion list (default: true) |
| maxSuggestions | number | Optional. Maximum number of suggestions (default: 5) |
| className | string | Optional. Additional CSS class |
| style | React.CSSProperties | Optional. Additional inline styles |

### AcronymManager Interface

```typescript
interface AcronymManager {
  addAcronym(acronym: Omit<Acronym, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<Acronym>;
  getAcronym(id: string): Promise<Acronym | null>;
  updateAcronym(id: string, updates: Partial<Acronym>): Promise<Acronym>;
  deleteAcronym(id: string): Promise<void>;
  searchAcronyms(query: string): Promise<Acronym[]>;
  getAllAcronyms(): Promise<Acronym[]>;
  incrementUsage(id: string): Promise<void>;
}
```

## Styling

The component comes with default styling but can be customized using CSS classes:

- `.acronym-input-container`: Main container
- `.acronym-suggestions`: Suggestions dropdown container
- `.acronym-suggestion`: Individual suggestion item
- `.acronym-suggestion .acronym`: Acronym text
- `.acronym-suggestion .expansion`: Expansion text

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT 