import { Acronym, AcronymManager, TextInputOptions } from '../core/types';

export class AcronymTextInput {
  private element: HTMLTextAreaElement;
  private acronymManager: AcronymManager;
  private options: TextInputOptions;
  private suggestionsContainer: HTMLDivElement;
  private currentSuggestions: Acronym[] = [];
  private lastPromptTime: number = 0;
  private promptDebounceTime: number = 2000; // 2 seconds

  constructor(
    element: HTMLTextAreaElement,
    acronymManager: AcronymManager,
    options: TextInputOptions = {}
  ) {
    this.element = element;
    this.acronymManager = acronymManager;
    this.options = {
      placeholder: 'Type your text here...',
      autoExpand: true,
      showSuggestions: true,
      maxSuggestions: 5,
      ...options
    };

    this.suggestionsContainer = document.createElement('div');
    this.suggestionsContainer.className = 'acronym-suggestions';
    this.element.parentElement?.appendChild(this.suggestionsContainer);

    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    this.element.addEventListener('input', this.handleInput.bind(this));
    this.element.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.element.addEventListener('blur', this.hideSuggestions.bind(this));
    
    // Add event listener for when user finishes typing
    this.element.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private async handleInput(event: Event): Promise<void> {
    const input = (event.target as HTMLTextAreaElement).value;
    const cursorPosition = this.element.selectionStart;
    const textBeforeCursor = input.substring(0, cursorPosition);
    
    // Check for acronym pattern (word followed by tab)
    const match = textBeforeCursor.match(/\b(\w+)\s*$/);
    if (match) {
      const potentialAcronym = match[1];
      const suggestions = await this.acronymManager.searchAcronyms(potentialAcronym);
      this.currentSuggestions = suggestions.slice(0, this.options.maxSuggestions);
      
      if (this.currentSuggestions.length > 0 && this.options.showSuggestions) {
        this.showSuggestions();
      }
    } else {
      this.hideSuggestions();
    }

    if (this.options.onTextChange) {
      this.options.onTextChange(input);
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    // Check if the key pressed is Enter or a period (end of sentence)
    if (event.key === 'Enter' || event.key === '.') {
      this.savePrompt();
    }
  }

  private async savePrompt(): Promise<void> {
    const currentTime = Date.now();
    const text = this.element.value.trim();
    
    // Only save if there's text and enough time has passed since the last save
    if (text && currentTime - this.lastPromptTime > this.promptDebounceTime) {
      try {
        // Check if the acronymManager has the addPrompt method
        if ('addPrompt' in this.acronymManager) {
          await (this.acronymManager as any).addPrompt(text);
          this.lastPromptTime = currentTime;
          
          // Process new prompts to generate acronyms
          if ('processNewPrompts' in this.acronymManager) {
            await (this.acronymManager as any).processNewPrompts();
          }
        }
      } catch (error) {
        console.error('Error saving prompt:', error);
      }
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      event.preventDefault();
      const cursorPosition = this.element.selectionStart;
      const textBeforeCursor = this.element.value.substring(0, cursorPosition);
      const match = textBeforeCursor.match(/\b(\w+)\s*$/);

      if (match && this.currentSuggestions.length > 0) {
        const acronym = this.currentSuggestions[0];
        this.expandAcronym(acronym, match[0]);
      }
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.navigateSuggestions(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' && this.currentSuggestions.length > 0) {
      event.preventDefault();
      const selectedIndex = this.getSelectedSuggestionIndex();
      if (selectedIndex >= 0) {
        const acronym = this.currentSuggestions[selectedIndex];
        const match = this.element.value.substring(0, this.element.selectionStart).match(/\b(\w+)\s*$/);
        if (match) {
          this.expandAcronym(acronym, match[0]);
        }
      }
    }
  }

  private expandAcronym(acronym: Acronym, textToReplace: string): void {
    const cursorPosition = this.element.selectionStart;
    const textBeforeCursor = this.element.value.substring(0, cursorPosition);
    const textAfterCursor = this.element.value.substring(cursorPosition);
    
    const replacement = `${acronym.expansion} `;
    const newText = textBeforeCursor.replace(textToReplace, replacement) + textAfterCursor;
    
    this.element.value = newText;
    this.element.selectionStart = cursorPosition - textToReplace.length + replacement.length;
    this.element.selectionEnd = this.element.selectionStart;
    
    this.acronymManager.incrementUsage(acronym.id);
    this.hideSuggestions();
  }

  private showSuggestions(): void {
    this.suggestionsContainer.innerHTML = '';
    this.currentSuggestions.forEach((acronym, index) => {
      const suggestion = document.createElement('div');
      suggestion.className = 'acronym-suggestion';
      suggestion.innerHTML = `
        <span class="acronym">${acronym.acronym}</span>
        <span class="expansion">${acronym.expansion}</span>
      `;
      suggestion.addEventListener('click', () => {
        const match = this.element.value.substring(0, this.element.selectionStart).match(/\b(\w+)\s*$/);
        if (match) {
          this.expandAcronym(acronym, match[0]);
        }
      });
      this.suggestionsContainer.appendChild(suggestion);
    });
    this.suggestionsContainer.style.display = 'block';
  }

  private hideSuggestions(): void {
    this.suggestionsContainer.style.display = 'none';
  }

  private navigateSuggestions(direction: number): void {
    const suggestions = this.suggestionsContainer.children;
    const currentIndex = this.getSelectedSuggestionIndex();
    const newIndex = Math.max(0, Math.min(suggestions.length - 1, currentIndex + direction));
    
    Array.from(suggestions).forEach((suggestion, index) => {
      suggestion.classList.toggle('selected', index === newIndex);
    });
  }

  private getSelectedSuggestionIndex(): number {
    const suggestions = this.suggestionsContainer.children;
    return Array.from(suggestions).findIndex(suggestion => 
      suggestion.classList.contains('selected')
    );
  }

  public setValue(value: string): void {
    this.element.value = value;
  }

  public getValue(): string {
    return this.element.value;
  }

  public focus(): void {
    this.element.focus();
  }
} 