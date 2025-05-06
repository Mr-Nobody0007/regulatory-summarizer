import { Injectable } from '@angular/core';
import { Observable, from, of, delay, throwError, Subject } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { SearchResult } from '../components/home/home.component';
import { DocumentSummary } from '../components/document-summary/document-summary.component';
import { DocumentDataService } from './document-data.service';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../components/config';
import { FeedbackSubmission } from '../components/feedback-dialog/feedback-dialog.component';
import { AIParametersService } from './ai-parameters.service';

export interface QuestionResponse {
  id: string;
  answer: string;
  requestId?: number;
}

export interface WhitelistedUrl {
  urlId: number;
  url: string;
  name: string;
  isDeleted: boolean;
  isDisplay: boolean;
}

export interface FeedbackResponse {
  success: boolean;
  message?: string;
}

export interface FeedbackItem {
  surveyQuestionId: number;
  feedbackText: string | null;
  regulationRequestId: number;
  feedbackScore: number | null;
}

// Legacy payload for orchestrate endpoint
export interface SummaryRequestSingle {
  documentNumber: string;
  prompt: string;
  temperature: number;
  topP: number;
  chunkMethod: string;
  chunkMethodVal: number;
  signalRConnId: string;
  seed: number;
  userName: string;
}

// New payload structure for orchestrate-v2 endpoint
export interface DocumentInfo {
  documentId: string;     // Document number for search input, URL for URL input
  documentSource: string; // Usually empty
  documentURL: string;    // Empty for search input, URL for URL input
  documentText: string;   // Usually empty unless we have direct text
}

export interface OrchestrateV2Request {
  document: DocumentInfo[];
  prompt: string;
  temperature: number;
  topP: number;
  seed: number;
  chunkMethod: string;
  chunkMethodVal: number;
  signalRConnId: string;
  userName: string;
}

export interface ApiResponse {
  sucess: boolean;
  message?: string;
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

@Injectable({
  providedIn: 'root'
})
export class RegulatoryService {
  private federalRegisterApiUrl = 'https://www.federalregister.gov/api/v1/documents';
  private apiBaseUrl = "http://ah.corp:8007";
  private orchestrateEndpoint = "/api/v1/open-ai/orchestrate-send-prompt";
  private orchestrateV2Endpoint = "/api/v1/open-ai/orchestrate-v2-send-prompt";
  private userName = "User"; // You might want to get this from a user service
  
  constructor(
    private documentDataService: DocumentDataService,
    private http: HttpClient,
    private aiParametersService: AIParametersService
  ) { }

  /**
   * Map the feedback submission to the API format
   * @param feedback The feedback submission from the dialog
   * @returns Array of feedback items in API format
   */
  private mapFeedbackToApiFormat(feedback: FeedbackSubmission): FeedbackItem[] {
    // Create an array of feedback objects as required by the API
    const feedbackArray: FeedbackItem[] = [
      {
        surveyQuestionId: 2, // Accuracy
        feedbackText: null, 
        regulationRequestId: feedback.responseId,
        feedbackScore: feedback.accuracy
      },
      {
        surveyQuestionId: 3, // Completeness
        feedbackText: null,
        regulationRequestId: feedback.responseId,
        feedbackScore: feedback.completeness
      },
      {
        surveyQuestionId: 4, // Consistency
        feedbackText: null,
        regulationRequestId: feedback.responseId,
        feedbackScore: feedback.consistency
      },
      {
        surveyQuestionId: 5, // Clarity and readability
        feedbackText: null,
        regulationRequestId: feedback.responseId,
        feedbackScore: feedback.clarity
      },
      {
        surveyQuestionId: 6, // Time Savings
        feedbackText: null,
        regulationRequestId: feedback.responseId,
        feedbackScore: feedback.timeSavings
      },
      {
        surveyQuestionId: 7, // Usefulness
        feedbackText: null,
        regulationRequestId: feedback.responseId,
        feedbackScore: feedback.usefulness
      }
    ];

    // Add comments if provided
    if (feedback.comments && feedback.comments.trim().length > 0) {
      feedbackArray.push({
        surveyQuestionId: 9, // Comments
        feedbackText: feedback.comments,
        regulationRequestId: feedback.responseId,
        feedbackScore: null
      });
    }

    return feedbackArray;
  }

   formattingTestText = `# Formatting Rules Test Text

## Explicit Formatting Tests

**This text should be bold** using the boldImportant rule.

_This text should be italic_ using the italicEmphasis rule.

==This text should have a yellow highlight== using the highlightCritical rule.

The deadline is {date:January 15, 2026} using the dateFormatting rule.

As referenced in {cite:12 CFR 1026.43}, lenders must follow certain guidelines according to the legalCitation rule.

A {def:qualified mortgage} meets certain requirements as defined by the CFPB using the definitionTerm rule.

{warning:Failure to comply with these regulations may result in significant penalties and enforcement actions.} This should appear in a warning box.

Financial institutions must implement \`OAuth 2.0\` authentication protocols to secure their systems. This should use codeSnippet formatting.

For more detailed information, see {section:1033.5(b)} of the regulation. This section reference should be highlighted.

{reg:12 CFR Part 1033} outlines requirements for financial data rights. This should use the regulation formatting.

## Automatic Formatting Tests

The deadline for submission is December 31, 2025. This should be automatically highlighted without markup.

The regulatory fine can be up to $10,000 per violation, with some cases reaching $1.2 million in total penalties. These monetary amounts should be green.

According to recent studies, 75% of financial institutions have updated their systems to meet the new requirements. This percentage should be purple.

Financial institutions must maintain adequate capital reserves to meet the regulatory compliance standards and avoid enforcement action related to their fiduciary duty. These key terms should be underlined with dotted lines.

As described in 12 CFR 1026.43, the regulation provides clear guidelines for the industry. This CFR reference should be formatted without explicit markup.

Remember that before January 1, 2026, all institutions must complete the certification process. This deadline should be detected.`;

// You can use this variable in your application like this:
// const formattedText = textFormattingService.formatText(formattingTestText);
  /**
   * Submit feedback to the API
   * @param feedback The feedback from the dialog
   * @returns Observable with success/failure information
   */
  submitFeedback(feedback: FeedbackSubmission): Observable<FeedbackResponse> {
    const apiUrl = 'https://ah-139282-001.sdi.corp.bankofamrica.com:8007/api/v1/Feedback/send-feedbacks';
    
    // Map the feedback to the API format
    const feedbackData: FeedbackItem[] = this.mapFeedbackToApiFormat(feedback);
    
    return this.http.post<FeedbackResponse>(apiUrl, feedbackData)
      .pipe(
        map(response => {
          console.log('Feedback API response:', response);
          return { success: true, message: 'Feedback submitted successfully' };
        }),
        catchError(error => {
          console.error('Error submitting feedback to API:', error);
          return of({ 
            success: false, 
            message: `Failed to submit feedback: ${error.message || 'Unknown error'}` 
          });
        })
      );
  }


  getWhitelistedUrls(): Observable<WhitelistedUrl[]> {
    // Use the API endpoint for whitelisted URLs
    const url = `${this.apiBaseUrl}/api/v1/Setting/get-url-whitelist`;
    
    return from(
      fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
    ).pipe(
      map((response: any) => {
        // Filter to only include active URLs that should be displayed
        return response.data.filter((url: WhitelistedUrl) => 
          !url.isDeleted && url.isDisplay
        );
      }),
      catchError(error => {
        console.error("Error fetching whitelisted URLs", error);
        // Return an empty array as fallback
        return of([]);
      })
    );
  }

  private formatDateYYYYMMDD(dateString: string | null): string {
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
   * New method using orchestrate-v2 endpoint that can handle both document IDs and URLs
   * @param input Document ID or URL
   * @param prompt Prompt text
   * @param isUrl Flag indicating if input is a URL
   * @returns Observable with API response
   */
  getSummaryV2(input: string, prompt: string, isUrl: boolean = false): Observable<any> {
    const url = `${this.apiBaseUrl}${this.orchestrateV2Endpoint}`;
    
    // Get current AI parameters
    const aiParams = this.aiParametersService.getCurrentParameters();
    
    // Create document info based on input type
    const documentInfo: DocumentInfo = {
      documentId: input,
      documentSource: '',
      documentURL: isUrl ? input : '',
      documentText: ''
    };
    
    // Create payload using the new structure
    const payload: OrchestrateV2Request = {
      document: [documentInfo],
      prompt: prompt,
      temperature: aiParams.temperature,
      topP: aiParams.nucleusSampling,
      seed: parseInt(aiParams.seed) || 100,
      chunkMethod: aiParams.chunkMethod,
      chunkMethodVal: aiParams.chunkMethodValue,
      signalRConnId: '',
      userName: this.userName
    };

    return from(
      fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }).then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
    ).pipe(
      map(response => {
        console.log('Orchestrate V2 response:', response);
        return response;
      }),
      catchError(error => {
        console.error("Error generating summary with orchestrate-v2", error);
        return throwError(() => new Error(error.message || "Error generating summary"));
      })
    );
  }

  /**
   * Legacy method using the original orchestrate endpoint (keeping for backward compatibility)
   */
  getSingleShotSummary(documentNumber: string, prompt: string): Observable<any> {
    const url = `${this.apiBaseUrl}${this.orchestrateEndpoint}`;
    
    // Get current AI parameters
    const aiParams = this.aiParametersService.getCurrentParameters();
    
    // Legacy payload format
    const payload: SummaryRequestSingle = {
      documentNumber: documentNumber,
      prompt: prompt,
      temperature: aiParams.temperature,
      topP: aiParams.nucleusSampling,
      seed: parseInt(aiParams.seed) || 100,
      signalRConnId: '',
      chunkMethod: aiParams.chunkMethod,
      chunkMethodVal: aiParams.chunkMethodValue,
      userName: this.userName
    };

    return from(
      fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }).then(response => {
        if (!response.ok) {
          throw new Error('Http error');
        }
        return response.json();
      })
    ).pipe(
      map(response => {
        console.log('Single shot summary response:', response);
        return response;
      }),
      catchError(error => {
        console.error("Error generating summary", error);
        return throwError(() => new Error(error.message || "error generating summary"));
      })
    );
  }

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

  validateDocumentUrl(url: string): Observable<boolean> {
    return from(
      fetch(url, { method: 'HEAD' })
        .then(response => response.ok)
        .catch(() => false)
    );
  }

  /**
   * Updated method to use orchestrate-v2 endpoint for both document IDs and URLs
   */
  summarizeDocumentWithPrompt(input: string, prompt: string, isUrl: boolean = false): Observable<DocumentSummary> {
    const processStep = new Subject<number>();
    
    processStep.next(1);
    
    // Use the new orchestrate-v2 endpoint for both document IDs and URLs
    return this.getSummaryV2(input, prompt, isUrl).pipe(
      map(response => {
        // Extract the summary and documentDto from the response
        const summary = response.openAIResponse || 'No summary available';
        const documentDto = response.documentDto || null;
        
        processStep.next(3); // Simulate completion of process
        
        // Create the DocumentSummary object using data from documentDto if available
        const result: DocumentSummary = {
          id: input,
          title: documentDto?.title || `Document ${input}`,
          publicationDate: this.formatDateYYYYMMDD(documentDto?.publication_date) || this.formatDateYYYYMMDD(new Date().toISOString()),
          agency: this.extractAgencyNames(documentDto?.agencies) || 'Unknown Agency',
          documentType: documentDto?.type || 'Document',
          summary: summary,
          documentNumber: documentDto?.document_number || input,
          startPage: documentDto?.start_page,
          endPage: documentDto?.end_page,
          cfrReferences: this.formatCfrReferences(documentDto?.cfr_references) || [],
          docketIds: documentDto?.docket_ids || [],
          regulationIdNumbers: documentDto?.regulation_id_numbers || [],
          effectiveDate: this.formatDateYYYYMMDD(documentDto?.effective_on),
          // Store the entire documentDto for additional data access
          documentDto: documentDto,
          // Store the PDF URL directly
          pdfUrl: documentDto?.pdf_url,
          regulationRequestId: response.regulationRequestId
        };
        
        return result;
      }),
      catchError(error => {
        console.error('Error in document summarization process', error);
        return this.fallbackToFederalRegisterApi(input, processStep);
      })
    );
  }

  /**
   * Updated to use orchestrate-v2 endpoint for asking questions
   */
  askDocumentQuestion(input: string, question: string, isUrl: boolean = false): Observable<QuestionResponse> {
    return this.getSummaryV2(input, question, isUrl).pipe(
      map(response => {
        // Extract answer from the response
        const answer = response.openAIResponse || 'No answer available';
        // Get the regulationRequestId from the response
        const regulationRequestId = typeof response.regulationRequestId === 'number' ? 
          response.regulationRequestId : (parseInt(response.regulationRequestId) || Date.now());
        // Generate a unique ID for the response
        const responseId = `q-${Date.now()}`;
        
        return {
          id: responseId,
          answer: answer,
          requestId: regulationRequestId
        };
      }),
      catchError(error => {
        console.error('Error asking question', error);
        return this.getFallbackQuestionAnswer(question);
      })
    );
  }


  /**
 * Fetch document metadata from the dedicated API endpoint
 * @param documentNumber Document number to fetch metadata for
 * @returns Observable with the document metadata
 */
fetchDocumentMetadata(documentNumber: string): Observable<any> {
  // Construct the API URL
  const url = `${this.apiBaseUrl}/api/v1/open-ai/federal-registry-doc?document-number=${documentNumber}`;
  
  return from(
    fetch(url, {
      method: 'GET',
      credentials: 'include', // Include credentials as in other API calls
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
  ).pipe(
    map(response => {
      console.log('Document metadata response:', response);
      return response;
    }),
    catchError(error => {
      console.error("Error fetching document metadata", error);
      return throwError(() => new Error(error.message || "Error fetching document metadata"));
    })
  );
}

  // Helper methods for processing documentDto
  private extractAgencyNames(agencies: any[] | null): string {
    if (!agencies || !Array.isArray(agencies) || agencies.length === 0) {
      return '';
    }
    
    return agencies.map(agency => agency.name || '').filter(name => name).join(', ');
  }
  
  formatDate(dateString: string | null): string {
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

  private fallbackToFederalRegisterApi(documentId: string, processStep?: Subject<number>): Observable<DocumentSummary> {
    // Only attempt to use Federal Register API if this isn't a URL
    if (documentId.startsWith('http')) {
      return of({
        id: documentId,
        title: 'External Document',
        publicationDate: this.formatDateYYYYMMDD(new Date().toISOString()),
        agency: 'Unknown Agency',
        documentType: 'External Document',
        summary: 'Unable to process external document. Please try again later.'
      });
    }
    
    const url = `${this.federalRegisterApiUrl}/${documentId}`;
    
    if (processStep) {
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
        publicationDate: this.formatDateYYYYMMDD(item.publication_date),
        agency: item.agencies?.[0]?.name || 'Unknown Agency',
        documentType: item.type || 'Document',




        
        summary: item.abstract || this.formattingTestText,
        documentNumber: item.document_number,
        startPage: item.start_page,
        endPage: item.end_page,
        cfrReferences: this.formatCfrReferences(item.cfr_references),
        docketIds: item.docket_ids || [],
        regulationIdNumbers: item.regulation_id_numbers || [],
        effectiveDate: item.effective_on ? this.formatDateYYYYMMDD(item.effective_on) : undefined,
        // Try to construct a PDF URL for the Federal Register document
        pdfUrl: `https://www.govinfo.gov/content/pkg/FR-${this.formatDateYYYYMMDD(item.publication_date)}/pdf/${item.document_number}.pdf`
      })),
      catchError(error => {
        console.error('Error in fallback summarization', error);
        // Absolute last resort - provide mock data
        return of({
          id: documentId,
          title: `Document ${documentId}`,
          publicationDate: this.formatDateYYYYMMDD(new Date().toISOString()),
          agency: 'Unknown Agency',
          documentType: 'Document',
          summary: 'Unable to retrieve document summary'
        });
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
      answer: answer,
      requestId: Date.now()
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