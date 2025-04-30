// src/app/components-2/home-page/home-page.component.ts
import { Component, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { RegulatoryService } from '../../services/regulatory.service';
import { PromptService, Prompt } from '../../services/prompt.service';
import { DocumentDataService } from '../../services/document-data.service';

export interface SearchResult {
  id: string;
  title: string;
  documentType: string;
  agencyName: string;
  publicationDate: string;
  documentNumber?: string;
  // Additional fields as needed
}

export type InputMethod = 'search' | 'url';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss']
})
export class HomePageComponent implements OnDestroy {
  @ViewChild('searchContainer') searchContainer!: ElementRef;
  
  // State variables
  selectedInputMethod: InputMethod = 'search';
  isLoading: boolean = false;
  showSearchResults: boolean = false;
  searchResults: SearchResult[] = [];
  noResults: boolean = false;
  focusedResultIndex: number = -1;
  selectedDocument: SearchResult | null = null;
  selectedPrompt: Prompt | null = null;
  isUrlSubmitted: boolean = false;
  canSummarize: boolean = false;
  
  // Form controls
  searchControl = new FormControl('');
  urlForm: FormGroup;
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private regulatoryService: RegulatoryService,
    private promptService: PromptService,
    private documentDataService: DocumentDataService
  ) {
    // Initialize URL form with validation
    this.urlForm = this.fb.group({
      url: ['', [Validators.required, Validators.pattern('https?://.*')]]
    });
    
    // Setup search listener
    this.setupSearchListener();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Setup search input listener with debounce
   */
  private setupSearchListener(): void {
    this.searchControl.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      // Reset focus when search term changes
      this.focusedResultIndex = -1;
      
      // Clear results if search is empty
      if (!term || term.length < 3) {
        this.searchResults = [];
        this.noResults = false;
        this.isLoading = false;
        this.showSearchResults = false;
        return;
      }
      
      // Show loading and clear previous results state
      this.isLoading = true;
      this.noResults = false;
      this.showSearchResults = true;
      
      // Call the service for results
      this.regulatoryService.searchDocuments(term as string)
        .subscribe({
          next: (results) => {
            this.searchResults = results;
            this.isLoading = false;
            this.noResults = results.length === 0;
          },
          error: (err) => {
            console.error('Error searching documents', err);
            this.isLoading = false;
            this.searchResults = [];
            this.noResults = true;
          }
        });
    });
  }
  
  /**
   * Handle keyboard navigation in search results
   */
  handleSearchKeydown(event: KeyboardEvent): void {
    // Only handle keyboard navigation when search results are showing
    if (!this.showSearchResults || this.searchResults.length === 0 || !this.searchControl.value) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault(); // Prevent scrolling
        this.focusNextResult();
        break;
        
      case 'ArrowUp':
        event.preventDefault(); // Prevent scrolling
        this.focusPreviousResult();
        break;
        
      case 'Enter':
        // If a result is focused, select it
        if (this.focusedResultIndex >= 0 && this.focusedResultIndex < this.searchResults.length) {
          event.preventDefault(); // Prevent form submission
          this.selectDocument(this.searchResults[this.focusedResultIndex]);
        }
        break;
        
      case 'Escape':
        this.showSearchResults = false;
        this.focusedResultIndex = -1;
        break;
    }
  }
  
  /**
   * Focus the next search result
   */
  focusNextResult(): void {
    if (this.focusedResultIndex < this.searchResults.length - 1) {
      this.focusedResultIndex++;
      this.scrollToFocusedResult();
    } else {
      // Wrap around to the first result
      this.focusedResultIndex = 0;
      this.scrollToFocusedResult();
    }
  }

  /**
   * Focus the previous search result
   */
  focusPreviousResult(): void {
    if (this.focusedResultIndex > 0) {
      this.focusedResultIndex--;
      this.scrollToFocusedResult();
    } else if (this.focusedResultIndex === 0) {
      // If at first result, go back to input field
      this.focusedResultIndex = -1;
    } else {
      // If no selection, go to the last item
      this.focusedResultIndex = this.searchResults.length - 1;
      this.scrollToFocusedResult();
    }
  }
  
  /**
   * Scroll to ensure the focused result is visible
   */
  private scrollToFocusedResult(): void {
    // Use setTimeout to ensure the DOM has updated
    setTimeout(() => {
      const focusedElement = document.querySelector('.search-result-item.focused');
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 0);
  }
  
  /**
   * Close dropdown when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.searchContainer && !this.searchContainer.nativeElement.contains(event.target)) {
      this.showSearchResults = false;
      this.focusedResultIndex = -1;
    }
  }
  
  /**
   * Select input method (search or URL)
   */
  selectInputMethod(method: InputMethod): void {
    this.selectedInputMethod = method;
    // Reset current selection when changing input methods
    this.selectedDocument = null;
    this.searchResults = [];
    this.showSearchResults = false;
    this.isUrlSubmitted = false;
    this.searchControl.setValue('');
    this.urlForm.reset();
    this.updateCanSummarize();
  }
  
  /**
   * Select a document from search results
   */
  selectDocument(document: SearchResult): void {
    this.selectedDocument = document;
    this.showSearchResults = false;
    this.focusedResultIndex = -1;
    
    this.searchControl.setValue(`(${document.id}) ${document.title}`, { emitEvent: false });
    
    // Store the selected document in the service
    this.documentDataService.setSelectedDocument(document);
    
    // Get the appropriate prompt based on document type
    this.promptService.getDefaultSummaryPrompt(document.documentType)
      .subscribe(prompt => {
        if (prompt) {
          this.selectedPrompt = prompt;
          // Also store it in the service for later use
          this.documentDataService.setSelectedPrompt(prompt);
        } else {
          console.warn('No matching prompts found for document type:', document.documentType);
        }
        this.updateCanSummarize();
      });
  }
  
  /**
   * Clear document selection
   */
  clearDocumentSelection(): void {
    this.selectedDocument = null;
    this.selectedPrompt = null;
    
    // Clear the document from the service
    this.documentDataService.setSelectedDocument(null);
    
    // Clear the search input field
    this.searchControl.setValue('', { emitEvent: false });
    
    this.updateCanSummarize();
  }
  
  /**
   * Clear search input
   */
  clearSearch(): void {
    // Clear the search input
    this.searchControl.setValue('', { emitEvent: false });
    
    // Clear the search results and hide the dropdown
    this.searchResults = [];
    this.showSearchResults = false;
    
    // If there's a selected document, clear it as well
    if (this.selectedDocument) {
      this.clearDocumentSelection();
    }
  }
  
  /**
   * Submit URL form
   */
  onUrlSubmit(): void {
    if (this.urlForm.valid) {
      const url = this.urlForm.get('url')?.value;
      this.isUrlSubmitted = true;
      
      // Check for default prompts for URL inputs
      this.promptService.getDefaultSummaryPrompt('URL')
        .subscribe(prompt => {
          if (prompt) {
            this.selectedPrompt = prompt;
            // Also store it in the service
            this.documentDataService.setSelectedPrompt(prompt);
          } else {
            // Fallback to a generic prompt
            const genericPrompt: Prompt = {
              purpose: "Summary",
              isDefault: true,
              label: "Provide a concise summary",
              prompt: "Provide a concise summary of this document highlighting key points, requirements, and implications.",
              documentType: "URL"
            };
            this.selectedPrompt = genericPrompt;
            this.documentDataService.setSelectedPrompt(genericPrompt);
          }
          this.updateCanSummarize();
        });
    }
  }
  
  /**
   * Clear URL input
   */
  clearUrl(): void {
    this.urlForm.reset();
    this.isUrlSubmitted = false;
    this.updateCanSummarize();
  }
  
  /**
   * Navigate to chat interface with selected document
   */
  summarizeDocument(): void {
    // Get the selected prompt or use a default
    const promptText = this.selectedPrompt?.prompt || 
      'Provide a concise summary of this document highlighting key points.';
    
    if (this.selectedInputMethod === 'search' && this.selectedDocument) {
      // Pass the document ID and prompt to the router navigation
      this.router.navigate(['/document', this.selectedDocument.id], {
        state: { prompt: promptText }
      });
    } else if (this.selectedInputMethod === 'url' && this.urlForm.valid) {
      const url = this.urlForm.get('url')?.value;
      // For URL-based documents:
      // 1. Encode the URL to make it safe for navigation
      const encodedUrl = encodeURIComponent(url);
      
      // 2. Pass the URL and set isUrl=true flag
      this.router.navigate(['/document', encodedUrl, 'true'], {
        state: { prompt: promptText }
      });
    }
  }
  
  /**
   * Update canSummarize flag based on current selection
   */
  private updateCanSummarize(): void {
    if (this.selectedInputMethod === 'search') {
      this.canSummarize = !!this.selectedDocument;
    } else {
      this.canSummarize = this.isUrlSubmitted;
    }
  }
  
  /**
   * Helper to get URL form control
   */
  get urlControl() {
    return this.urlForm.get('url');
  }
}