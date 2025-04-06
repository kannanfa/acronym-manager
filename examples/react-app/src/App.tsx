import React, { useState, useEffect } from 'react';
import { BrowserAcronymManager } from './browser-acronym-manager';
import { AcronymInput } from './components/AcronymInput';
import { Acronym } from './types';

const acronymManager = new BrowserAcronymManager();

function App() {
  const [text, setText] = useState('');
  const [acronyms, setAcronyms] = useState<Acronym[]>([]);

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

  const handleAcronymDetected = async (acronym: Acronym) => {
    // Increment usage count when an acronym is detected
    await acronymManager.incrementUsage(acronym.id);
    await loadAcronyms();
  };

  return (
    <div className="app">
      <div className="input-section">
        <h2>Enter Text</h2>
        <AcronymInput
          acronymManager={acronymManager}
          value={text}
          onChange={handleTextChange}
          onAcronymDetected={handleAcronymDetected}
          placeholder="Type your text here..."
        />
      </div>

      <div className="acronym-section">
        <h2>Acronyms</h2>
        <div className="acronym-list">
          {acronyms.map(acronym => (
            <div key={acronym.id} className="acronym-item">
              <div className="acronym-header">
                <span className="acronym">{acronym.acronym}</span>
                <span className="expansion">{acronym.expansion}</span>
              </div>
              {acronym.description && (
                <div className="description">{acronym.description}</div>
              )}
              <div className="tags">
                {acronym.tags?.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>
        {`
          .app {
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
          }

          .input-section {
            margin-bottom: 40px;
          }

          .acronym-section {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
          }

          .acronym-list {
            display: grid;
            gap: 16px;
          }

          .acronym-item {
            background: white;
            padding: 16px;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          .acronym-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }

          .acronym {
            font-weight: bold;
            color: #2196f3;
          }

          .expansion {
            color: #666;
          }

          .description {
            font-size: 14px;
            color: #444;
            margin-bottom: 8px;
          }

          .tags {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .tag {
            background: #e0e0e0;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            color: #666;
          }
        `}
      </style>
    </div>
  );
}

export default App; 