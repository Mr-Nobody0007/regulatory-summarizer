import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { RegulatoryService } from '../../services/regulatory.service';
import { finalize, catchError, takeUntil } from 'rxjs/operators';
import { of, Subject } from 'rxjs';
import { DocumentDataService } from '../../services/document-data.service';

// Document Summary interface
export interface DocumentSummary {
  id: string;
  title: string;
  publicationDate: string;
  agency: string;
  documentType: string;
  summary: string;
  // New fields
  startPage?: number;
  endPage?: number;
  cfrReferences?: string[];
  docketIds?: string[];
  regulationIdNumbers?: string[];
  effectiveDate?: string;
  documentNumber?: string;
}

// Prompt Response interface
export interface PromptResponse {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
  isLoading?: boolean; // Added loading state for each prompt
}

@Component({
  selector: 'app-document-summary',
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
    MatDividerModule,
    MatChipsModule
  ],
  templateUrl: './document-summary.component.html',
  styleUrls: ['./document-summary.component.scss']
})
export class DocumentSummaryComponent implements OnInit, OnDestroy {
  documentSummary: DocumentSummary | null = null;
  isLoading = true;
  isApiProcessing = false; // New flag for tracking the multi-step API process
  processStep = 0; // Track which step of the API process we're in (0-3)
  showExtendedMetadata = false;
  error: string | null = null;
  
  // For handling the Q&A
  questionControl = new FormControl('', [Validators.required]);
  promptResponses: PromptResponse[] = [];
  questionCharLimit = 1000; // Character limit for questions
  
  // Subscription cleanup
  private destroy$ = new Subject<void>();
  
  // Predefined prompts
  predefinedPrompts = [
    'When was it last updated?',
    'Summarize it in a different way',
    'Search for another document',
    'Provide a concise summary of the key requirements and obligations outlined in this regulation using approximately 500 words',
    'Does this apply in New York?'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private regulatoryService: RegulatoryService,
    private documentDataService: DocumentDataService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Get document ID from route parameters
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const documentId = params.get('id');
      const isUrl = params.get('isUrl') === 'true';
      
      if (documentId) {
        this.loadDocumentSummary(documentId, isUrl);
      } else {
        this.error = 'No document specified';
        this.isLoading = false;
        this.cdr.detectChanges(); // Force change detection
      }
    });
  }

  ngOnDestroy(): void {
    // Clean up all subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDocumentSummary(documentId: string, isUrl: boolean): void {
    this.isLoading = true;
    this.isApiProcessing = true;
    this.processStep = 1; // Starting the first API call
    this.error = null;
    this.cdr.detectChanges(); // Force change detection on loading state
    
    this.regulatoryService.summarizeDocument(documentId, isUrl)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.isApiProcessing = false;
          this.processStep = 0;
          this.cdr.detectChanges(); // Force change detection when loading completes
        }),
        catchError(error => {
          this.error = `Failed to load document summary: ${error.message || 'Unknown error'}`;
          return of(null);
        })
      )
      .subscribe({
        next: (summary) => {
          if (summary) {
            // Extract the process step observable if available
            if ('processStep$' in summary) {
              // TypeScript doesn't recognize processStep$ since it's not in the interface
              // Use type assertion to access it
              const processStep$ = (summary as any).processStep$;
              
              if (processStep$) {
                // Subscribe to process step updates
                processStep$.pipe(
                  takeUntil(this.destroy$)
                ).subscribe((step: number) => {
                  this.processStep = step;
                  this.cdr.detectChanges(); // Force change detection on step update
                });
              }
              
              // Remove processStep$ from summary to match the interface
              const { processStep$: _, ...cleanSummary } = summary as any;
              this.documentSummary = cleanSummary;
            } else {
              this.documentSummary = summary;
            }
            
            this.cdr.detectChanges(); // Force change detection
          } else if (!this.error) {
            // Only set error if we don't already have one from catchError
            this.error = 'Failed to load document summary. Please try again.';
          }
        }
      });
  }

  toggleExtendedMetadata(): void {
    this.showExtendedMetadata = !this.showExtendedMetadata;
  }

  askQuestion(question: string = ''): void {
    // If no question provided, use the one from the form
    const questionText = question || this.questionControl.value;
    
    if (!questionText) {
      return;
    }
    
    if (!this.documentSummary) {
      return;
    }
    
    // Create a new prompt response with a temporary ID and loading state
    const newPrompt: PromptResponse = {
      id: `temp-${Date.now()}`,
      question: questionText,
      answer: '', // Will be filled by the API response
      timestamp: new Date(),
      isLoading: true // Set loading state to true
    };
    
    // Add to the list immediately to show the question
    this.promptResponses = [...this.promptResponses, newPrompt];
    this.cdr.detectChanges(); // Force change detection
    
    // Clear the input if using the form
    if (!question) {
      this.questionControl.reset();
    }
    
    // Call the service to get an answer - now using the optimized implementation
    // that doesn't repeat the document fetching process for each question
    this.regulatoryService.askDocumentQuestion(
      this.documentSummary.id, 
      questionText
    ).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        // Update loading state for this specific prompt
        this.promptResponses = this.promptResponses.map(pr => {
          if (pr.id === newPrompt.id) {
            return { ...pr, isLoading: false };
          }
          return pr;
        });
        this.cdr.detectChanges(); // Force change detection
      }),
      catchError(error => {
        // Handle error in asking question
        const errorMsg = `Sorry, there was an error processing your question: ${error.message || 'Please try again.'}`;
        // Update the specific prompt with the error
        this.promptResponses = this.promptResponses.map(pr => {
          if (pr.id === newPrompt.id) {
            return { ...pr, answer: errorMsg, isLoading: false };
          }
          return pr;
        });
        this.cdr.detectChanges(); // Force change detection
        return of(null); // Return null to be handled in the next callback
      })
    ).subscribe({
      next: (response) => {
        if (response) {
          // Update the prompt response with the answer - format it for better display
          const formattedAnswer = this.formatAiResponse(response.answer);
          
          this.promptResponses = this.promptResponses.map(pr => {
            if (pr.id === newPrompt.id) {
              return {
                ...pr,
                id: response.id || pr.id,
                answer: formattedAnswer,
                isLoading: false
              };
            }
            return pr;
          });
          this.cdr.detectChanges(); // Force change detection
        }
        // If response is null, the error has been handled in catchError
      }
    });
  }
  
  /**
   * Format AI response text for better display
   * @param text Raw response text from API
   * @returns Formatted text with proper line breaks and spacing
   */
  private formatAiResponse(text: string): string {
    if (!text) return '';
    
    // Replace numbered lists with proper formatting
    let formatted = text.replace(/(\d+)\.\s+/g, '\n$1. ');
    
    // Ensure paragraphs have proper spacing
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Trim extra whitespace
    return formatted.trim();
  }

  /**
   * Get remaining character count for the question input
   */
  getRemainingCharacters(): number {
    const currentLength = this.questionControl.value?.length || 0;
    return this.questionCharLimit - currentLength;
  }

  returnToSearch(): void {
    this.router.navigate(['/']);
  }
}