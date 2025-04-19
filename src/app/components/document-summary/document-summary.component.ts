// Modify DocumentSummary interface to include documentDto
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
  // New field for documentDto from response
  documentDto?: any;
  // PDF URL from documentDto
  pdfUrl?: string;
}

export interface PromptResponse {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
  isActive?: boolean;
  isLoading?: boolean;
}

// Update in the existing component file
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
import { Prompt, PromptService } from '../../services/prompt.service';

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
  isApiProcessing = false;
  processStep = 0;
  showExtendedMetadata = false;
  error: string | null = null;
  filteredPrompts: Prompt[] = [];

  questionControl = new FormControl('', [Validators.required]);
  promptResponses: PromptResponse[] = [];
  questionCharLimit = 1000;
  private defaultSummaryPrompt: string = '//';
  private destroy$ = new Subject<void>();

  private shouldScrollToBottom = true;
  private shouldScrollQuestionsToBottom = true;

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
        if (this.documentPanelElement && this.documentPanelElement.nativeElement) {
          const element = this.documentPanelElement.nativeElement;
          element.scrollTop = element.scrollHeight + 1000;
        }
      }, 10);
    } catch (err) {
      console.error('Error scrolling document panel to bottom', err);
    }
  }

  private scrollQuestionsToBottom(): void {
    try {
      setTimeout(() => {
        if (this.askedQuestionsElement && this.askedQuestionsElement.nativeElement) {
          const element = this.askedQuestionsElement.nativeElement;
          element.scrollTop = element.scrollHeight + 1000;
        }
      }, 10);
    } catch (err) {
      console.error('Error scrolling questions to bottom', err);
    }
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const documentId = params.get('id');
      const isUrl = params.get('isUrl') === 'true';
  
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

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom && this.documentPanelElement) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }

    if (this.shouldScrollQuestionsToBottom && this.askedQuestionsElement) {
      this.scrollQuestionsToBottom();
      this.shouldScrollQuestionsToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDocumentSummary(documentId: string, isUrl: boolean, promptText: string): void {
    this.isLoading = true;
    this.isApiProcessing = true;
    this.processStep = 1;
    this.error = null;
    this.cdr.detectChanges();
    
    console.log('Using prompt for document summary:', promptText);
    
    // First, set up the component with loading state
    this.documentSummary = {
      id: documentId,
      title: 'Loading...',
      summary: '',
      publicationDate: '',
      agency: '',
      documentType: ''
    };
    
    // Add an empty response that's marked as loading
    this.addDefaultSummaryPrompt('', promptText);
    
    this.regulatoryService
      .summarizeDocumentWithPrompt(documentId, promptText, isUrl)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
          this.isApiProcessing = false;
          this.processStep = 0;
          this.cdr.detectChanges();
        }),
        catchError(error => {
          this.error = `Failed to load document summary: ${error.message || 'Unknown error'}`;
          
          // Update the loading summary to show the error
          this.promptResponses = this.promptResponses.map(pr => {
            if (pr.isActive) {
              return {
                ...pr,
                answer: `Error: ${this.error}`,
                isLoading: false
              };
            }
            return pr;
          });
          
          return of(null);
        })
      )
      .subscribe({
        next: summary => {
          if (summary) {
            // Process the documentDto data if available
            if (summary.documentDto) {
              this.processDocumentDto(summary);
            }
            
            this.documentSummary = summary;
            this.setupPredefinedPrompts(summary.documentType);
            
            // Update the loading summary to show the actual summary
            this.promptResponses = this.promptResponses.map(pr => {
              if (pr.isActive) {
                return {
                  ...pr,
                  answer: summary.summary,
                  isLoading: false
                };
              }
              return pr;
            });
            
            this.cdr.detectChanges();
          }
        }
      });
  }

  // New method to process documentDto data
  private processDocumentDto(summary: DocumentSummary): void {
    const dto = summary.documentDto;
    if (!dto) return;

    // Use documentDto data for metadata
    summary.documentNumber = dto.document_number || summary.documentNumber;
    summary.title = dto.title || summary.title;
    summary.agency = this.extractAgencyNames(dto.agencies) || summary.agency;
    summary.documentType = dto.type || summary.documentType;
    summary.publicationDate = this.formatDate(dto.publication_date) || summary.publicationDate;
    summary.effectiveDate = this.formatDate(dto.effective_on) || summary.effectiveDate;
    summary.startPage = dto.start_page || summary.startPage;
    summary.endPage = dto.end_page || summary.endPage;
    summary.cfrReferences = this.formatCfrReferences(dto.cfr_references) || summary.cfrReferences;
    summary.docketIds = dto.docket_ids || summary.docketIds;
    summary.regulationIdNumbers = dto.regulation_id_numbers || summary.regulationIdNumbers;
    
    // Store PDF URL directly
    summary.pdfUrl = dto.pdf_url || null;
  }

  // Helper method to format CFR references
  private formatCfrReferences(cfrRefs: any[] | null): string[] {
    if (!cfrRefs || !Array.isArray(cfrRefs) || cfrRefs.length === 0) {
      return [];
    }
    
    return cfrRefs.map(ref => {
      if (ref.title && ref.part) {
        return `${ref.title} CFR ${ref.part}`;
      }
      return '';
    }).filter(ref => ref !== '');
  }

  // Helper method to extract agency names from agencies array
  private extractAgencyNames(agencies: any[] | null): string {
    if (!agencies || !Array.isArray(agencies) || agencies.length === 0) {
      return '';
    }
    
    return agencies.map(agency => agency.name || '').filter(name => name).join(', ');
  }
  
  // Helper method to format dates - add to component class to use in template
  formatDate(dateString: string | null): string {
    if (!dateString) return '';
    
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  }

  private setupPredefinedPrompts(documentType: string): void {
    this.promptService.getPromptsByDocumentType(documentType)
      .subscribe(prompts => {
        this.filteredPrompts = prompts;
        this.predefinedPrompts = prompts.map(p => p.prompt);
        this.showAllPrompts = false;
        this.cdr.detectChanges();
      });
  }

  selectQuestion(selectedResponseId: string): void {
    this.promptResponses = this.promptResponses.map(pr => ({
      ...pr,
      isActive: pr.id === selectedResponseId
    }));

    this.shouldScrollToBottom = true;
    this.shouldScrollQuestionsToBottom = true;
    this.cdr.detectChanges();
  }

  private addDefaultSummaryPrompt(summaryText: string, questionText: string = this.defaultSummaryPrompt): void {
    // If summary is still being loaded, show a loading state
    const isLoading = !summaryText || summaryText.length === 0;
    
    const defaultPromptResponse: PromptResponse = {
      id: `default-summary-${Date.now()}`,
      question: questionText,
      answer: summaryText || '',
      timestamp: new Date(),
      isActive: true,
      isLoading: isLoading // Set this based on whether we have a summary yet
    };
  
    this.promptResponses = [defaultPromptResponse];
    this.shouldScrollToBottom = true;
    this.cdr.detectChanges();
    
    // We don't need to subscribe to a non-existent observable here.
    // The loading state will be updated in the loadDocumentSummary method
    // when the API response is received.
  }
  
  // Modify the loadDocumentSummary method to handle loading properly
  

  toggleExtendedMetadata(): void {
    this.showExtendedMetadata = !this.showExtendedMetadata;
  }

  toggleShowAllPrompts(): void {
    this.showAllPrompts = !this.showAllPrompts;
    this.cdr.detectChanges();
  }

  get visiblePrompts(): Prompt[] {
    if (this.showAllPrompts) {
      return this.filteredPrompts;
    } else {
      return this.filteredPrompts.slice(0, this.initialPromptCount);
    }
  }

  askQuestion(label: string = ''): void {
    if (label) {
      const promptObj = this.filteredPrompts.find(p => p.label === label);
      if (promptObj) {
        this.questionControl.setValue(promptObj.prompt);
        return;
      }
    }
    
    const questionText = this.questionControl.value;
    
    if (!questionText || !this.documentSummary) {
      return;
    }
    
    this.submitQuestion(questionText);
  }

  // Changes to make in the submitQuestion method in your document-summary.component.ts file

  private submitQuestion(questionText: string): void {
    if (!this.documentSummary) {
      console.error('No document summary available');
      return;
    }

    const newPrompt: PromptResponse = {
      id: `temp-${Date.now()}`,
      question: questionText,
      answer: '',
      timestamp: new Date(),
      isLoading: true, // Set this to true while loading
      isActive: true
    };
    
    const updatedPrompts = this.promptResponses.map(pr => ({
      ...pr,
      isActive: false
    }));
    
    this.promptResponses = [...updatedPrompts, newPrompt];
    
    this.shouldScrollToBottom = true;
    this.shouldScrollQuestionsToBottom = true;
    this.cdr.detectChanges();
    
    this.questionControl.reset();
    
    this.regulatoryService
      .askDocumentQuestion(this.documentSummary.id, questionText)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          // We'll now handle this in the next block, so we no longer need to set isLoading to false here
          this.shouldScrollToBottom = true;
          this.cdr.detectChanges();
        }),
        catchError(error => {
          const errorMsg = `Sorry, there was an error processing your question: ${error.message || 'Please try again.'}`;
          this.promptResponses = this.promptResponses.map(pr => {
            if (pr.id === newPrompt.id) {
              return { ...pr, answer: errorMsg, isLoading: false }; // Important: set isLoading to false on error
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
            const formattedAnswer = this.formatAIResponse(response.answer);
            
            this.promptResponses = this.promptResponses.map(pr => {
              if (pr.id === newPrompt.id) {
                return {
                  ...pr,
                  id: response.id || pr.id,
                  answer: formattedAnswer,
                  isLoading: false // Important: set isLoading to false when the answer is ready
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

  private formatAIResponse(text: string): string {
    if (!text) return '';
    
    let formatted = text.replace(/(\d+)\.\s+/g, '\n$1. ');
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    return formatted.trim();
  }

  // Updated method to use the PDF URL from documentDto
  openPdfDocument(documentId: string): void {
    if (!this.documentSummary) {
      console.error('Missing document information required for PDF URL');
      return;
    }
    
    // Use the stored PDF URL from documentDto if available
    if (this.documentSummary.pdfUrl) {
      window.open(this.documentSummary.pdfUrl, '_blank');
      console.log('Opening PDF URL from documentDto:', this.documentSummary.pdfUrl);
      return;
    }
    
    // Fall back to constructing URL based on document ID and publication date
    if (!this.documentSummary.publicationDate) {
      console.error('Missing publication date required for fallback PDF URL');
      return;
    }
    
    const pubDate = new Date(this.documentSummary.publicationDate);
    const formattedDate = 
      pubDate.getFullYear() + '-' + 
      String(pubDate.getMonth() + 1).padStart(2, '0') + '-' + 
      String(pubDate.getDate()).padStart(2, '0');
    
    const pdfUrl = `https://www.govinfo.gov/content/pkg/FR-${formattedDate}/pdf/${documentId}.pdf`;
    
    window.open(pdfUrl, '_blank');
    console.log('Opening fallback PDF URL:', pdfUrl);
  }

  getRemainingCharacters(): number {
    const currentLength = this.questionControl.value?.length || 0;
    return this.questionCharLimit - currentLength;
  }

  returnToSearch(): void {
    this.router.navigate(['/'])
  }

  copyText(text: string): void {
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      console.log('Text copied to clipboard');
    }).catch(err => {
      console.error('Error copying text: ', err);
    });
  }

  downloadText(text: string, filename: string): void {
    if (!text) return;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  provideFeedback(responseId: string): void {
    // If we have the regulationRequestId from documentDto, use it for feedback
    const regulationRequestId = this.documentSummary?.documentDto?.regulationRequestId || responseId;
    
    const dialogRef = this.dialog.open(FeedbackDialogComponent, {
      width: '800px',
      data: { responseId: regulationRequestId }
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