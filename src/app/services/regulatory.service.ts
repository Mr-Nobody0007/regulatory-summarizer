import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SearchResult } from '../components/home/home.component';

@Injectable({
  providedIn: 'root'
})
export class RegulatoryService {
  private federalRegisterApiUrl = 'https://www.federalregister.gov/api/v1/documents';
  
  constructor(private http: HttpClient) { }

  /**
   * Search documents from the Federal Register API
   * @param searchTerm The term to search for
   * @returns Observable of search results
   */
  searchDocuments(searchTerm: string): Observable<SearchResult[]> {
    const params = new HttpParams()
      .set('conditions[term]', searchTerm)
      .set('per_page', '10')
      .set('order', 'relevance');
    
    return this.http.get<any>(this.federalRegisterApiUrl, { params }).pipe(
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
   * Validate if a URL is pointing to a valid regulatory document
   * @param url The URL to validate
   * @returns Observable boolean indicating if the URL is valid
   */
  validateDocumentUrl(url: string): Observable<boolean> {
    // This is a placeholder for actual validation logic
    // In a real implementation, you'd make a HEAD request or similar to validate
    return of(true);
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
  }
}