// document-view.component.ts - Parent component for document view

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Models
import { DocumentSummary } from '../models/document.model';
import { Message, MessageSender } from '../models/message.model';
import { Prompt } from '../models/prompt.model';

// Services
import { AiInteractionService } from '../services/ai-interaction.service';
import { PromptManagementService } from '../services/prompt-management.service';
import { DocumentHeaderComponent } from './components/document-header/document-header.component';
import { ChatPanelComponent } from './components/chat-panel/chat-panel.component';
import { SuggestedPromptsComponent } from './components/suggested-prompts/suggested-prompts.component';

// Import child components (will be created next)
// These will be uncommented as we create them

@Component({
  selector: 'app-document-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    DocumentHeaderComponent,
    ChatPanelComponent,
    SuggestedPromptsComponent
    // Child components will be imported here
  ],
  templateUrl: './document-view.component.html',
  styleUrls: ['./document-view.component.scss']
})
export class DocumentViewComponent implements OnInit, OnDestroy {
  documentSummary: DocumentSummary | null = null;
  isLoading = true;
  error: string | null = null;
  
  // Chat messages between user and AI
  messages: Message[] = [];
  
  // Prompts for the document type
  prompts: Prompt[] = [];
  selectedPrompt: Prompt | null = null;
  
  // Control variables
  showExtendedMetadata = false;
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private aiService: AiInteractionService,
    private promptService: PromptManagementService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const documentId = params.get('id');
      const isUrl = params.get('isUrl') === 'true';
      
      if (documentId) {
        // If isUrl is true, we need to decode the documentId which would be an encoded URL
        const inputValue = isUrl ? decodeURIComponent(documentId) : documentId;
        
        // Get the prompt from state or use default
        const state = window.history.state as { prompt?: string };
        const promptText = state?.prompt || 'Provide a concise summary of this document';
        
        this.loadDocumentSummary(inputValue, isUrl, promptText);
      } else {
        this.error = 'No document specified';
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Load document summary using AI
   */
  private loadDocumentSummary(input: string, isUrl: boolean, promptText: string): void {
    this.isLoading = true;
    this.error = null;
    
    // Set up initial document info
    this.documentSummary = {
      id: input,
      title: 'Loading...',
      summary: '',
      publicationDate: '',
      agency: '',
      documentType: '',
      isUrl: isUrl
    };
    
    // Add initial message for the summary request (loading state)
    this.addAiMessage('', true); // Empty content with loading state
    
    // Call the AI service to get the summary
    this.aiService.summarizeDocumentWithPrompt(input, promptText, isUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          this.documentSummary = summary;
          
          // Update the AI message with the actual summary
          this.updateLastAiMessage(summary.summary);
          
          // Load prompts for this document type
          this.loadPrompts(summary.documentType);
          
          this.isLoading = false;
        },
        error: (error) => {
          this.error = `Failed to load document summary: ${error.message || 'Unknown error'}`;
          this.updateLastAiMessage(`Error: ${this.error}`);
          this.isLoading = false;
        }
      });
  }
  
  /**
   * Load prompts for the document type
   */
  // In document-view.component.ts
private loadPrompts(documentType: string): void {
  this.promptService.getPromptsByDocumentType(documentType)
    .pipe(takeUntil(this.destroy$))
    .subscribe(prompts => {
      this.prompts = prompts;
      console.log('Loaded prompts:', prompts); // Add this log to debug
    });
}
  
  /**
   * Add a user message to the chat
   */
  addUserMessage(content: string): void {
    if (!content.trim()) return;
    
    const message: Message = {
      id: `user-${Date.now()}`,
      content: content,
      timestamp: new Date(),
      sender: MessageSender.USER
    };
    
    this.messages.push(message);
    
    // Now ask the AI to respond
    this.askAiQuestion(content);
  }
  
  /**
   * Add an AI message to the chat
   */
  private addAiMessage(content: string, isLoading: boolean = false): void {
    const message: Message = {
      id: `ai-${Date.now()}`,
      content: content,
      timestamp: new Date(),
      sender: MessageSender.AI,
      isLoading: isLoading
    };
    
    this.messages.push(message);
  }
  
  /**
   * Update the last AI message (when loading completes)
   */
  private updateLastAiMessage(content: string, requestId?: number): void {
    const lastAiMessage = [...this.messages]
      .reverse()
      .find(m => m.sender === MessageSender.AI);
      
    if (lastAiMessage) {
      lastAiMessage.content = content;
      lastAiMessage.isLoading = false;
      if (requestId) {
        lastAiMessage.requestId = requestId;
      }
    }
  }
  
  /**
   * Ask a question to the AI
   */
  private askAiQuestion(question: string): void {
    if (!this.documentSummary) {
      console.error('No document summary available');
      return;
    }
    
    // Add an AI message in loading state
    this.addAiMessage('', true);
    
    // Get the document ID and isUrl flag
    const input = this.documentSummary.id;
    const isUrl = this.documentSummary.isUrl || false;
    
    // Call the AI service to get the answer
    this.aiService.askDocumentQuestion(input, question, isUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Update the AI message with the actual answer
          this.updateLastAiMessage(response.answer, response.requestId);
        },
        error: (error) => {
          // Update the AI message with the error
          this.updateLastAiMessage(`Sorry, there was an error processing your question: ${error.message || 'Please try again.'}`);
        }
      });
  }
  
  /**
   * Use a suggested prompt
   */
  usePrompt(prompt: Prompt): void {
    this.addUserMessage(prompt.prompt);
  }
  
  /**
   * Toggle extended metadata visibility
   */
  toggleExtendedMetadata(): void {
    this.showExtendedMetadata = !this.showExtendedMetadata;
  }
  
  /**
   * Open PDF document
   */
  openPdfDocument(documentId: string): void {
    if (!this.documentSummary) {
      console.error('Missing document information required for PDF URL');
      return;
    }
    
    // For URL-based documents, if they have a PDF URL, use it directly
    if (this.documentSummary.isUrl) {
      if (this.documentSummary.pdfUrl) {
        window.open(this.documentSummary.pdfUrl, '_blank');
      } else {
        // For URL documents without PDF link, redirect to the original URL
        window.open(this.documentSummary.id, '_blank');
      }
      return;
    }
    
    // For Federal Register documents, use the PDF URL if available
    if (this.documentSummary.pdfUrl) {
      window.open(this.documentSummary.pdfUrl, '_blank');
      return;
    }
    
    // Fall back to constructing URL based on document ID and publication date
    if (!this.documentSummary.publicationDate) {
      console.error('Missing publication date required for fallback PDF URL');
      return;
    }
    
    const pdfUrl = `https://www.govinfo.gov/content/pkg/FR-${this.documentSummary.publicationDate}/pdf/${documentId}.pdf`;
    window.open(pdfUrl, '_blank');
  }
  
  /**
   * Return to search page
   */
  returnToSearch(): void {
    this.router.navigate(['/']);
  }
}