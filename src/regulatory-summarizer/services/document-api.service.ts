// document-api.service.ts - Handles document search and retrieval

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SearchResult, DocumentSummary } from '../models/document.model';

@Injectable({
  providedIn: 'root'
})
export class DocumentApiService {
  private federalRegisterApiUrl = 'https://www.federalregister.gov/api/v1/documents';
  
  constructor(private http: HttpClient) { }

  /**
   * Search for documents using the Federal Register API
   * @param searchTerm The term to search for
   * @returns Observable with search results
   */
  searchDocuments(searchTerm: string): Observable<SearchResult[]> {
    const url = new URL(this.federalRegisterApiUrl);
    url.searchParams.append('conditions[term]', searchTerm);
    url.searchParams.append('per_page', '20');
    url.searchParams.append('order', 'newest');
    url.searchParams.append('fields[]', 'document_number');
    url.searchParams.append('fields[]', 'title');
    url.searchParams.append('fields[]', 'citation');
    url.searchParams.append('fields[]', 'regulation_id_numbers');
    url.searchParams.append('fields[]', 'abstract');
    url.searchParams.append('fields[]', 'type');
    url.searchParams.append('fields[]', 'agencies');
    url.searchParams.append('fields[]', 'publication_date');
    url.searchParams.append('fields[]', 'start_page');
    url.searchParams.append('fields[]', 'end_page');
    url.searchParams.append('fields[]', 'cfr_references');
    url.searchParams.append('fields[]', 'docket_ids');
    url.searchParams.append('fields[]', 'action');
    url.searchParams.append('fields[]', 'agency_names');
    url.searchParams.append('fields[]', 'effective_on');
    url.searchParams.append('fields[]', 'regulation_id_number_info');
  
    return from(
      fetch(url.toString()).then(response => {
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
            publicationDate: this.formatDateYYYYMMDD(item.publication_date),
            documentNumber: item.document_number,
            startPage: item.start_page,
            endPage: item.end_page,
            cfrReferences: this.formatCfrReferences(item.cfr_references),
            docketIds: item.docket_ids || [],
            regulationIdNumbers: item.regulation_id_numbers || [],
            effectiveDate: item.effective_on ? this.formatDateYYYYMMDD(item.effective_on) : undefined,
            citation: item.citation,
            rin: item.regulation_id_numbers?.[0]
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
   * Format CFR references into readable strings
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
   * Format dates to YYYY-MM-DD format
   */
  formatDateYYYYMMDD(dateString: string | null): string {
    if (!dateString) return '';
    
    try {
      // Check if the date is already in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        // Parse parts directly to avoid timezone issues
        return dateString;
      }
      
      // For dates with time component (like API responses), use UTC methods
      const date = new Date(dateString);
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || '';
    }
  }

  /**
   * Validate if a document URL exists
   */
  validateDocumentUrl(url: string): Observable<boolean> {
    return from(
      fetch(url, { method: 'HEAD' })
        .then(response => response.ok)
        .catch(() => false)
    );
  }

  /**
   * Extract agency names from agencies array
   */
  extractAgencyNames(agencies: any[] | null): string {
    if (!agencies || !Array.isArray(agencies) || agencies.length === 0) {
      return '';
    }
    
    return agencies.map(agency => agency.name || '').filter(name => name).join(', ');
  }
}