import { Component, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RegulatoryService } from '../../services/regulatory.service';
import { Subject, debounceTime, distinctUntilChanged, filter, switchMap, takeUntil } from 'rxjs';
import { PromptService, Prompt } from '../../services/prompt.service';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { DocumentDataService } from '../../services/document-data.service';

export type InputMethod = 'search' | 'url' | null;

export interface DocumentContext {
  id?: string;
  title?: string;
  sourceType: 'search' | 'url';
  url?: string;
  selected: boolean;
}

export interface SearchResult {
  id: string;
  title: string;
  documentType: string;
  agencyName: string;
  publicationDate: string;
  // Additional metadata
  documentNumber?: string;
  startPage?: number;
  endPage?: number;
  cfrReferences?: string[];
  docketIds?: string[];
  regulationIdNumbers?: string[];
  effectiveDate?: string;
}

export interface WhitelistedUrl {
  name: string;
  domain: string;
  url: string;
}

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
  
  // Search related properties
  searchControl = new FormControl('');
  searchResults: SearchResult[] = [];
  isLoading = false;

  noResults = false;
  selectedDocument: SearchResult | null = null;
  showSearchResults = false;

  defaultPromptControl = new FormControl('');
  defaultPromptsList = [];

  // URL related properties
  urlForm: FormGroup;
  isUrlSubmitted = false;
  extractedText: string = '';
  
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
    private regulatoryService: RegulatoryService,
    private router: Router,
    private cdr: ChangeDetectorRef, // Added ChangeDetectorRef
    private documentDataService: DocumentDataService
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
    this.regulatoryService.getFetchDefaultPrompts().subscribe(data => {
      console.log('Sasikanth Default promopts:::::::::::', data);
      this.defaultPromptsList = data;
    });
  }

  fetchWebpage(url: string): void {
    if (!url) {
      alert('Please enter a valid URL.');
      return;
    }
    
    this.isLoading = true;
    
    fetch(url, { method: 'GET' })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text(); // Parse the response as text
      })
      .then(htmlContent => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        this.extractedText = doc.body.textContent || 'No text content found.';
        console.log('Extracted Text:', this.extractedText);
        
        this.isLoading = false;
      })
      .catch(error => {
        console.error('Error fetching the webpage:', error);
        this.extractedText = 'Failed to fetch webpage content.';
        this.isLoading = false;
      });
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
  

  selectDocument(document: SearchResult): void {
    this.selectedDocument = document;
    this.showSearchResults = false;
    
    this.searchControl.setValue(`(${document.id}) (${document.title})`, { emitEvent: false });
    
    this.currentDocument = {
      id: document.id,
      title: document.title,
      sourceType: 'search',
      selected: true
    };
    
    // Store the selected document in the service
    this.documentDataService.setSelectedDocument(document);
    
    this.cdr.detectChanges(); // Force change detection
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

  

  private setupSearchListener(): void {
    this.searchControl.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      // Clear results if search is empty
      if (!term || term.length < 3) {
        this.searchResults = [];
        this.noResults = false;
        this.isLoading = false;
        this.showSearchResults = false;
        this.cdr.detectChanges(); // Force change detection
        return;
      }
      
      // Show loading and clear previous results state
      this.isLoading = true;
      this.noResults = false;
      this.showSearchResults = true;
      this.cdr.detectChanges(); // Force change detection
      
      // Call the service for results
      this.regulatoryService.searchDocuments(term as string)
        .subscribe({
          next: (results) => {
            this.searchResults = results;
            this.isLoading = false;
            this.noResults = results.length === 0;
            this.cdr.detectChanges(); // Force change detection
          },
          error: (err) => {
            console.error('Error searching documents', err);
            this.isLoading = false;
            this.searchResults = [];
            this.noResults = true;
            this.cdr.detectChanges(); // Force change detection
          }
        });
    });
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

 
 
  clearDocumentSelection(): void {
    this.selectedDocument = null;
    this.currentDocument = null;
    
    // Clear the document from the service
    this.documentDataService.setSelectedDocument(null);
    
    // If there's still a search term, show search results again
    if (this.searchControl.value && this.searchResults.length > 0) {
      this.showSearchResults = true;
    }
    
    this.cdr.detectChanges(); // Force change detection
  }
  clearSearch(): void {
    this.searchControl.setValue('');
    this.searchResults = [];
    this.showSearchResults = false;
    this.cdr.detectChanges(); // Force change detection
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
      if (this.currentDocument.sourceType === 'search' && this.currentDocument.id) {
        this.router.navigate(['/document', this.currentDocument.id]);
      } else if (this.currentDocument.sourceType === 'url' && this.currentDocument.url) {
        // Encode the URL to make it safe for navigation
        const encodedUrl = encodeURIComponent(this.currentDocument.url);
        this.router.navigate(['/document', encodedUrl, 'true']);
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