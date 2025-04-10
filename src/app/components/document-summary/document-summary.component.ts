import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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
import { finalize } from 'rxjs';
import { DocumentDataService } from '../../services/document-data.service';
// Update the DocumentSummary interface in document-summary.component.ts



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
export class DocumentSummaryComponent implements OnInit {
  documentSummary: DocumentSummary | null = null;
  isLoading = true;
  showExtendedMetadata = false;
  error: string | null = null;
  
  // For handling the Q&A
  questionControl = new FormControl('', [Validators.required]);
  promptResponses: PromptResponse[] = [];
  
  // Default summary prompt - to be shown as the first question
  defaultSummaryPrompt = 'Provide a concise summary of this document';
  
  // Predefined prompts grouped by document type
  predefinedPromptsByType: Record<string, string[]> = {
    // Default prompts for all document types
    'default': [
      'When was it last updated?',
      'Summarize it in a different way',
      'Search for another document'
    ],
    
    // Specific prompts for different document types
    'Notice': [
      'When does this notice take effect?',
      'What actions are required based on this notice?',
      'Are there any deadlines I should be aware of?',
      'Does this notice supersede any previous notices?'
    ],
    
    'Rule': [
      'What are the key compliance requirements in this rule?',
      'When does this rule take effect?',
      'What penalties apply for non-compliance?',
      'How does this rule apply to small businesses?',
      'What reporting requirements does this rule establish?'
    ],
    
    'Proposed Rule': [
      'What changes are being proposed?',
      'How does this differ from the current regulation?',
      'When is the comment period deadline?',
      'How can I submit comments on this proposal?',
      'What is the expected implementation timeline?'
    ],
    
    'Order': [
      'Who is affected by this order?',
      'What are the main directives in this order?',
      'What is the timeframe for compliance?',
      'Are there any exemptions to this order?'
    ]
  };
  
  // Active list of predefined prompts - will be set based on document type
  predefinedPrompts: string[] = [];
  
  // Control how many prompts to show initially
  initialPromptCount = 4;
  showAllPrompts = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private regulatoryService: RegulatoryService,
    private documentDataService: DocumentDataService, // Add this line
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Get document ID from route parameters
    this.route.paramMap.subscribe(params => {
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

  private loadDocumentSummary(documentId: string, isUrl: boolean): void {
    this.isLoading = true;
    this.error = null;
    this.cdr.detectChanges(); // Force change detection on loading state
    
    this.regulatoryService.summarizeDocument(documentId, isUrl)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges(); // Force change detection when loading completes
        })
      )
      .subscribe({
        next: (summary) => {
          this.documentSummary = summary;
          
          // Set up predefined prompts based on document type
          this.setupPredefinedPrompts(summary.documentType);
          
          // Add the default summary prompt as the first question
          // with the summary that was just loaded as the answer
          this.addDefaultSummaryPrompt(summary.summary);
          
          this.cdr.detectChanges(); // Force change detection
        },
        error: (err) => {
          console.error('Error loading document summary', err);
          this.error = 'Failed to load document summary. Please try again.';
          this.cdr.detectChanges(); // Force change detection
        }
      });
  }

  /**
   * Set up the predefined prompts based on document type
   */
  private setupPredefinedPrompts(documentType: string): void {
    // Start with default prompts
    let prompts = [...this.predefinedPromptsByType['default']];
    
    // Add document-type specific prompts if available
    if (documentType && this.predefinedPromptsByType[documentType]) {
      prompts = prompts.concat(this.predefinedPromptsByType[documentType]);
    }
    
    // Add a common context-specific prompt
    prompts.push(`Provide a concise summary of the key requirements and obligations outlined in this ${documentType.toLowerCase()} using approximately 500 words`);
    
    // Add a geographically relevant prompt
    prompts.push(`Does this ${documentType.toLowerCase()} apply in New York?`);
    
    // Set the prompts
    this.predefinedPrompts = prompts;
    
    // Reset the show all prompts flag
    this.showAllPrompts = false;
  }
  
  selectQuestion(selectedResponseId: string): void {
    // Set the selected question as active and deactivate others
    this.promptResponses = this.promptResponses.map(pr => ({
      ...pr,
      isActive: pr.id === selectedResponseId
    }));
    this.cdr.detectChanges(); // Force change detection
  }

  // Add a new method to handle the default summary prompt
  private addDefaultSummaryPrompt(summaryText: string): void {
    // Create a prompt response for the default summary
    const defaultPromptResponse: PromptResponse = {
      id: `default-summary-${Date.now()}`,
      question: this.defaultSummaryPrompt,
      answer: summaryText,
      timestamp: new Date(),
      isActive: true // Mark as active initially
    };
    
    // Add it to the beginning of the prompt responses array
    this.promptResponses = [defaultPromptResponse];
    this.cdr.detectChanges(); // Force change detection
  }

  toggleExtendedMetadata(): void {
    this.showExtendedMetadata = !this.showExtendedMetadata;
  }
  
  // Added method to select a previously asked question
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

  askQuestion(question: string = ''): void {
    // If no question provided, use the one from the form
    const questionText = question || this.questionControl.value;
    
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
    if (!question) {
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
}