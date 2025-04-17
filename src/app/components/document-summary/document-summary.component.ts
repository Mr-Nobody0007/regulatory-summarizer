import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
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
import { finalize, Observable, of } from 'rxjs';
import { DocumentDataService } from '../../services/document-data.service';
import { PromptService, Prompt } from '../../services/prompt.service';


// In document-summary.component.ts
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

export interface PromptResponse {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
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
  showExtendedMetadata = false;
  error: string | null = null;
prompts  : Prompt[] = [{
    "purpose": "Summary",
    "isDefault": true,
    "label": "Provide a concise summary",
    "prompt": "Provide a concise summary of this document highlighting the key points, requirements, and implications.",
    "documentType": "ANY"
  },
  {
    "purpose": "Summary",
    "isDefault": false,
    "label": "Summarize regulatory requirements",
    "prompt": "Identify and summarize the main regulatory requirements or obligations outlined in this document.",
    "documentType": "Rule"
  },
  {
    "purpose": "Analysis",
    "isDefault": false,
    "label": "Explain the compliance timeline",
    "prompt": "Explain the timeline for compliance with this regulation, including any phased implementation periods.",
    "documentType": "Rule"
  },
  {
    "purpose": "Analysis",
    "isDefault": false,
    "label": "Analyze proposed changes",
    "prompt": "Analyze the key changes being proposed in this document compared to existing regulations.",
    "documentType": "Proposed Rule"
  },
  {
    "purpose": "Application",
    "isDefault": false,
    "label": "How does this apply to small businesses?",
    "prompt": "Explain how this regulation applies specifically to small businesses, including any exemptions or special provisions.",
    "documentType": "ANY"
  },
  {
    "purpose": "Clarification",
    "isDefault": false,
    "label": "Explain comment submission process",
    "prompt": "Explain the process for submitting comments on this proposed rule, including deadlines and submission methods.",
    "documentType": "Proposed Rule"
  },
  {
    "purpose": "Analysis",
    "isDefault": false,
    "label": "Identify key deadlines",
    "prompt": "Identify all important deadlines, effective dates, and compliance dates mentioned in this document.",
    "documentType": "ANY"
  }];
  
  // For handling the Q&A
  questionControl = new FormControl('', [Validators.required]);
  promptResponses: PromptResponse[] = [];
  
  // Default summary prompt - to be shown as the first question
  defaultSummaryPrompt = 'Provide a concise summary of this document';
  
  // Flags to track if we need to scroll to bottom
  private shouldScrollToBottom = false;
  private shouldScrollQuestionsToBottom = false;
  
  // Predefined prompts grouped by document type
  // predefinedPromptsByType: Record<string, string[]> = {
  //   // Default prompts for all document types
  //   'default': [
  //     'When was it last updated?',
  //     'Summarize it in a different way',
  //     'Search for another document'
  //   ],
    
  //   // Specific prompts for different document types
  //   'Notice': [
  //     'When does this notice take effect?',
  //     'What actions are required based on this notice?',
  //     'Are there any deadlines I should be aware of?',
  //     'Does this notice supersede any previous notices?'
  //   ],
    
  //   'Rule': [
  //     'What are the key compliance requirements in this rule?',
  //     'When does this rule take effect?',
  //     'What penalties apply for non-compliance?',
  //     'How does this rule apply to small businesses?',
  //     'What reporting requirements does this rule establish?'
  //   ],
    
  //   'Proposed Rule': [
  //     'What changes are being proposed?',
  //     'How does this differ from the current regulation?',
  //     'When is the comment period deadline?',
  //     'How can I submit comments on this proposal?',
  //     'What is the expected implementation timeline?'
  //   ],
    
  //   'Order': [
  //     'Who is affected by this order?',
  //     'What are the main directives in this order?',
  //     'What is the timeframe for compliance?',
  //     'Are there any exemptions to this order?'
  //   ]
  // };
  
  // Active list of predefined prompts - will be set based on document type
  predefinedPrompts: string[] = [];
  
  // Control how many prompts to show initially
  initialPromptCount = 4;
  showAllPrompts = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private regulatoryService: RegulatoryService,
    private documentDataService: DocumentDataService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private promptService: PromptService
  ) {}

  ngOnInit(): void {
    // Get document ID from route parameters
    this.route.paramMap.subscribe(params => {
      const documentId = params.get('id');
      const isUrl = params.get('isUrl') === 'true';
      
      if (documentId) { this.route.queryParams.subscribe(queryParams => {
        const initialPrompt = queryParams['promptId'];
        this.loadDocumentSummary(documentId, isUrl, initialPrompt);
      });} else {
        this.error = 'No document specified';
        this.isLoading = false;
        this.cdr.detectChanges(); // Force change detection
      }
    });
  }
  
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

  loadPrompts(): Observable<Prompt[]> {
    // Simply return the hardcoded prompts
    return of(this.prompts);
  }

  private loadDocumentSummary(documentId: string, isUrl: boolean, initialPrompt?: string): void {
    this.isLoading = true;
    this.error = null;
    this.cdr.detectChanges(); // Force change detection on loading state
    
    // If there's an initial prompt from router params, use it directly
    if (initialPrompt) {
      this.regulatoryService.summarizeDocumentWithPrompt(documentId, initialPrompt, isUrl)
        .pipe(
          finalize(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
          })
        )
        .subscribe({
          next: (summary) => {
            this.documentSummary = summary;
            
            // Load prompts based on document type
            this.loadPromptsForDocumentType(summary.documentType);
            
            // Add the default summary prompt as the first question
            // with the summary that was just loaded as the answer
            this.addDefaultSummaryPrompt(summary.summary, initialPrompt);
            
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error loading document summary', err);
            this.error = 'Failed to load document summary. Please try again.';
            this.cdr.detectChanges();
          }
        });
    } else {
      // Original flow without a specific prompt
      this.regulatoryService.summarizeDocument(documentId, isUrl)
        .pipe(
          finalize(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
          })
        )
        .subscribe({
          next: (summary) => {
            this.documentSummary = summary;
            
            // Load prompts based on document type
            this.loadPromptsForDocumentType(summary.documentType);
            
            // Check if we have a selected prompt from the service
            const selectedPrompt = this.documentDataService.getSelectedPrompt();
            
            // Add the default summary with either the selected prompt or fallback
            this.addDefaultSummaryPrompt(
              summary.summary, 
              selectedPrompt ? selectedPrompt.label : this.defaultSummaryPrompt
            );
            
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Error loading document summary', err);
            this.error = 'Failed to load document summary. Please try again.';
            this.cdr.detectChanges();
          }
        });
    }
  }

  /**
   * Load prompts for a specific document type
   */
  private loadPromptsForDocumentType(documentType: string): void {
    this.promptService.getPromptsByDocumentType(documentType).subscribe(prompts => {
      this.prompts = prompts;
      
      // Update the predefined prompts with the loaded prompt labels
      this.predefinedPrompts = prompts.map(p => p.label);
      
      // Reset the show all prompts flag
      this.showAllPrompts = false;
      
      this.cdr.detectChanges();
    });
  }


  /**
   * Set up the predefined prompts based on document type
   */
  // private setupPredefinedPrompts(documentType: string): void {
  //   // Start with default prompts
  //   let prompts = [...this.predefinedPromptsByType['default']];
    
  //   // Add document-type specific prompts if available
  //   if (documentType && this.predefinedPromptsByType[documentType]) {
  //     prompts = prompts.concat(this.predefinedPromptsByType[documentType]);
  //   }
    
  //   // Add a common context-specific prompt
  //   prompts.push(`Provide a concise summary of the key requirements and obligations outlined in this ${documentType.toLowerCase()} using approximately 500 words`);
    
  //   // Add a geographically relevant prompt
  //   prompts.push(`Does this ${documentType.toLowerCase()} apply in New York?`);
    
  //   // Set the prompts
  //   this.predefinedPrompts = prompts;
    
  //   // Reset the show all prompts flag
  //   this.showAllPrompts = false;
  // }
  
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
    this.cdr.detectChanges(); // Force change detection
  }

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
  get visiblePrompts(): string[] {
    if (this.showAllPrompts) {
      return this.predefinedPrompts;
    } else {
      return this.predefinedPrompts.slice(0, this.initialPromptCount);
    }
  }

  askQuestion(labelOrPrompt: string = ''): void {
    // If it's a prompt label from our predefined list, get the full prompt text
    let promptText = labelOrPrompt;
    
    // If the input is a label from our prompts, get the full prompt text
    if (labelOrPrompt && this.prompts.length > 0) {
      const matchingPrompt = this.prompts.find(p => p.label === labelOrPrompt);
      if (matchingPrompt) {
        promptText = matchingPrompt.prompt;
        
        // Populate the question control with the full prompt text
        this.questionControl.setValue(promptText);
        
        // Don't send the request yet - let user review and submit
        return;
      }
    }
    
    // If no question provided, use the one from the form
    const questionText = promptText || this.questionControl.value;
    
    if (!questionText) {
      return;
    }
    
    if (!this.documentSummary) {
      return;
    }
    
    // Create a new prompt response with a temporary ID
    const newPrompt: PromptResponse = {
      id: `temp-${Date.now()}`,
      question: questionText,
      answer: '', // Will be filled by the API response
      timestamp: new Date(),
      isActive: true // Set this as the active question
    };
    
    // Set all existing questions as inactive
    const updatedPrompts = this.promptResponses.map(pr => ({
      ...pr,
      isActive: false
    }));
    
    // Add the new question to the end of the array
    this.promptResponses = [...updatedPrompts, newPrompt];
    
    this.cdr.detectChanges(); // Force change detection
    
    // Clear the input if using the form
    if (!labelOrPrompt) {
      this.questionControl.reset();
    }
    
    // Call the service to get an answer
    this.regulatoryService.askDocumentQuestion(
      this.documentSummary.id, 
      questionText
    ).subscribe({
      next: (response) => {
        // Update the prompt response with the answer
        this.promptResponses = this.promptResponses.map(pr => {
          if (pr.id === newPrompt.id) {
            return {
              ...pr,
              id: response.id || pr.id,
              answer: response.answer,
              isActive: true // Ensure it's still active
            };
          }
          return pr;
        });
        this.cdr.detectChanges(); // Force change detection
      },
      error: (err) => {
        console.error('Error asking question', err);
        // Update the prompt response with an error
        this.promptResponses = this.promptResponses.map(pr => {
          if (pr.id === newPrompt.id) {
            return {
              ...pr,
              answer: 'Sorry, there was an error processing your question. Please try again.',
              isActive: true // Ensure it's still active
            };
          }
          return pr;
        });
        this.cdr.detectChanges(); // Force change detection
      }
    });
  }

  returnToSearch(): void {
    this.router.navigate(['/']);
  }

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
  // Implement your feedback collection logic here
  console.log(`Providing feedback for response: ${responseId}`);
  // You could open a dialog or modal to collect feedback
  // Or navigate to a feedback form
  
  // Example with MatDialog:
  // this.dialog.open(FeedbackDialogComponent, {
  //   width: '400px',
  //   data: { responseId: responseId }
  // });
}
}