import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { SuggestedPromptsComponent } from '../suggested-prompts/suggested-prompts.component';
// Import services
import { RegulatoryService } from '../../services/regulatory.service';
import { PromptService, Prompt } from '../../services/prompt.service';
import { DocumentDataService } from '../../services/document-data.service';
import { FeedbackDialogComponent } from '../../components/feedback-dialog/feedback-dialog.component';
// Import the TextFormattingService
import { TextFormattingService } from '../../services/text-formatting.service';

// Import shared components
import { ChatMessageComponent } from '../chat-message/chat-message.component';

// Interface for chat messages
export interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
  requestId?: number;
}

// Interface for document info
export interface DocumentInfo {
  id: string;
  title: string;
  agency: string;
  documentType: string;
  publicationDate: string;
  summary: string;
  
  // Basic metadata
  documentNumber?: string;
  effectiveDate?: string;
  pdfUrl?: string;
  isUrl?: boolean;
  
  // Extended metadata
  cfrReferences?: string[];
  docketIds?: string[];
  regulationIdNumbers?: string[];
  citation?: string;
  commentsCloseOn?: string;
  
  // Presidential document metadata
  presidentialDocument?: boolean;
  executiveOrder?: string;
  signingDate?: string;
  
  // Page information
  startPage?: number;
  endPage?: number;
  
  // Raw data if needed for additional processing
  rawData?: any;
}

@Component({
  selector: 'app-chat-interface',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    ChatMessageComponent,
    SuggestedPromptsComponent,
    FeedbackDialogComponent
  ],
  templateUrl: './chat-interface.component.html',
  styleUrls: ['./chat-interface.component.scss']
})
export class ChatInterfaceComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;
  
  // Document info
  documentInfo: DocumentInfo | null = null;
  isLoading = true;
  error: string | null = null;
  showExtendedMetadata = false;
  
  // Chat messages
  chatMessages: ChatMessage[] = [];
  
  // Input control
  messageControl = new FormControl('', [Validators.required]);
  charLimit = 1000; // Maximum character limit
  isInputDisabled = false;
  
  // Suggested prompts
  suggestedPrompts: Prompt[] = [];
  visiblePrompts: Prompt[] = [];
  showAllPrompts = false;
  shouldShowMoreButton = false;
  textareaHeight: number = 72;
  bottomSectionHeight = 300;
promptsAreaPercentage = 50;
  
  // Control flags
  private shouldScrollToBottom = true;
  private destroy$ = new Subject<void>();
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private regulatoryService: RegulatoryService,
    private promptService: PromptService,
    private documentDataService: DocumentDataService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog
  ) {}
  
  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const documentId = params.get('id');
      const isUrl = params.get('isUrl') === 'true';
      
      // Get prompt from router state if available
      const state = window.history.state as { prompt?: string };
      const initialPrompt = state?.prompt || 'Provide a concise summary of this document';
      
      if (documentId) {
        // If isUrl is true, decode the documentId which would be an encoded URL
        const inputValue = isUrl ? decodeURIComponent(documentId) : documentId;
        this.loadDocument(inputValue, isUrl, initialPrompt);
      } else {
        this.error = 'No document specified';
        this.isLoading = false;
      }
    });
  }


/**
 * Initialize horizontal resize operation
 * This handles the vertical resizing of the bottom section
 */
initHorizontalResize(event: MouseEvent): void {
  // Prevent text selection during drag
  event.preventDefault();
  
  // Store initial values
  const startY = event.clientY;
  const startHeight = this.bottomSectionHeight;
  
  // Mouse move handler for resizing
  const onMouseMove = (moveEvent: MouseEvent) => {
    // Calculate how far the mouse has moved
    const deltaY = moveEvent.clientY - startY;
    
    // Update height (move up decreases the height)
    this.bottomSectionHeight = Math.max(150, Math.min(600, startHeight - deltaY));
    
    // Apply the new height
    document.querySelector('.bottom-section')?.setAttribute(
      'style', 
      `height: ${this.bottomSectionHeight}px`
    );
    
    // Force scroll to bottom if messages modified
    this.scrollToBottom();
  };
  
  // Mouse up handler to end resize operation
  const onMouseUp = () => {
    // Remove event listeners when done dragging
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
  
  // Add event listeners for dragging
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

/**
 * Initialize vertical resize operation
 * This handles the horizontal resizing between prompts and chat input areas
 */
initVerticalResize(event: MouseEvent): void {
  // Prevent text selection during drag
  event.preventDefault();
  
  // Store initial values
  const startX = event.clientX;
  const startPercentage = this.promptsAreaPercentage;
  const containerWidth = document.querySelector('.bottom-section')?.clientWidth || window.innerWidth;
  
  // Mouse move handler for resizing
  const onMouseMove = (moveEvent: MouseEvent) => {
    // Calculate how far the mouse has moved as a percentage of container width
    const deltaX = moveEvent.clientX - startX;
    const deltaPercentage = (deltaX / containerWidth) * 100;
    
    // Update percentage (constrained between 20% and 80%)
    this.promptsAreaPercentage = Math.max(20, Math.min(80, startPercentage + deltaPercentage));
    
    // Apply the new widths
    document.querySelector('.suggested-prompts-area')?.setAttribute(
      'style', 
      `width: ${this.promptsAreaPercentage}%`
    );
    
    document.querySelector('.chat-input-area')?.setAttribute(
      'style',
      `width: ${100 - this.promptsAreaPercentage}%`
    );
  };
  
  // Mouse up handler to end resize operation
  const onMouseUp = () => {
    // Remove event listeners when done dragging
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
  
  // Add event listeners for dragging
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

  /**
 * Load the document and initialize the chat with a summary
 */
  private loadDocument(input: string, isUrl: boolean, initialPrompt: string): void {
    this.isLoading = true;
    this.isInputDisabled = true;
    this.error = null;
    
    // Initialize document info with loading state
    this.documentInfo = {
      id: input,
      title: 'Loading document...',
      agency: '',
      documentType: '',
      publicationDate: '',
      summary: '',
      isUrl: isUrl
    };
    
    // Add the initial system message
    this.addSystemMessage('Loading document summary...');
    
    // Call the service to get the document summary
    this.regulatoryService.summarizeDocumentWithPrompt(input, initialPrompt, isUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (docSummary) => {
          console.log('Document Summary Response:', docSummary);
          console.log('Initial requestId:', docSummary.regulationRequestId);
          
          // Process documentation metadata from the DTO
          this.processDocumentMetadata(docSummary);
          
          // Replace the loading message with the summary and include the requestId
          this.replaceLoadingMessage(docSummary.summary, false, docSummary.regulationRequestId);
          
          // Load suggested prompts based on document type
          this.loadSuggestedPrompts(docSummary.documentType);
          
          this.isLoading = false;
          this.isInputDisabled = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.error = `Failed to load document: ${error.message || 'Unknown error'}`;
          this.replaceLoadingMessage(`Error: ${this.error}`);
          this.isLoading = false;
          this.isInputDisabled = false;
          this.cdr.detectChanges();
        }
      });
  }

/**
 * Process document metadata from the DTO
 */
private processDocumentMetadata(docSummary: any): void {
  // First, create our basic document info object
  this.documentInfo = {
    id: docSummary.id,
    title: docSummary.title,
    agency: docSummary.agency,
    documentType: docSummary.documentType,
    publicationDate: docSummary.publicationDate,
    summary: docSummary.summary,
    documentNumber: docSummary.documentNumber,
    isUrl: this.documentInfo?.isUrl || false
  };
  
  // If we have a documentDto, extract additional metadata
  if (docSummary.documentDto) {
    const dto = docSummary.documentDto;
    
    // Override basic data with values from the DTO if they exist
    this.documentInfo.title = dto.title || this.documentInfo.title;
    this.documentInfo.publicationDate = this.formatDate(dto.publication_date) || this.documentInfo.publicationDate;
    this.documentInfo.documentNumber = dto.document_number || this.documentInfo.documentNumber;
    this.documentInfo.pdfUrl = dto.pdf_url || docSummary.pdfUrl;
    
    // Extract agency names if available
    if (dto.agencies && Array.isArray(dto.agencies) && dto.agencies.length > 0) {
      this.documentInfo.agency = dto.agencies.map((agency: any) => agency.name || '').filter((name: string) => name).join(', ');
    }
    
    // Add additional metadata fields
    this.documentInfo.effectiveDate = this.formatDate(dto.effective_on);
    this.documentInfo.docketIds = dto.docket_ids || [];
    this.documentInfo.regulationIdNumbers = dto.regulation_id_numbers || [];
    this.documentInfo.cfrReferences = this.formatCfrReferences(dto.cfr_references);
    this.documentInfo.citation = dto.citation;
    
    // Add any other metadata fields your UI needs
    this.documentInfo.commentsCloseOn = this.formatDate(dto.comments_close_on);
    this.documentInfo.signingDate = this.formatDate(dto.signing_date);
    this.documentInfo.presidentialDocument = dto.presidential_document;
    this.documentInfo.executiveOrder = dto.executive_order_number;
    
    // Page information
    this.documentInfo.startPage = dto.start_page;
    this.documentInfo.endPage = dto.end_page;
    
    console.log('Processed document metadata:', this.documentInfo);
  }
}

/**
 * Format CFR references to readable format
 */
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

/**
 * Format date string to YYYY-MM-DD
 */
private formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  } catch (error) {
    console.error('Error parsing date:', dateStr, error);
    return dateStr;
  }
}
  
  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Toggle extended metadata visibility
   */
  toggleExtendedMetadata(): void {
    this.showExtendedMetadata = !this.showExtendedMetadata;
  }
  
  /**
   * Load the document and initialize the chat with a summary
   */
 
  
  /**
   * Send a message
   */
  sendMessage(): void {
    const message = this.messageControl.value?.trim();
    if (!message || !this.documentInfo || this.isInputDisabled) return;
    
    // Add user message to chat
    this.addUserMessage(message);
    
    // Add a loading message from the system
    const loadingMessageId = this.addSystemMessage('', true);
    
    // Disable input while processing
    this.isInputDisabled = true;
    
    // Get document input
    const documentId = this.documentInfo.id;
    const isUrl = this.documentInfo.isUrl || false;
    
    // Call service to get answer
    this.regulatoryService.askDocumentQuestion(documentId, message, isUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Replace the loading message with the actual response
          this.replaceMessage(loadingMessageId, response.answer, false, response.requestId);
          this.isInputDisabled = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          // Replace with error message
          this.replaceMessage(
            loadingMessageId, 
            `Error: Failed to get response. ${error.message || 'Please try again.'}`,
            false
          );
          this.isInputDisabled = false;
          this.cdr.detectChanges();
        }
      });
    
    // Clear the input field
    this.messageControl.reset();
  }

/**
 * Initialize textarea resize operation
 * This handles the vertical resizing of the text input area
 */
initTextareaResize(event: MouseEvent): void {
  // Prevent default behavior
  event.preventDefault();
  
  // Add active class to the handle
  const handle = event.currentTarget as HTMLElement;
  handle.classList.add('active');
  
  // Find the textarea element
  const textarea = document.querySelector('.message-field textarea') as HTMLTextAreaElement;
  if (!textarea) return;
  
  // Get the current height of the textarea
  const startHeight = textarea.offsetHeight;
  const startY = event.clientY;
  
  // Mouse move handler for resizing
  const onMouseMove = (moveEvent: MouseEvent) => {
    // Calculate how far the mouse has moved
    const deltaY = moveEvent.clientY - startY;
    
    // Calculate new height (move down increases the height)
    const newHeight = Math.max(72, Math.min(200, startHeight + deltaY));
    
    // Apply the new height directly to the textarea
    textarea.style.height = `${newHeight}px`;
    
    // Prevent text selection during resize
    moveEvent.preventDefault();
  };
  
  // Mouse up handler to end resize operation
  const onMouseUp = () => {
    // Remove active class from handle
    handle.classList.remove('active');
    
    // Remove event listeners when done dragging
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
  
  // Add event listeners for dragging
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}
  
  /**
   * Handle key events in the textarea
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
  
  /**
   * Auto-resize textarea
   */
  
  
  /**
   * Select a prompt from the suggested prompts
   */
  selectPrompt(prompt: Prompt): void {
    this.messageControl.setValue(prompt.prompt);
    
    // Focus and resize the input
    setTimeout(() => {
      if (this.messageInput?.nativeElement) {
        this.messageInput.nativeElement.focus();
        //this.autoResize(this.messageInput.nativeElement);
      }
    }, 0);
  }
  
  /**
   * Toggle showing all prompts
   */
  toggleShowAllPrompts(): void {
    this.showAllPrompts = !this.showAllPrompts;
    this.updateVisiblePrompts();
  }
  
  /**
   * Update which prompts are visible based on showAllPrompts flag
   */
  private updateVisiblePrompts(): void {
    if (this.showAllPrompts) {
      this.visiblePrompts = this.suggestedPrompts;
    } else {
      // Show only a limited number of prompts
      this.visiblePrompts = this.suggestedPrompts.slice(0, 4);
    }
    
    this.shouldShowMoreButton = this.suggestedPrompts.length > 4;
  }
  
  /**
   * Add a message from the user to the chat
   */
  private addUserMessage(content: string): void {
    this.chatMessages.push({
      id: `user-${Date.now()}`,
      content,
      isUser: true,
      timestamp: new Date()
    });
    
    this.shouldScrollToBottom = true;
    this.cdr.detectChanges();
  }
  
  /**
   * Add a message from the system (AI) to the chat
   * Returns the ID of the added message for future reference
   */
  private addSystemMessage(content: string, isLoading: boolean = false): string {
    const messageId = `system-${Date.now()}`;
    
    this.chatMessages.push({
      id: messageId,
      content,
      isUser: false,
      timestamp: new Date(),
      isLoading
    });
    
    this.shouldScrollToBottom = true;
    this.cdr.detectChanges();
    
    return messageId;
  }
  
  /**
   * Replace a message in the chat (used for updating loading messages)
   */
  private replaceLoadingMessage(content: string, isLoading: boolean = false, requestId?: number): void {
    if (this.chatMessages.length > 0) {
      const firstMessageId = this.chatMessages[0].id;
      
      // If no requestId was provided from the API, generate a fallback
      if (!requestId) {
        // Generate a random number between 10000 and 99999 to use as fallback
        requestId = Math.floor(Math.random() * 90000) + 10000;
        console.log('No requestId from API, using fallback:', requestId);
      }
      
      this.replaceMessage(firstMessageId, content, isLoading, requestId);
    }
  }
  
  /**
   * Replace a message in the chat (used for updating loading messages)
   */
  private replaceMessage(messageId: string, content: string, isLoading: boolean = false, requestId?: number): void {
    console.log('Replacing message with ID:', messageId, 'with requestId:', requestId);
    
    const messageIndex = this.chatMessages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex !== -1) {
      this.chatMessages[messageIndex] = {
        ...this.chatMessages[messageIndex],
        content,
        isLoading,
        requestId
      };
      
      this.shouldScrollToBottom = true;
      this.cdr.detectChanges();
    }
  }
  
  /**
   * Load suggested prompts based on document type
   */
  private loadSuggestedPrompts(documentType: string): void {
    this.promptService.getPromptsByDocumentType(documentType)
      .subscribe(prompts => {
        this.suggestedPrompts = prompts;
        this.updateVisiblePrompts();
        this.cdr.detectChanges();
      });
  }
  
  /**
   * Calculate remaining characters for the chat input
   */
  getRemainingCharacters(): number {
    const currentLength = this.messageControl.value?.length || 0;
    return this.charLimit - currentLength;
  }
  
  /**
   * Scroll the chat container to the bottom
   */
  private scrollToBottom(): void {
    try {
      if (this.chatContainer && this.chatContainer.nativeElement) {
        const element = this.chatContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom', err);
    }
  }
  
  /**
   * Open the document PDF in a new tab
   */
  openPdfDocument(): void {
    if (!this.documentInfo) return;
    
    // For URL-based documents, if they have a PDF URL, use it directly
    if (this.documentInfo.isUrl) {
      if (this.documentInfo.pdfUrl) {
        window.open(this.documentInfo.pdfUrl, '_blank');
      } else {
        // For URL documents without PDF link, redirect to the original URL
        window.open(this.documentInfo.id, '_blank');
      }
      return;
    }
    
    // For Federal Register documents, use the PDF URL if available
    if (this.documentInfo.pdfUrl) {
      window.open(this.documentInfo.pdfUrl, '_blank');
      return;
    }
    
    // Fall back to constructing URL based on document ID and publication date
    if (!this.documentInfo.publicationDate) {
      console.error('Missing publication date required for fallback PDF URL');
      return;
    }
    
    const pdfUrl = `https://www.govinfo.gov/content/pkg/FR-${this.documentInfo.publicationDate}/pdf/${this.documentInfo.id}.pdf`;
    window.open(pdfUrl, '_blank');
  }
  
  /**
   * Navigate back to the search page
   */
  backToSearch(): void {
    this.router.navigate(['/']);
  }
}