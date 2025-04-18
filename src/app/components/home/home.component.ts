import { Component, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  selectedPrompt: Prompt | null = null;
  
  // Search related properties
  searchControl = new FormControl('');
  searchResults: SearchResult[] = [];
  isLoading = false;
  noResults = false;
  selectedDocument: SearchResult | null = null;
  showSearchResults = false;
  selectedDocumentLoading = false;
  // URL related properties
  urlForm: FormGroup;
  isUrlSubmitted = false;
  @ViewChild('searchContainer') searchContainer!: ElementRef;

  private destroy$ = new Subject<void>();
  
  constructor(
    private fb: FormBuilder,
    private regulatoryService: RegulatoryService,
    private promptService: PromptService,
    private router: Router,
    private cdr: ChangeDetectorRef, // Added ChangeDetectorRef
    private documentDataService: DocumentDataService
  ) {
    this.urlForm = this.fb.group({
      url: ['', [Validators.required, Validators.pattern('https?://.*')]]
    });
    
    this.setupSearchListener();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectDocument(document: SearchResult): void {
    this.selectedDocument = document;
    this.showSearchResults = false;
    
    this.currentDocument = {
      id: document.id,
      title: document.title,
      sourceType: 'search',
      selected: true
    };
    
    // Store the selected document in the service
    this.documentDataService.setSelectedDocument(document);
    
    // Load the default summary prompt based on document type
    this.loadDefaultPrompt(document.documentType);
    
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

  @HostListener('document:click', ['$event'])
handleClickOutside(event: MouseEvent) {
  // If we have search results showing, check if click was outside the search container
  if (this.showSearchResults && this.searchContainer) {
    if (!this.searchContainer.nativeElement.contains(event.target)) {
      this.showSearchResults = false;
      this.cdr.detectChanges();
    }
  }
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

  private loadDefaultPrompt(documentType: string): void {
    console.log('Loading default prompt for document type:', documentType);
    
    this.promptService.getDefaultSummaryPrompt(documentType).subscribe(prompt => {
      console.log('Default summary prompt:', prompt);
      this.selectedPrompt = prompt;
      
      // Store the selected prompt in the service for use in document-summary
      if (prompt) {
        this.documentDataService.setSelectedPrompt(prompt);
        console.log('Stored prompt in DocumentDataService:', prompt);
      } else {
        console.log('No matching prompt found for document type:', documentType);
      }
      
      this.cdr.detectChanges();
    });
  }
  summarizeDocument(): void {
    if (this.currentDocument) {
      if (this.currentDocument.sourceType === 'search' && this.currentDocument.id) {
        // Pass the selected prompt ID to the router if available
        const promptParam = this.selectedPrompt ? { promptId: this.selectedPrompt.prompt } : {};
        this.router.navigate(['/document', this.currentDocument.id], { queryParams: promptParam });
      } else if (this.currentDocument.sourceType === 'url' && this.currentDocument.url) {
        // Encode the URL to make it safe for navigation
        const encodedUrl = encodeURIComponent(this.currentDocument.url);
        const promptParam = this.selectedPrompt ? { promptId: this.selectedPrompt.prompt } : {};
        this.router.navigate(['/document', encodedUrl, 'true'], { queryParams: promptParam });
      }
    }
  }
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

  // summarizeDocument(): void {
  //   if (this.currentDocument) {
  //     if (this.currentDocument.sourceType === 'search' && this.currentDocument.id) {
  //       this.router.navigate(['/document', this.currentDocument.id]);
  //     } else if (this.currentDocument.sourceType === 'url' && this.currentDocument.url) {
  //       // Encode the URL to make it safe for navigation
  //       const encodedUrl = encodeURIComponent(this.currentDocument.url);
  //       this.router.navigate(['/document', encodedUrl, 'true']);
  //     }
  //   }
  // }

  get canSummarize(): boolean {
    return !!this.currentDocument?.selected;
  }

  get urlControl() {
    return this.urlForm.get('url');
  }
}