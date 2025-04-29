// Updated imports
import { Component, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, filter, switchMap, takeUntil } from 'rxjs';

// Import from our new models
import { SearchResult, DocumentContext, WhitelistedUrl } from '../../../models/document.model';
import { Prompt } from '../../../models/prompt.model';

// Import from our new services
import { DocumentApiService } from '../../../services/document-api.service';
import { PromptManagementService } from '../../../services/prompt-management.service';

// Keep document-data service for now
import { DocumentDataService } from '../../../services/document-data.service';

// Material Imports stay the same
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
export type InputMethod = 'search' | 'url' | null;







@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatListModule
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnDestroy {
  selectedInputMethod: InputMethod = 'search';
  currentDocument: DocumentContext | null = null;
  selectedPrompt: Prompt | null = null;
  
  // Search related properties
  searchControl = new FormControl('');
  searchResults: SearchResult[] = [];
  isLoading = false;
  noResults = false;
  selectedDocument: SearchResult | null = null;
  showSearchResults = false;
  
  // Keyboard navigation properties
  focusedResultIndex = -1; // No result focused by default
  
  defaultPromptControl = new FormControl('');
  defaultPromptsList: Prompt[] = [];

  // URL related properties
  urlForm: FormGroup;
  isUrlSubmitted = false;
  extractedText: string = '';
  
  @ViewChild('searchContainer') searchContainer!: ElementRef;
  
  private destroy$ = new Subject<void>();

  whitelistedUrls: WhitelistedUrl[] = [
    { name: 'Lexis Nexis', domain: 'lexisnexis.com', url: 'https://www.lexisnexis.com' },
    { name: 'Westlaw', domain: 'westlaw.com', url: 'https://www.westlaw.com' },
    { name: 'Bloomberg Law', domain: 'bloomberglaw.com', url: 'https://www.bloomberglaw.com' },
    { name: 'HeinOnline', domain: 'heinonline.org', url: 'https://www.heinonline.org' },
    { name: 'PACER', domain: 'pacer.gov', url: 'https://www.pacer.gov' }
  ];
  
  // Add a property to control the visibility of the URL info box
  showUrlInfoBox = false;
  
  // Add a property to store validation error message
  urlValidationErrorMessage = '';
  
  constructor(
    private fb: FormBuilder,
    private documentApiService: DocumentApiService, // Updated from regulatoryService
    private router: Router,
    private cdr: ChangeDetectorRef,
    private documentDataService: DocumentDataService, // Keep this unchanged for now
    private promptManagementService: PromptManagementService // Updated from promptService
  ) {
    this.urlForm = this.fb.group({
      url: ['', [Validators.required, Validators.pattern('https?://.*'), this.whitelistedDomainValidator()]]
    });
    
    this.urlForm.get('url')?.valueChanges.subscribe(value => {
      this.updateUrlValidationMessage();
    });
    
    this.setupSearchListener();
    this.getDefaultPrompts();
  }

  getDefaultPrompts() {
    this.promptManagementService.getPrompts().subscribe(data => {
      console.log('Default prompts::', data);
      this.defaultPromptsList = data;
    });
  }

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
    
    this.cdr.detectChanges(); // Update UI
  }

  // Focus the next search result
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

  // Focus the previous search result
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

  // Scroll to ensure the focused result is visible
  scrollToFocusedResult(): void {
    // Use setTimeout to ensure the DOM has updated
    setTimeout(() => {
      const focusedElement = document.querySelector('.search-result-item.focused');
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 0);
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.searchContainer && !this.searchContainer.nativeElement.contains(event.target)) {
      this.showSearchResults = false;
      this.focusedResultIndex = -1;
      this.cdr.detectChanges();
    }
  }

  

  

  
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleUrlInfoBox(): void {
    this.showUrlInfoBox = !this.showUrlInfoBox;
    this.cdr.detectChanges();
  }
  
  // Add a method to close the URL info box
  closeUrlInfoBox(): void {
    this.showUrlInfoBox = false;
    this.cdr.detectChanges();
  }
  
  // Add a method to update the validation error message
  updateUrlValidationMessage(): void {
    const urlControl = this.urlForm.get('url');
    
    if (!urlControl?.errors) {
      this.urlValidationErrorMessage = '';
      return;
    }
    
    if (urlControl.errors['required']) {
      this.urlValidationErrorMessage = 'URL is required';
    } else if (urlControl.errors['pattern']) {
      this.urlValidationErrorMessage = 'URL must start with http:// or https://';
    } else if (urlControl.errors['domainNotWhitelisted']) {
      this.urlValidationErrorMessage = 'URL must be from an approved source. Click the info icon to see the list of approved sources.';
    }
    
    this.cdr.detectChanges();
  }
  
  // Add a custom validator to check if the domain is whitelisted
  whitelistedDomainValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const url = control.value;
      
      if (!url) {
        return null;
      }
      
      try {
        // Try to parse the URL
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname;
        
        // Check if the hostname matches any of our whitelisted domains
        const isWhitelisted = this.whitelistedUrls.some(item => 
          hostname === item.domain || 
          hostname.endsWith('.' + item.domain)
        );
        
        return isWhitelisted ? null : { domainNotWhitelisted: true };
      } catch (error) {
        // If URL can't be parsed, it's invalid
        return { invalidUrl: true };
      }
    };
  }
  
  // Method to navigate to a whitelisted URL
  navigateToWhitelistedUrl(url: string): void {
    window.open(url, '_blank');
  }
  

  

  selectInputMethod(method: InputMethod): void {
    this.selectedInputMethod = method;
    // Reset current document when changing input methods
    this.currentDocument = null;
    this.selectedDocument = null;
    this.searchResults = [];
    this.showSearchResults = false;
    this.isUrlSubmitted = false;
    this.searchControl.setValue('');
    this.urlForm.reset();
    this.cdr.detectChanges(); // Force change detection
  }

  

  

  // selectDocument(document: SearchResult): void {
  //   this.selectedDocument = document;
  //   this.showSearchResults = false;
    
  //   this.currentDocument = {
  //     id: document.id,
  //     title: document.title,
  //     sourceType: 'search',
  //     selected: true
  //   };
    
  //   // Store the selected document in the service
  //   this.documentDataService.setSelectedDocument(document);
    
  //   this.cdr.detectChanges(); // Force change detection
  // }

 
 
// In home.component.ts, update the clearDocumentSelection() method:

clearDocumentSelection(): void {
  this.selectedDocument = null;
  this.currentDocument = null;
  this.selectedPrompt = null; // Clear the selected prompt
  
  // Clear the document from the service
  this.documentDataService.setSelectedDocument(null);
  
  // Clear the search input field
  this.searchControl.setValue('', { emitEvent: false });
  
  // If there's still a search term, show search results again
  if (this.searchResults.length > 0) {
    this.showSearchResults = true;
  }
  
  this.cdr.detectChanges(); // Force change detection
}


  clearSearch(): void {
    // Clear the search input
    this.searchControl.setValue('', { emitEvent: false });
    
    // Clear the search results and hide the dropdown
    this.searchResults = [];
    this.showSearchResults = false;
    
    // If there's a selected document, clear it as well
    if (this.selectedDocument) {
      this.selectedDocument = null;
      this.currentDocument = null;
      this.selectedPrompt = null;
      
      // Clear the document from the service
      this.documentDataService.setSelectedDocument(null);
    }
    
    this.cdr.detectChanges(); // Force change detection
  }

  selectDocument(document: SearchResult): void {
    this.selectedDocument = document;
    this.showSearchResults = false;
    this.focusedResultIndex = -1; 
    
    this.searchControl.setValue(`(${document.id}) ${document.title}`, { emitEvent: false });
    
    this.currentDocument = {
      id: document.id,
      title: document.title,
      sourceType: 'search',
      selected: true
    };
    
    // Store the selected document in the service
    this.documentDataService.setSelectedDocument(document);
    
    // Get the appropriate prompt based on document type
    this.promptManagementService.getDefaultSummaryPrompt(document.documentType)
      .subscribe(prompt => {
        if (prompt) {
          this.selectedPrompt = prompt;
          // Also store it in the service for later use
          this.documentDataService.setSelectedPrompt(prompt);
          console.log('Selected default prompt:', prompt);
        } else {
          console.warn('No matching prompts found for document type:', document.documentType);
        }
        this.cdr.detectChanges();
      });
  }



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
        this.cdr.detectChanges();
        return;
      }
      
      // Show loading and clear previous results state
      this.isLoading = true;
      this.noResults = false;
      this.showSearchResults = true;
      this.cdr.detectChanges();
      
      // Call the new service for results
      this.documentApiService.searchDocuments(term as string)
        .subscribe({
          next: (results) => {
            this.searchResults = results;
            this.isLoading = false;
            this.noResults = results.length === 0;
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error searching documents', err);
            this.isLoading = false;
            this.searchResults = [];
            this.noResults = true;
            this.cdr.detectChanges();
          }
        });
    });
  }


  onUrlSubmit(): void {
    if (this.urlForm.valid) {
      const url = this.urlForm.get('url')?.value;
      this.isUrlSubmitted = true;
      
      this.currentDocument = {
        sourceType: 'url',
        url: url,
        selected: true
      };
  
      // Check for default prompts for URL inputs
      this.promptManagementService.getDefaultSummaryPrompt('URL')
        .subscribe(prompt => {
          if (prompt) {
            this.selectedPrompt = prompt;
            // Also store it in the service
            this.documentDataService.setSelectedPrompt(prompt);
            console.log('Selected default prompt for URL:', prompt);
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
          this.cdr.detectChanges();
        });
      
      this.cdr.detectChanges(); // Force change detection
    }
  }

  clearUrl(): void {
    this.urlForm.reset();
    this.isUrlSubmitted = false;
    this.currentDocument = null;
    this.cdr.detectChanges(); // Force change detection
  }

  summarizeDocument(): void {
    if (this.currentDocument) {
      // Get the selected prompt or use a default
      const promptText = this.selectedPrompt?.prompt || 
        'Provide a concise summary of this document highlighting key points.';
      
      console.log('Using prompt for summarization:', promptText);
      
      if (this.currentDocument.sourceType === 'search' && this.currentDocument.id) {
        // Pass the document ID and prompt to the router navigation
        this.router.navigate(['/document', this.currentDocument.id], {
          state: { prompt: promptText }
        });
      } else if (this.currentDocument.sourceType === 'url' && this.currentDocument.url) {
        // For URL-based documents:
        // 1. Encode the URL to make it safe for navigation
        const encodedUrl = encodeURIComponent(this.currentDocument.url);
        
        // 2. Pass the URL and set isUrl=true flag
        this.router.navigate(['/document', encodedUrl, 'true'], {
          state: { prompt: promptText }
        });
      }
    }
  }

  get canSummarize(): boolean {
    return !!this.currentDocument?.selected;
  }

  get urlControl() {
    return this.urlForm.get('url');
  }
}