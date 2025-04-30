// prompt-management.service.ts - Manages prompts and suggestions

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Prompt } from '../models/prompt.model';

@Injectable({
  providedIn: 'root'
})
export class PromptManagementService {
  private apiBaseUrl = 'http://ah.corp:8007';
  private defaultPromptsEndpoint = '/api/v1/prompts/doctype-options';
  
  // Default prompts hardcoded for initial functionality
  private prompts: Prompt[] = [
    {
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
    }
  ];

  constructor(private http: HttpClient) {}

  /**
   * Get all prompts
   */
  getPrompts(): Observable<Prompt[]> {
    // First try to fetch from the API
    return this.fetchDefaultPrompts().pipe(
      map(apiPrompts => {
        // If we get valid prompts from the API, use those
        if (apiPrompts && apiPrompts.length > 0) {
          return apiPrompts;
        }
        // Otherwise fall back to our hardcoded prompts
        return this.prompts;
      })
    );
  }

  /**
   * Fetch default prompts from API
   */
  fetchDefaultPrompts(): Observable<Prompt[]> {
    const url = `${this.apiBaseUrl}${this.defaultPromptsEndpoint}`;
    
    return this.http.get<Prompt[]>(url);
  }

  /**
   * Get prompts filtered by document type
   */
  getPromptsByDocumentType(documentType: string): Observable<Prompt[]> {
    if (!documentType) {
      return of([]);
    }
    
    // Get all prompts first
    return this.getPrompts().pipe(
      map(prompts => {
        // Normalize document type to handle case differences
        const normalizedType = documentType.trim().toLowerCase();
        
        // Filter prompts that match the document type (case-insensitive) or are for ANY type
        return prompts.filter(p => {
          const promptType = p.documentType?.trim().toLowerCase() || '';
          return promptType === normalizedType || promptType === 'any';
        });
      })
    );
  }

  /**
   * Get the default summary prompt for a document type
   */
  getDefaultSummaryPrompt(documentType: string): Observable<Prompt | null> {
    if (!documentType) {
      return of(null);
    }
    
    return this.getPromptsByDocumentType(documentType).pipe(
      map((prompts: Prompt[]) => {
        // First try to find a Summary prompt for this specific document type
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
        
        return summaryPrompt || null;
      })
    );
  }
}