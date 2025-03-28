import { Injectable } from '@angular/core';
import { Observable, from, of, delay } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SearchResult } from '../components/home/home.component';
import { DocumentSummary } from '../components/document-summary/document-summary.component';

export interface QuestionResponse {
  id: string;
  answer: string;
}

@Injectable({
  providedIn: 'root'
})
export class RegulatoryService {
  private federalRegisterApiUrl = 'https://www.federalregister.gov/api/v1/documents';
  
  constructor() { }

  /**
   * Search documents from the Federal Register API using fetch
   * @param searchTerm The term to search for
   * @returns Observable of search results
   */
  searchDocuments(searchTerm: string): Observable<SearchResult[]> {
    // Build URL with query parameters
    const url = new URL(this.federalRegisterApiUrl);
    url.searchParams.append('conditions[term]', searchTerm);
    url.searchParams.append('per_page', '10');
    url.searchParams.append('order', 'relevance');
    
    // Use fetch API and convert Promise to Observable
    return from(
      fetch(url.toString())
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
    ).pipe(
      map(response => {
        if (response && response.results) {
          return response.results.map((item: any) => ({
            id: item.document_number,
            title: item.title,
            documentType: item.type || 'Document',
            agencyName: item.agencies?.[0]?.name || 'Unknown Agency',
            publicationDate: new Date(item.publication_date).toLocaleDateString()
          }));
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching documents', error);
        return of([]);
      })
    );
  }

  /**
   * Validate if a URL is pointing to a valid regulatory document using fetch
   * @param url The URL to validate
   * @returns Observable boolean indicating if the URL is valid
   */
  validateDocumentUrl(url: string): Observable<boolean> {
    return from(
      fetch(url, { method: 'HEAD' })
        .then(response => response.ok)
        .catch(() => false)
    );
  }

  /**
   * Get a document summary by ID or URL
   * @param documentId Document ID or URL to summarize
   * @param isUrl Whether the provided ID is a URL
   * @returns Observable of summarization result
   */
  summarizeDocument(documentId: string, isUrl: boolean = false): Observable<DocumentSummary> {
    // NOTE: This is a mockup implementation
    // In a real application, you would call your backend API
    
    return of({
      id: documentId,
      title: isUrl 
        ? 'Document from external URL' 
        : '(2024-12658) Required RuleMaking on Personal Financial Data Rights; Industry Standard-Setting',
      publicationDate: 'January 31, 2024',
      agency: 'Small Business Administration',
      documentType: 'Notice',
      summary: `
        Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has 
        been the industry's standard dummy text ever since the 1500s, when an unknown printer took a 
        galley of type and scrambled it to make a type specimen book. It has survived not only five 
        centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was 
        popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, 
        and more recently with desktop publishing software like Aldus PageMaker including versions of 
        Lorem Ipsum.

        Why do we use it?
        It is a long established fact that a reader will be distracted by the readable content of a page 
        when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal 
        distribution of letters, as opposed to using 'Content here, content here', making it look like 
        readable English. Many desktop publishing packages and web page editors now use Lorem 
        Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still 
        in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes 
        on purpose (injected humour and the like).
      `
    }).pipe(
      // Simulate network delay
      delay(1500)
    );
  }

  /**
   * Ask a question about a document
   * @param documentId The document ID
   * @param question The question to ask
   * @returns Observable of question response
   */
  askDocumentQuestion(documentId: string, question: string): Observable<QuestionResponse> {
    // NOTE: This is a mockup implementation
    // In a real application, you would call your backend API
    
    // Generate some sample responses based on the question
    let answer = '';
    
    if (question.toLowerCase().includes('update')) {
      answer = 'This document was last updated on January 31, 2024.';
    } else if (question.toLowerCase().includes('summarize') || question.toLowerCase().includes('summary')) {
      answer = 'This document outlines the requirements for financial data rights and industry standards for personal financial information.';
    } else if (question.toLowerCase().includes('new york')) {
      answer = 'Yes, this regulation applies to financial institutions operating in New York state, as it is a federal regulation.';
    } else if (question.toLowerCase().includes('requirement') || question.toLowerCase().includes('obligation')) {
      answer = `The key requirements outlined in this regulation include:
      1. Financial institutions must provide clear disclosure of data collection practices
      2. Consumers must have the right to access their personal financial data
      3. Data sharing between institutions requires explicit consumer consent
      4. Financial institutions must implement reasonable security measures
      5. Regular audits and compliance reporting are required`;
    } else {
      answer = `Based on my analysis of the document, I can provide the following information related to your question:
      
      The document outlines standards for personal financial data rights, which establish a framework for how financial institutions must handle consumer information. This includes requirements for data security, consumer access to their own information, and limitations on how this data can be shared with third parties.
      
      The specific regulatory obligations vary based on the size and type of financial institution, with tiered requirements to balance consumer protection with practical implementation concerns for smaller entities.`;
    }
    
    return of({
      id: `q-${Date.now()}`,
      answer: answer
    }).pipe(
      // Simulate network delay
      delay(2000)
    );
  }
}