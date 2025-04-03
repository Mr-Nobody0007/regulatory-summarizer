import { Injectable } from '@angular/core';
import { Observable, from, of, delay } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SearchResult } from '../components/home/home.component';
import { DocumentSummary } from '../components/document-summary/document-summary.component';
import { DocumentDataService } from './document-data.service';

export interface QuestionResponse {
  id: string;
  answer: string;
}

@Injectable({
  providedIn: 'root'
})
export class RegulatoryService {
  private federalRegisterApiUrl = 'https://www.federalregister.gov/api/v1/documents';
  
  constructor(private documentDataService: DocumentDataService) { }

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
            publicationDate: new Date(item.publication_date).toLocaleDateString(),
            // Add additional metadata
            documentNumber: item.document_number,
            startPage: item.start_page,
            endPage: item.end_page,
            cfrReferences: this.formatCfrReferences(item.cfr_references),
            docketIds: item.docket_ids || [],
            regulationIdNumbers: item.regulation_id_numbers || [],
            effectiveDate: item.effective_on ? new Date(item.effective_on).toLocaleDateString() : null
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
   * Format CFR references into a readable format
   * @param cfrRefs The CFR references array from API
   * @returns Formatted CFR references
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
 * Get detailed information for a single document
 * @param documentId The document ID to fetch details for
 * @returns Observable with detailed document information
 */
getDocumentDetails(documentId: string): Observable<any> {
  // In a real implementation, you would call the Federal Register API
  // to get details for a specific document
  const url = `${this.federalRegisterApiUrl}/${documentId}`;
  
  // For now, this is a mock implementation
  return of({
    id: documentId,
    title: 'Required RuleMaking on Personal Financial Data Rights',
    documentType: 'Notice',
    agencyName: 'Small Business Administration',
    publicationDate: 'January 31, 2024',
    rin: 'RIN 3245-AH98',
    citation: '89 FR 6382'
  }).pipe(
    // Simulate network delay
    delay(500)
  );
  
  // Uncomment this for the real implementation
  
  return from(
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
  ).pipe(
    map(item => ({
      id: item.document_number,
      title: item.title,
      documentType: item.type || 'Document',
      agencyName: item.agencies?.[0]?.name || 'Unknown Agency',
      publicationDate: new Date(item.publication_date).toLocaleDateString(),
      rin: Array.isArray(item.regulation_id_numbers) && item.regulation_id_numbers.length > 0 
          ? item.regulation_id_numbers[0] 
          : 'N/A',
      citation: item.citation || 'N/A'
    })),
    catchError(error => {
      console.error('Error fetching document details', error);
      return of(null);
    })
  );
  
}

  /**
   * Get a document summary by ID or URL
   * @param documentId Document ID or URL to summarize
   * @param isUrl Whether the provided ID is a URL
   * @returns Observable of summarization result
   */
  // Update the summarizeDocument method in regulatory.service.ts
  summarizeDocument(documentId: string, isUrl: boolean = false): Observable<DocumentSummary> {
    // If it's a URL, use the mock implementation for now
    if (isUrl) {
      return of({
        id: documentId,
        title: 'Document from external URL',
        publicationDate: 'January 31, 2024',
        agency: 'Small Business Administration',
        documentType: 'Notice',
        summary: `...Mock summary content...`
      }).pipe(delay(1500));
    }

    // For document IDs, fetch the actual document from the API
    const url = `${this.federalRegisterApiUrl}/${documentId}`;

    return from(
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
    ).pipe(
      map(item => ({
        id: item.document_number,
        title: item.title,
        publicationDate: new Date(item.publication_date).toLocaleDateString(),
        agency: item.agencies?.[0]?.name || 'Unknown Agency',
        documentType: item.type || 'Document',
        summary: item.abstract || 'No summary available',
        // Additional metadata
        documentNumber: item.document_number,
        startPage: item.start_page,
        endPage: item.end_page,
        cfrReferences: this.formatCfrReferences(item.cfr_references),
        docketIds: item.docket_ids || [],
        regulationIdNumbers: item.regulation_id_numbers || [],
        effectiveDate: item.effective_on ? new Date(item.effective_on).toLocaleDateString() : undefined
      })),
      catchError(error => {
        console.error('Error fetching document', error);
        // Fall back to mock data on error
        return of({
          id: documentId,
          title: '(2024-12658) Required RuleMaking on Personal Financial Data Rights',
          publicationDate: 'January 31, 2024',
          agency: 'Small Business Administration',
          documentType: 'Notice',
          summary: `...Mock summary content...`
        }).pipe(delay(1500));
      })
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