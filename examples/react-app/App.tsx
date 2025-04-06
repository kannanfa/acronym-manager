import React, { useState, useEffect } from 'react';
import { AcronymInput } from '../../src/adapters/react-adapter';
import { SQLiteAcronymManager } from '../../src/db/sqlite-manager';
import { GoogleCloudSyncProvider } from '../../src/cloud/google-cloud-sync';
import { Acronym } from '../../src/core/types';

const acronymManager = new SQLiteAcronymManager();
const cloudSync = new GoogleCloudSyncProvider(
  process.env.GOOGLE_CLOUD_PROJECT_ID || '',
  process.env.GOOGLE_CLOUD_BUCKET_NAME || '',
  process.env.GOOGLE_CLOUD_CREDENTIALS ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS) : undefined
);

function App() {
  const [text, setText] = useState('');
  const [acronyms, setAcronyms] = useState<Acronym[]>([]);
  const [selectedAcronym, setSelectedAcronym] = useState<Acronym | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadAcronyms();
  }, []);

  const loadAcronyms = async () => {
    const loadedAcronyms = await acronymManager.getAllAcronyms();
    setAcronyms(loadedAcronyms);
  };

  const handleTextChange = (newText: string) => {
    setText(newText);
  };

  const handleAcronymDetected = async (acronym: string) => {
    const matches = await acronymManager.searchAcronyms(acronym);
    if (matches.length > 0) {
      setSelectedAcronym(matches[0]);
    }
  };

  const handleAddAcronym = async () => {
    if (!selectedAcronym) return;

    const newAcronym = {
      acronym: selectedAcronym.acronym,
      expansion: selectedAcronym.expansion,
      description: selectedAcronym.description,
      isEnabled: true,
      tags: selectedAcronym.tags
    };

    await acronymManager.addAcronym(newAcronym);
    await loadAcronyms();
    setSelectedAcronym(null);
    setIsEditing(false);
  };

  const handleDeleteAcronym = async (id: string) => {
    await acronymManager.deleteAcronym(id);
    await loadAcronyms();
  };

  const handleToggleAcronym = async (id: string, isEnabled: boolean) => {
    await acronymManager.updateAcronym(id, { isEnabled });
    await loadAcronyms();
  };

  const handleBackup = async () => {
    await cloudSync.uploadBackup(acronyms);
    alert('Backup completed successfully!');
  };

  const handleRestore = async () => {
    const backupAcronyms = await cloudSync.downloadBackup();
    for (const acronym of backupAcronyms) {
      await acronymManager.addAcronym(acronym);
    }
    await loadAcronyms();
    alert('Restore completed successfully!');
  };

  return (
    <div className="app-container">
      <h1>Acronym Manager Demo</h1>
      
      <div className="input-section">
        <AcronymInput
          acronymManager={acronymManager}
          value={text}
          onChange={handleTextChange}
          onAcronymDetected={handleAcronymDetected}
          placeholder="Type your text here... (Try typing an acronym and press Tab)"
        />
      </div>

      <div className="acronyms-section">
        <h2>Managed Acronyms</h2>
        <div className="acronyms-list">
          {acronyms.map(acronym => (
            <div key={acronym.id} className="acronym-item">
              <div className="acronym-header">
                <span className="acronym-text">{acronym.acronym}</span>
                <div className="acronym-actions">
                  <button
                    onClick={() => handleToggleAcronym(acronym.id, !acronym.isEnabled)}
                    className={`toggle-button ${acronym.isEnabled ? 'enabled' : 'disabled'}`}
                  >
                    {acronym.isEnabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDeleteAcronym(acronym.id)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="acronym-details">
                <p className="expansion">{acronym.expansion}</p>
                {acronym.description && (
                  <p className="description">{acronym.description}</p>
                )}
                {acronym.tags && acronym.tags.length > 0 && (
                  <div className="tags">
                    {acronym.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="cloud-actions">
        <button onClick={handleBackup} className="backup-button">
          Backup to Cloud
        </button>
        <button onClick={handleRestore} className="restore-button">
          Restore from Cloud
        </button>
      </div>

      <style jsx>{`
        .app-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .input-section {
          margin-bottom: 30px;
        }

        .acronyms-section {
          margin-bottom: 30px;
        }

        .acronyms-list {
          display: grid;
          gap: 15px;
        }

        .acronym-item {
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 15px;
        }

        .acronym-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .acronym-text {
          font-size: 1.2em;
          font-weight: bold;
          color: #2196f3;
        }

        .acronym-actions {
          display: flex;
          gap: 10px;
        }

        .acronym-details {
          color: #666;
        }

        .expansion {
          margin: 5px 0;
        }

        .description {
          font-style: italic;
          margin: 5px 0;
        }

        .tags {
          display: flex;
          gap: 5px;
          margin-top: 10px;
        }

        .tag {
          background: #e0e0e0;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.9em;
        }

        .cloud-actions {
          display: flex;
          gap: 15px;
          justify-content: center;
        }

        button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        .toggle-button {
          background: #4caf50;
          color: white;
        }

        .toggle-button.disabled {
          background: #f44336;
        }

        .delete-button {
          background: #f44336;
          color: white;
        }

        .backup-button {
          background: #2196f3;
          color: white;
        }

        .restore-button {
          background: #ff9800;
          color: white;
        }
      `}</style>
    </div>
  );
}

export default App; 