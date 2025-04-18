import { Injectable } from '@angular/core';
import { Observable, from, of, delay, throwError, Subject } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { SearchResult } from '../components/home/home.component';
import { DocumentSummary } from '../components/document-summary/document-summary.component';
import { DocumentDataService } from './document-data.service';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../components/config';
import { FeedbackSubmission } from '../components/feedback-dialog/feedback-dialog.component';
export interface QuestionResponse {
  id: string;
  answer: string;
}

export interface SummaryRequestSingle {
  documentNumber: string;
  prompt: string;
  temperature: number;
  topP: number;
  chunkMethod: number;
  chunkMethodVal: number;
  signalRConnId: string;
  seed:number;
  userName: string;
}

export interface ApiResponse {
  sucess: boolean;
  message?:string;
  data?: any;
} 

export interface FederalRegistryDocResponse {
  documentNumber: string;
  textUrl: string;
  [key: string]: any;
}

export interface DocumentTextPathResponse {
  filePath: string;
  [key: string]: any;
}

export interface SummaryRequest {
  textFilePath: string;
  prompt: string;
  temperature: number;
  topP: number;
  seed: number;
}

@Injectable({
  providedIn: 'root'
})
export class RegulatoryService {
  private federalRegisterApiUrl = 'https://www.federalregister.gov/api/v1/documents';
  private apiBaseUrl= "http://ah.corp:8007"
  constructor(private documentDataService: DocumentDataService, private http: HttpClient) { }

  submitFeedback(feedback: FeedbackSubmission): Observable<boolean>{
    return of(true).pipe(delay(500))
  }

  getSingleShotSummary(documentNumber: string, prompt: string): Observable<any> {
    const url = new URL('http://ah.corp:8007/api/v1/open-ai/orchestrate-send-prompt')

    const payload: SummaryRequestSingle = {
      documentNumber: documentNumber,
      prompt: prompt,
      temperature: 0,
      topP:0,
      seed: 100,
      signalRConnId: '',
      chunkMethod:0,
      chunkMethodVal:0,
      userName:'Vatsal'

    }

    return from(
      fetch(`${url}`,{
        method:'POST',
        credentials: 'include',
        headers: {
          'Content-Type':'application/json'
        },
        body: JSON.stringify(payload)
      }).then(response=>{
        if(!response.ok){
        throw new Error('Http error')
      }
      return response.json();
    })
    ).pipe(map(response=>{
      return response;

    }),
    catchError(error=>{
      console.error("Error gene summ",error);
      return throwError(()=> new Error(error.message || "error gen summary"));
      
    })
  );
  }
  /**
   * Search documents from the Federal Register API using fetch
   * @param searchTerm The term to search for
   * @returns Observable of search results
   */
  searchDocuments(searchTerm: string): Observable<SearchResult[]> {
    // Build URL with query parameters
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
  
    // Use fetch API and convert Promise to Observable
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
          publicationDate: new Date(item.publication_date).toLocaleDateString(),
          // Add additional metadata
          documentNumber: item.document_number,
          startPage: item.start_page,
          endPage: item.end_page,
          cfrReferences: this.formatCfrReferences(item.cfr_references),
          docketIds: item.docket_ids || [],
          regulationIdNumbers: item.regulation_id_numbers || [],
          effectiveDate: item.effective_on ? new Date(item.effective_on).toLocaleDateString() : undefined,
          citation: item.citation,
          rin: item.regulation_id_numbers[0]
          // rin: Array.isArray(item.regulation_id_numbers) && item.regulation_id_numbers.length > 0
          //    ? item.regulation_id_numbers[',']
          //    : 'N/A'
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
    
    return from(
      fetch(url).then(response => {
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
        rin: Array.isArray(item.regulation_id_numbers) && item.regulation_id_numbers.length > 0 ? item.regulation_id_numbers[0] : 'N/A',
        citation: item.citation || 'N/A'
      })),
      catchError(error => {
        console.error('Error fetching document details', error);
        return of(null);
      })
    );
  }


  
  /**
   * Get a document summary by ID or URL - updated to use new backend APIs
   * @param documentId Document ID or URL to summarize
   * @param isUrl Whether the provided ID is a URL
   * @returns Observable with summarization result with processing step tracking
   */
   summarizeDocumentWithPrompt(documentId: string, prompt: string, isUrl: boolean = false): Observable<DocumentSummary> {
    // In a real implementation, you would pass the prompt to your API
    // For now, we'll just use the existing method
    return this.summarizeDocument2(documentId, isUrl);
  }


  summarizeDocument2(documentId: string, isUrl: boolean = false): Observable<DocumentSummary> {
    // Create a subject to track process steps - we'll just have one step now
    const processStep = new Subject<number>();
    const summarizationPrompt = 
      'Provide a concise summary of the key requirements and obligations outlined in this regulation using approximately 500 words.';
    // Start the process
    processStep.next(1);
    
    // If it's a URL, we'll need a different handling (unchanged from before)
    if (isUrl) {
      // Same implementation as before
    }
    
    // For document IDs, use the new single-shot API
    return this.getSingleShotSummary(documentId, summarizationPrompt).pipe(
      switchMap(response => {
        // Assuming summarization.value has the summary
        const summary = response.openAIResponse || 'No summary available';
        console.log("RRR.............",response.openAIResponse);
        
        // Get additional document details from Federal Register for metadata
        return this.getDocumentDetails(documentId).pipe(
          map(docDetails => {
            processStep.next(3); // Simulate completion of process
            
            return {
              id: documentId,
              title: docDetails?.title || `Document ${documentId}`,
              publicationDate: docDetails?.publicationDate || new Date().toLocaleDateString(),
              agency: docDetails?.agencyName || response.regulation?.agencies || 'Unknown Agency',
              documentType: docDetails?.documentType || response.regulation?.type || 'Document',
              summary: summary,
              documentNumber: documentId,
              startPage: docDetails?.startPage || response.regulation?.startPage,
              endPage: docDetails?.endPage || response.regulation?.endPage,
              cfrReferences: docDetails?.cfrReferences || [],
              docketIds: docDetails?.docketIds || response.regulation?.docketIds,
              regulationIdNumbers: docDetails?.regulationIdNumbers || [],
              effectiveDate: docDetails?.effectiveDate,
              processSteps: processStep.asObservable()
          };
        })
      );
    }),
    catchError(error => {
      console.error('Error in document summarization process', error);
      return this.fallbackToFederalRegisterApi(documentId, processStep);
    })
  );
}

// summarizeDocument(documentId: string, isUrl: boolean = false): Observable<DocumentSummary> {
//   // Create a subject to track process steps
//   const processStep = new Subject<number>();
  
//   // Helper function to update process step
//   const updateStep = (step: number) => {
//     processStep.next(step);
//   };
  
//   // If it's a URL, we'll need to handle it differently - for now use the mock implementation
//   if (isUrl) {
//     // For URLs, we'd need a different endpoint or process
//     // Mock implementation for now
//     updateStep(1); // Simulate process step 1
//     setTimeout(() => updateStep(2), 500); // Simulate process step 2
//     setTimeout(() => updateStep(3), 1000); // Simulate process step 3
    
//     return of({
//       id: documentId,
//       title: 'Document from external URL',
//       publicationDate: 'January 31, 2024',
//       agency: 'Small Business Administration',
//       documentType: 'Notice',
//       summary: '...Mock summary content for URL input...',
//       // Add a property to access the process step observable
//       processSteps: processStep.asObservable()
//     }).pipe(delay(1500));
//   }
  
//   // For document IDs, use the new 3-step API process
//   // Step 1: Get federal registry document
//   updateStep(1);
//   return this.getFederalRegistryDoc(documentId).pipe(
//     switchMap(docResponse => {
//       // Step 2: Get document text path using the textUrl from first response
//       updateStep(2);
//       return this.getDocumentTextPath(documentId, docResponse.textUrl).pipe(
//         switchMap(pathResponse => {
//           // Store the file path for future questions about this document
//           this.documentFilePaths.set(documentId, pathResponse.filePath);
          
//           // Step 3: Get AI summary using the file path
//           updateStep(3);
//           return this.getAISummary(pathResponse.filePath).pipe(
//             // Get additional document metadata from Federal Register API
//             switchMap(summaryResponse => {
//               return this.getDocumentDetails(documentId).pipe(
//                 map(docDetails => {
//                   return {
//                     id: documentId,
//                     title: docDetails?.title || `Document ${documentId}`,
//                     publicationDate: docDetails?.publicationDate || 
//                       new Date().toLocaleDateString(),
//                     agency: docDetails?.agencyName || 'Unknown Agency',
//                     documentType: docDetails?.documentType || 'Document',
//                     summary: summaryResponse.summary,
//                     documentNumber: documentId,
//                     startPage: docDetails?.startPage,
//                     endPage: docDetails?.endPage,
//                     cfrReferences: docDetails?.cfrReferences || [],
//                     docketIds: docDetails?.docketIds || [],
//                     regulationIdNumbers: docDetails?.regulationIdNumbers || [],
//                     effectiveDate: docDetails?.effectiveDate,
//                     // Add a property to access the process step observable
//                     processSteps: processStep.asObservable()
//                   };
//                 })
//               );
//             })
//           );
//         })
//       );
//     }),
//     catchError(error => {
//       console.error('Error in document summarization process', error);
//       // Fall back to Federal Register API on error
//       return this.fallbackToFederalRegisterApi(documentId, processStep);
//     })
//   );
// };


/**
* Get federal registry document information
* @param documentNumber The document number
* @returns Observable with document text URL
*/
getFederalRegistryDoc(documentNumber: string): Observable<FederalRegistryDocResponse> {
const url = new URL(API_CONFIG.REGULATORY_AI.GET_TEXT_URL);
url.searchParams.append('document-number', documentNumber);
console.log('Exact..................................');
console.log('Testing BofA API with exact working patternACTUAL:', url.toString());
return from(
  fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: {
      'x-boa-source-id': 'application/json'
    }
  }).then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
).pipe(
  map(response => {
    if (response.textUrl) {
      return response;
    }
    throw new Error(response.message || 'Error fetching document');
  }),
  catchError(error => {
    console.error('Error fetching Federal Registry document', error);
    return throwError(() => new Error(error.message || 'Error fetching document'));
  })
);
}

/**
* Get document text path
* @param documentNumber The document number
* @param documentTextUrl The document text URL from previous call
* @returns Observable with document file path
*/
getDocumentTextPath(documentNumber: string, documentTextUrl: string): Observable<DocumentTextPathResponse> {
const encodedUrl = encodeURIComponent(documentTextUrl);
const url = `${API_CONFIG.REGULATORY_AI.GET_TXT_FILE_PATH}/document-text-path?document-number=${documentNumber}&document-text-url=${encodedUrl}`;

// const url = new URL(API_CONFIG.REGULATORY_AI.GET_TEXT_URL);
// url.searchParams.append('document-number', documentNumber);
console.log('Exec2................................');
return from(
  fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'x-boa-source-id': 'application/json'
    }
  }).then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
).pipe(
  map(response => {
    if (!response.success) {
      throw new Error(response.message || 'Error fetching document text path');
    }
    return response.data;
  }),
  catchError(error => {
    console.error('Error fetching document text path', error);
    return throwError(() => new Error(error.message || 'Error fetching document text path'));
  })
);
}

private fallbackToFederalRegisterApi(documentId: string, processStep?: Subject<number>): Observable<DocumentSummary> {
  const url = `${this.federalRegisterApiUrl}/${documentId}`;
  
  // If process step subject is provided, update it to show we're using fallback
  if (processStep) {
    // Use Federal Register API as a fallback (skip to step 3)
    processStep.next(3);
  }
  
  return from(
    fetch(url).then(response => {
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
      summary: item.abstract || 'Failed to generate AI summary. Showing document abstract instead.',
      documentNumber: item.document_number,
      startPage: item.start_page,
      endPage: item.end_page,
      cfrReferences: this.formatCfrReferences(item.cfr_references),
      docketIds: item.docket_ids || [],
      regulationIdNumbers: item.regulation_id_numbers || [],
      effectiveDate: item.effective_on ? new Date(item.effective_on).toLocaleDateString() : undefined,
      processSteps: processStep?.asObservable() // Add the process step observable if available
    })),
    catchError(error => {
      console.error('Error in fallback summarization', error);
      // Absolute last resort - provide mock data
      return of({
        id: documentId,
        title: `Document ${documentId}`,
        publicationDate: new Date().toLocaleDateString(),
        agency: 'Unknown Agency',
        documentType: 'Document',
        summary: 'Ub=nable to retrieve',
        processStep$: processStep?.asObservable()
      });
    })
  );
}
  
  /**
 * Ask a question about a document using the AI
 * @param documentId The document ID
 * @param question The question to ask
 * @returns Observable of question response
 */
askDocumentQuestion(documentId: string, question: string): Observable<QuestionResponse> {
  return this.getSingleShotSummary(documentId, question).pipe(
    map(response => {
      return {
        id: `q-${Date.now()}`,
        answer: response.openAIResponse || 'No answer available'
      };
    }),
    catchError(error => {
      console.error('Error asking question', error);
      return this.getFallbackQuestionAnswer(question);
    })
  );
}

/**
 * Get a fallback answer when the API fails
 * @param question The question that was asked
 * @returns Observable with a simulated answer
 */
private getFallbackQuestionAnswer(question: string): Observable<QuestionResponse> {
  let answer = '';
  
  if (question.toLowerCase().includes('update')) {
    answer = 'This document was last updated on January 31, 2024.';
  } else if (question.toLowerCase().includes('summarize') || question.toLowerCase().includes('summary')) {
    answer = 'This document outlines the requirements for financial data rights and industry standards for personal financial information.';
  } else if (question.toLowerCase().includes('new york')) {
    answer = 'Yes, this regulation applies to financial institutions operating in New York state, as it is a federal regulation.';
  } else if (question.toLowerCase().includes('requirement') || question.toLowerCase().includes('obligation')) {
    answer = 'The key requirements outlined in this regulation include:\n' +
      '1. Financial institutions must provide clear disclosure of data collection practices\n' +
      '2. Consumers must have the right to access their personal financial data\n' +
      '3. Data sharing between institutions requires explicit consumer consent\n' +
      '4. Financial institutions must implement reasonable security measures\n' +
      '5. Regular audits and compliance reporting are required';
  } else {
    answer = 'I apologize, but I was unable to process your question due to a technical issue. ' +
      'Please try asking a different question or try again later.';
  }
  
  return of({
    id: `q-${Date.now()}`,
    answer: answer
  });
}

getDefaultPrompts(): Observable<any> {
  return this.http.get<any>(`${API_CONFIG.REGULATORY_AI.DEFAULT_PROMPTS}`);
}

getFetchDefaultPrompts(): Observable<any> {
  return from(
    fetch(`${API_CONFIG.REGULATORY_AI.DEFAULT_PROMPTS}`).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
  );
}
}
