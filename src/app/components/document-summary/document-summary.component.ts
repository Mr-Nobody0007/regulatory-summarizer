import { Component, OnInit } from '@angular/core';
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

export interface DocumentSummary {
  id: string;
  title: string;
  publicationDate: string;
  agency: string;
  documentType: string;
  summary: string;
}

export interface PromptResponse {
  id: string;
  question: string;
  answer: string;
  timestamp: Date;
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
  error: string | null = null;
  
  // For handling the Q&A
  questionControl = new FormControl('', [Validators.required]);
  promptResponses: PromptResponse[] = [];
  
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
    private fb: FormBuilder
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
      }
    });
  }

  private loadDocumentSummary(documentId: string, isUrl: boolean): void {
    this.isLoading = true;
    this.error = null;
    
    this.regulatoryService.summarizeDocument(documentId, isUrl).subscribe({
      next: (summary) => {
        this.documentSummary = summary;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading document summary', err);
        this.error = 'Failed to load document summary. Please try again.';
        this.isLoading = false;
      }
    });
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
      timestamp: new Date()
    };
    
    // Add to the list immediately to show the question
    this.promptResponses = [...this.promptResponses, newPrompt];
    
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
              answer: response.answer
            };
          }
          return pr;
        });
      },
      error: (err) => {
        console.error('Error asking question', err);
        // Update the prompt response with an error
        this.promptResponses = this.promptResponses.map(pr => {
          if (pr.id === newPrompt.id) {
            return {
              ...pr,
              answer: 'Sorry, there was an error processing your question. Please try again.'
            };
          }
          return pr;
        });
      }
    });
  }

  returnToSearch(): void {
    this.router.navigate(['/']);
  }
}