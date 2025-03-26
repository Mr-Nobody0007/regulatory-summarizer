import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RegulatoryService } from '../../services/regulatory.service';
import { Subject, debounceTime, distinctUntilChanged, filter, switchMap, takeUntil } from 'rxjs';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';

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
  selectedInputMethod: InputMethod = null;
  currentDocument: DocumentContext | null = null;
  
  // Search related properties
  searchControl = new FormControl('');
  searchResults: SearchResult[] = [];
  isLoading = false;
  noResults = false;
  selectedDocument: SearchResult | null = null;
  
  // URL related properties
  urlForm: FormGroup;
  isUrlSubmitted = false;
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private fb: FormBuilder,
    private regulatoryService: RegulatoryService
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

  selectInputMethod(method: InputMethod): void {
    this.selectedInputMethod = method;
    // Reset current document when changing input methods
    this.currentDocument = null;
    this.selectedDocument = null;
    this.searchResults = [];
    this.isUrlSubmitted = false;
    this.searchControl.setValue('');
    this.urlForm.reset();
  }

  private setupSearchListener(): void {
    this.searchControl.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged(),
      filter((term: string | null) => !!term && term.length >= 3),
      switchMap(term => {
        this.isLoading = true;
        this.noResults = false;
        return this.regulatoryService.searchDocuments(term as string);
      })
    ).subscribe({
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
  }

  selectDocument(document: SearchResult): void {
    this.selectedDocument = document;
    
    this.currentDocument = {
      id: document.id,
      title: document.title,
      sourceType: 'search',
      selected: true
    };
  }

  clearDocumentSelection(): void {
    this.selectedDocument = null;
    this.currentDocument = null;
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
    }
  }

  clearUrl(): void {
    this.urlForm.reset();
    this.isUrlSubmitted = false;
    this.currentDocument = null;
  }

  summarizeDocument(): void {
    // Placeholder for future summarization functionality
    console.log('Summarizing document:', this.currentDocument);
    // This is where you would navigate to the next screen or trigger the summarization API call
  }

  get canSummarize(): boolean {
    return !!this.currentDocument?.selected;
  }

  get urlControl() {
    return this.urlForm.get('url');
  }
}