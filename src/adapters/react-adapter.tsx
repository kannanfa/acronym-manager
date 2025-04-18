import React, { useEffect, useRef } from 'react';
import { AcronymManager, TextInputOptions, Acronym } from '../core/types';
import { AcronymTextInput } from '../ui/text-input';

interface AcronymInputProps extends Omit<TextInputOptions, 'onAcronymDetected'> {
  acronymManager: AcronymManager;
  value?: string;
  onChange?: (value: string) => void;
  onAcronymDetected?: (acronym: Acronym) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const AcronymInput = ({
  acronymManager,
  value,
  onChange,
  onAcronymDetected,
  className,
  style,
  ...options
}: AcronymInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const acronymInputRef = useRef<AcronymTextInput | null>(null);

  useEffect(() => {
    if (textareaRef.current && !acronymInputRef.current) {
      acronymInputRef.current = new AcronymTextInput(
        textareaRef.current,
        acronymManager,
        {
          ...options,
          onTextChange: (text) => {
            if (onChange) {
              onChange(text);
            }
          },
          onAcronymDetected: (acronym) => {
            if (onAcronymDetected) {
              onAcronymDetected(acronym);
            }
          }
        }
      );
    }

    return () => {
      acronymInputRef.current = null;
    };
  }, [acronymManager, onChange, onAcronymDetected, options]);

  useEffect(() => {
    if (acronymInputRef.current && value !== undefined) {
      acronymInputRef.current.setValue(value);
    }
  }, [value]);

  return (
    <div className="acronym-input-container" style={style}>
      <textarea
        ref={textareaRef}
        className={className}
        placeholder={options.placeholder}
        style={{
          width: '100%',
          minHeight: '100px',
          padding: '8px',
          borderRadius: '4px',
          border: '1px solid #ccc',
          resize: 'vertical'
        }}
      />
      <style>
        {`
        .acronym-input-container {
          position: relative;
        }
        .acronym-suggestions {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #ccc;
          border-radius: '4px';
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          display: none;
          z-index: 1000;
        }
        .acronym-suggestion {
          padding: 8px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
        }
        .acronym-suggestion:hover,
        .acronym-suggestion.selected {
          background: #f0f0f0;
        }
        .acronym-suggestion .acronym {
          font-weight: bold;
        }
        `}
      </style>
    </div>
  );
}; 