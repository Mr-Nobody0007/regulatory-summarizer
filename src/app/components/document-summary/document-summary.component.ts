import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
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
import { MatDialog } from '@angular/material/dialog';
import { FeedbackDialogComponent } from '../feedback-dialog/feedback-dialog.component'
import { finalize, catchError, takeUntil } from 'rxjs/operators';
import { Observable, of, Subject } from 'rxjs';
import { DocumentDataService } from '../../services/document-data.service';
//import { FEATURE_FLAGS } from '../../app.config';
import { Prompt, PromptService } from '../../services/prompt.service';

export interface DocumentSummary {
  id: string;
  title: string;
  publicationDate: string;
  agency: string;
  documentType: string;
  summary: string;
  // Additional metadata
  documentNumber?: string;
  startPage?: number;
  endPage?: number;
  cfrReferences?: string[];
  docketIds?: string[];
  regulationIdNumbers?: string[];
  effectiveDate?: string;
}

export interface FeedbackData {
  responseId: string;
  timestamp: Date;
}

// interface FeedbackData {
export interface PromptResponse {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
  isLoading?: boolean;
  isActive: boolean; // Flag to track the active/current question - Making it required instead of optional
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
export class DocumentSummaryComponent implements OnInit, AfterViewChecked {
  @ViewChild('answersHistory') answersHistoryElement!: ElementRef;
  @ViewChild('documentPanel') documentPanelElement!: ElementRef;
  @ViewChild('askedQuestions') askedQuestionsElement!: ElementRef;

  documentSummary: DocumentSummary | null = null;
  isLoading = true;
  isApiProcessing = false; // New flag for tracking the multi-step API process
  processStep = 0; // Track which step of the API process we're in (0-3)
  showExtendedMetadata = false;
  error: string | null = null;
  filteredPrompts: Prompt[] = [];

  // data = {
  //   documentNumber: '2025-00394',
  //   aiInstructions: 'Summarize in 10 points',
  //   temperature: 0,
  //   topP: 0,
  //   seed: 100,
  //   singalRConnId: '',
  //   aiSource: 'Azure',
  //   requestUser: 'ZKQZJD5',
  //   requestDateTimeUtc: '2025-04-10T10:29:09.264Z',
  //   regSumApiUrl: '',
  //   displayName: 'Kesani, Krishna Chitanya'
  // };

  // For handling the Q&A
  questionControl = new FormControl('', [Validators.required]);
  promptResponses: PromptResponse[] = [];
  questionCharLimit = 1000; // Character limit for questions
  private defaultSummaryPrompt: string = '//';
  // Subscription cleanup
  private destroy$ = new Subject<void>();

  // Default summary prompt - to be shown as the first question
  

  // Flags to track if we need to scroll to bottom
  private shouldScrollToBottom = true;
  private shouldScrollQuestionsToBottom = true;

  // Predefined prompts grouped by document type
  predefinedPrompts: string[] = [];
  initialPromptCount = 4;
  showAllPrompts = false;

  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private regulatoryService: RegulatoryService,
    private documentDataService: DocumentDataService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private promptService: PromptService,
    private dialog: MatDialog
    
  ) { this.defaultSummaryPrompt = ''; }

  // Helper method to scroll to bottom of answers history
  private scrollToBottom(): void {
    try {
      setTimeout(() => {
        // Use setTimeout to ensure the DOM has been updated
        if (this.documentPanelElement && this.documentPanelElement.nativeElement) {
          const element = this.documentPanelElement.nativeElement;
          element.scrollTop = element.scrollHeight + 1000; // Add extra to ensure it goes all the way
        }
      }, 10);
    } catch (err) {
      console.error('Error scrolling document panel to bottom', err);
    }
  }

  // Helper method to scroll to bottom of questions
  private scrollQuestionsToBottom(): void {
    try {
      setTimeout(() => {
        // Use setTimeout to ensure the DOM has been updated
        if (this.askedQuestionsElement && this.askedQuestionsElement.nativeElement) {
          const element = this.askedQuestionsElement.nativeElement;
          element.scrollTop = element.scrollHeight + 1000; // Add extra to ensure it goes all the way
        }
      }, 10);
    } catch (err) {
      console.error('Error scrolling questions to bottom', err);
    }
  }



  ngOnInit(): void {
    // Get document ID from route parameters
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const documentId = params.get('id');
      const isUrl = params.get('isUrl') === 'true';
  
      // Get the prompt from history state
      const state = window.history.state as { prompt?: string };
      const promptText = state?.prompt || 'Provide a concise summary of this document';
      console.log('Prompt from state:', promptText);
      
      if (documentId) {
        this.loadDocumentSummary(documentId, isUrl, promptText);
      } else {
        this.error = 'No document specified';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // private loadPromptSuggestions(): void {
  //   if (this.documentSummary?.documentType) {
  //     this.promptService.getPromptsByDocumentType(this.documentSummary.documentType)
  //       .subscribe(prompts => {
  //         this.filteredPrompts = prompts;
  //         // Update predefined prompts based on these filtered prompts
  //         this.predefinedPrompts = prompts.map(p => p.prompt);
  //         this.cdr.detectChanges();
  //       });
  //   }
  // }

  ngAfterViewChecked() {
    // If the flag is set, scroll to the bottom of document panel
    if (this.shouldScrollToBottom && this.documentPanelElement) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }

    // If the flag is set, scroll to the bottom of questions panel
    if (this.shouldScrollQuestionsToBottom && this.askedQuestionsElement) {
      this.scrollQuestionsToBottom();
      this.shouldScrollQuestionsToBottom = false;
    }
  }

  ngOnDestroy(): void {
    // Clean up all subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDocumentSummary(documentId: string, isUrl: boolean, promptText: string): void {
    this.isLoading = true;
    this.isApiProcessing = true;
    this.processStep = 1; // Starting the first API call
    this.error = null;
    this.cdr.detectChanges();
    
    console.log('Using prompt for document summary:', promptText);
    
    this.regulatoryService
      .summarizeDocumentWithPrompt(documentId, promptText, isUrl)
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
        next: summary => {
          if (summary) {
            this.documentSummary = summary;
            
            // Load appropriate prompts based on document type
            this.setupPredefinedPrompts(summary.documentType);
            
            // Add the initial summary response to the prompt responses
            this.addDefaultSummaryPrompt(summary.summary, promptText);
            
            this.cdr.detectChanges();
          }
        }
      });
  }
  

  /**
   * Set up the predefined prompts based on document type
   */
  private setupPredefinedPrompts(documentType: string): void {
    // First, get prompts for this document type from the service
    this.promptService.getPromptsByDocumentType(documentType)
      .subscribe(prompts => {
        this.filteredPrompts = prompts;
        // Map to just the prompt text for the existing UI
        this.predefinedPrompts = prompts.map(p => p.prompt);
        // Reset the show all prompts flag
        this.showAllPrompts = false;
        this.cdr.detectChanges();
      });
  }

  selectQuestion(selectedResponseId: string): void {
    // Set the selected question as active and deactivate others
    this.promptResponses = this.promptResponses.map(pr => ({
      ...pr,
      isActive: pr.id === selectedResponseId
    }));

    // Set the flags to scroll both panels
    this.shouldScrollToBottom = true;
    this.shouldScrollQuestionsToBottom = true;
    this.shouldScrollQuestionsToBottom = true;
    this.cdr.detectChanges();
  }

  // Add a new method to handle the default summary prompt

  // Helper method to scroll to bottom of questions







  // Add a new method to handle the default summary prompt



  // Add a new method to handle the default summary prompt
  private addDefaultSummaryPrompt(summaryText: string, questionText: string = this.defaultSummaryPrompt): void {
    // Create a prompt response for the default summary
    const defaultPromptResponse: PromptResponse = {
      id: `default-summary-${Date.now()}`,
      question: questionText,
      answer: summaryText,
      timestamp: new Date(),
      isActive: true // Mark as active initially
    };

    // Add it to the beginning of the prompt responses array
    this.promptResponses = [defaultPromptResponse];
    this.shouldScrollToBottom = true;
    this.cdr.detectChanges(); // Force change detection
  }

  toggleExtendedMetadata(): void {
    this.showExtendedMetadata = !this.showExtendedMetadata;
  }

  /**
   * Toggle between showing all prompts or just the initial set
   */
  toggleShowAllPrompts(): void {
    this.showAllPrompts = !this.showAllPrompts;
    this.cdr.detectChanges();
  }

  /**
 * Get the prompts to display based on current state
 */
  get visiblePrompts(): Prompt[] {
    if (this.showAllPrompts) {
      return this.filteredPrompts;
    } else {
      return this.filteredPrompts.slice(0, this.initialPromptCount);
    }
  }

  
// Update the askQuestion method to properly handle the question parameter
// Update the askQuestion method to properly handle the prompt parameter
// Update the askQuestion method to properly handle the prompt parameter
askQuestion(label: string = ''): void {
  // If label is provided (from a suggestion)
  if (label) {
    // Find the full prompt object by its label
    const promptObj = this.filteredPrompts.find(p => p.label === label);
    if (promptObj) {
      // Set the question control value to the full prompt text
      this.questionControl.setValue(promptObj.prompt);
      return;
    }
  }
  
  const questionText = this.questionControl.value;
  
  // Make sure we have a valid question and document
  if (!questionText || !this.documentSummary) {
    return;
  }
  
  this.submitQuestion(questionText);
}

// Add a separate method to handle the submission
private submitQuestion(questionText: string): void {
  // Make sure documentSummary exists
  if (!this.documentSummary) {
    console.error('No document summary available');
    return;
  }

  // Create a new prompt response with a temporary ID and loading state
  const newPrompt: PromptResponse = {
    id: `temp-${Date.now()}`,
    question: questionText,
    answer: '', // Will be filled by the API response
    timestamp: new Date(),
    isLoading: true, // Set loading state to true
    isActive: true
  };
  
  // Update existing prompts to inactive
  const updatedPrompts = this.promptResponses.map(pr => ({
    ...pr,
    isActive: false
  }));
  
  // Add the new prompt to the list
  this.promptResponses = [...updatedPrompts, newPrompt];
  
  // Set flags to scroll to bottom
  this.shouldScrollToBottom = true;
  this.shouldScrollQuestionsToBottom = true;
  this.cdr.detectChanges();
  
  // Clear the input field
  this.questionControl.reset();
  
  // Call the service to get an answer
  this.regulatoryService
    .askDocumentQuestion(this.documentSummary.id, questionText)
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        // Update loading state for this specific prompt
        this.promptResponses = this.promptResponses.map(pr => {
          if (pr.id === newPrompt.id) {
            return { ...pr, isLoading: false };
          }
          return pr;
        });
        this.shouldScrollToBottom = true;
        this.cdr.detectChanges();
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
        this.shouldScrollToBottom = true;
        this.cdr.detectChanges();
        return of(null);
      })
    )
    .subscribe({
      next: response => {
        if (response) {
          // Update the prompt response with the answer
          const formattedAnswer = this.formatAIResponse(response.answer);
          
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
          this.shouldScrollToBottom = true;
          this.cdr.detectChanges();
        }
      }
    });
}

// Add a separate method to handle the submission

  
  /**
   * Format AI response text for better display
   * @param text Raw response text from API
   * @returns Formatted text with proper line breaks and spacing
   */
  private formatAIResponse(text: string): string {
    if (!text) return '';
    
    // Replace numbered lists with proper formatting
    let formatted = text.replace(/(\d+)\.\s+/g, '\n$1. ');
    
    // Ensure paragraphs have proper spacing
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Trim extra whitespace
  return formatted.trim();
}

/**
 * Opens the PDF document in a new tab
 * @param documentId The ID of the document to open
 */
openPdfDocument(documentId: string): void {
  if (!this.documentSummary || !this.documentSummary.publicationDate) {
    console.error('Missing document information required for PDF URL');
    return;
  }
  
  // Parse the publication date
  // Assuming publicationDate is in the format "Month DD, YYYY" or "MM/DD/YYYY"
  const pubDate = new Date(this.documentSummary.publicationDate);
  
  // Format as YYYY-MM-DD for the URL
  const formattedDate = 
    pubDate.getFullYear() + '-' + String(pubDate.getMonth() + 1).padStart(2, '0') + '-' + String(pubDate.getDate()).padStart(2, '0');
  
  // Construct the URL based on the govinfo.gov format
  // Format: https://www.govinfo.gov/content/pkg/FR-YYYY-MM-DD/pdf/YYYY-NNNNN.pdf
  const pdfUrl = `https://www.govinfo.gov/content/pkg/FR-${formattedDate}/pdf/${documentId}.pdf`;
  
  // Fallback URL in case the primary one doesn't work
  //const fallbackUrl = `https://www.federalregister.gov/api/v1/documents/${documentId}/pdf`;
  
  // Open in a new tab
  window.open(pdfUrl, '_blank');
  
  // Log for debugging
  console.log('Opening PDF URL:', pdfUrl);
  // console.log('Fallback URL (if needed):', fallbackUrl);
}
getRemainingCharacters(): number{
  const currentLength = this.questionControl.value?.length || 0;
  return this.questionCharLimit - currentLength;
}

returnToSearch(): void {
  this.router.navigate(['/'])
}
/**
 * Get remaining character count for the question input

  returnToSearch(): void {
    this.router.navigate(['/']);
  }
    getRemainingCharacters(): number{
    const currentLength = this.questionControl.value?.length || 0;
    return this.questionControl.value?.length}

  /**
 * Copy text to clipboard
 * @param text The text to copy
 */
  copyText(text: string): void {
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      // You could show a success message or snackbar here
      console.log('Text copied to clipboard');
      // If you have Angular Material, you could use a snackbar:
      // this.snackBar.open('Copied to clipboard', 'Close', { duration: 2000 });
    }).catch(err => {
      console.error('Error copying text: ', err);
    });
  }

  /**
   * Download text as a file
   * @param text The text content to download
   * @param filename The name of the file
   */
  downloadText(text: string, filename: string): void {
    if (!text) return;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * Handle providing feedback
   * @param responseId The ID of the response to provide feedback for
   */
  provideFeedback(responseId: string): void {
    const dialogRef = this.dialog.open(FeedbackDialogComponent, {
      width: '800px',
      data: { responseId }
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Feedback submitted:', result);
        
        this.regulatoryService.submitFeedback(result).subscribe({
          next: () => {
            console.log('Feedback submitted successfully');
          },
          error: err => {
            console.error('Error submitting feedback', err);
          }
        });
      }
    });
  }
}