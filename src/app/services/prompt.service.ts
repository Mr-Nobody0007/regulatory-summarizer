// src/app/services/prompt.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map } from 'rxjs';

export interface Prompt {
  purpose: string;
  isDefault: boolean;
  label: string;
  prompt: string;
  documentType: string;
}

@Injectable({
  providedIn: 'root'
})
export class PromptService {
  // private promptsUrl = 'assets/prompts.json';
  // private cachedPrompts: Prompt[] = [];

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
    "purpose": "Summary",
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
    "documentType": "Notice"
  }];

  constructor(private http: HttpClient) {}

  /**
   * Load prompts from JSON file
   */
  loadPrompts(): Observable<Prompt[]> {
    // Simply return the hardcoded prompts
    return of(this.prompts);
  }

  
  /**
   * Get prompts filtered by document type
   * @param documentType The document type to filter by
   */
  getPromptsByDocumentType(documentType: string): Observable<Prompt[]> {
    console.log('Filtering prompts for document type:', documentType);
    
    if (!documentType) {
      return of([]);
    }
    
    // Normalize document type to handle case differences
    const normalizedType = documentType.trim().toLowerCase();
    
    // Filter prompts that match the document type (case-insensitive) or are for ANY type
    const filteredPrompts = this.prompts.filter(p => {
      const promptType = p.documentType?.trim().toLowerCase() || '';
      return promptType === normalizedType || promptType === 'any';
    });
    
    console.log('Filtered prompts:', filteredPrompts);
    
    return of(filteredPrompts);
  }


  /**
   * Get the default summary prompt for a document type
   * @param documentType The document type
   */
  getDefaultSummaryPrompt(documentType: string): Observable<Prompt | null> {
    if (!documentType) {
      return of(null);
    }
    
    return this.getPromptsByDocumentType(documentType).pipe(
      map((prompts: Prompt[]) => {
        // First try to find a Summary prompt for this specific document type (case-insensitive)
        let summaryPrompt = prompts.find(p => 
          p.purpose === 'Summary' && 
          p.documentType.toLowerCase() === documentType.toLowerCase()
        );
        
        // If not found, look for a Summary prompt for ANY document type
        if (!summaryPrompt) {
          summaryPrompt = prompts.find(p => 
            p.purpose === 'Summary' && 
            p.documentType.toLowerCase() === 'any'
          );
        }
        
        // If still not found, just get any prompt marked as default
        if (!summaryPrompt) {
          summaryPrompt = prompts.find(p => p.isDefault);
        }
        
        console.log('Selected prompt for document type:', documentType, summaryPrompt);
        return summaryPrompt || null;
      })
    );
  }
}