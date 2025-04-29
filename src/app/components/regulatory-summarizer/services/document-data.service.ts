// src/app/components/regulatory-summarizer/services/document-data.service.ts
import { Injectable } from '@angular/core';
import { SearchResult } from '../models/document.model';
import { Prompt } from '../models/prompt.model';

@Injectable({
  providedIn: 'root'
})
export class DocumentDataService {
  private selectedDocument: SearchResult | null = null;
  private selectedPrompt: Prompt | null = null;
  
  constructor() {}
  
  /**
   * Store the selected document
   * @param document The document selected by the user
   */
  setSelectedDocument(document: SearchResult | null): void {
    this.selectedDocument = document;
  }
  
  /**
   * Get the currently selected document
   * @returns The selected document or null if none is selected
   */
  getSelectedDocument(): SearchResult | null {
    return this.selectedDocument;
  }
  
  /**
   * Store the selected prompt
   * @param prompt The prompt selected for the document
   */
  setSelectedPrompt(prompt: Prompt | null): void {
    this.selectedPrompt = prompt;
  }
  
  /**
   * Get the currently selected prompt
   * @returns The selected prompt or null if none is selected
   */
  getSelectedPrompt(): Prompt | null {
    return this.selectedPrompt;
  }
}