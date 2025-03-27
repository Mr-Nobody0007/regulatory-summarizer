import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SearchResult } from '../components/home/home.component';

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
   * Placeholder for future summarization API call
   * @param documentId Document ID or URL to summarize
   * @param isUrl Whether the provided ID is a URL
   * @returns Observable of summarization result
   */
  summarizeDocument(documentId: string, isUrl: boolean = false): Observable<any> {
    // This is a placeholder for the future summarization API
    return of({
      title: 'Sample Document',
      summary: 'This is a placeholder for the document summary that will be implemented in the next phase.'
    });
    
    // Example of how you would implement this with fetch when the API is ready:
    /*
    const url = isUrl ? documentId : `${this.federalRegisterApiUrl}/${documentId}/summarize`;
    
    return from(
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
    ).pipe(
      catchError(error => {
        console.error('Error summarizing document', error);
        return of({
          title: 'Error',
          summary: 'Failed to summarize document. Please try again later.'
        });
      })
    );
    */
  }
}