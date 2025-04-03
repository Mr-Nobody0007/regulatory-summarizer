import { Injectable } from '@angular/core';
import { SearchResult } from '../components/home/home.component';

@Injectable({
  providedIn: 'root'
})
export class DocumentDataService {
  private selectedDocument: SearchResult | null = null;
  
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
}