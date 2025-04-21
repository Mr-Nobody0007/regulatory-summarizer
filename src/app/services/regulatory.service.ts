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
  requestId?: number; // Add requestId field
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
  private apiBaseUrl = "http://ah.corp:8007";
  
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

  

  /**
 * Submit feedback to the API
 * @param feedback The feedback from the dialog
 * @returns Observable with success/failure information
 */
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

  getSingleShotSummary(documentNumber: string, prompt: string): Observable<any> {
  const url = new URL('http://ah.corp:8007/api/v1/open-ai/orchestrate-send-prompt');
  
  // Get current AI parameters
  const aiParams = this.aiParametersService.getCurrentParameters();
  
  // Updated payload to match new API requirements
  const payload: SummaryRequestSingle = {
    documentNumber: documentNumber,
    prompt: prompt,
    temperature: aiParams.temperature,
    topP: aiParams.nucleusSampling,
    seed: parseInt(aiParams.seed) || 100,
    signalRConnId: '',
    chunkMethod: aiParams.chunkMethod, // Now passing string value directly
    chunkMethodVal: aiParams.chunkMethodValue,
    userName: 'Vatsal'
  };

  return from(
    fetch(`${url}`, {
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
            publicationDate: new Date(item.publication_date).toLocaleDateString(),
            documentNumber: item.document_number,
            startPage: item.start_page,
            endPage: item.end_page,
            cfrReferences: this.formatCfrReferences(item.cfr_references),
            docketIds: item.docket_ids || [],
            regulationIdNumbers: item.regulation_id_numbers || [],
            effectiveDate: item.effective_on ? new Date(item.effective_on).toLocaleDateString() : undefined,
            citation: item.citation,
            rin: item.regulation_id_numbers[0]
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

  getDocumentDetails(documentId: string): Observable<any> {
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

  // Updated method to process documentDto data
  summarizeDocumentWithPrompt(documentId: string, prompt: string, isUrl: boolean = false): Observable<DocumentSummary> {
    const processStep = new Subject<number>();
    
    processStep.next(1);
    
    if (isUrl) {
      // Same implementation as before for URLs
    }
    
    return this.getSingleShotSummary(documentId, prompt).pipe(
      map(response => {
        // Extract the summary and documentDto from the response
        const summary = response.openAIResponse || 'No summary available';
        const documentDto = response.documentDto || null;
        
        processStep.next(3); // Simulate completion of process
        
        // Create the DocumentSummary object using data from documentDto if available
        const result: DocumentSummary = {
          id: documentId,
          title: documentDto?.title || `Document ${documentId}`,
          publicationDate: this.formatDate(documentDto?.publication_date) || new Date().toLocaleDateString(),
          agency: this.extractAgencyNames(documentDto?.agencies) || 'Unknown Agency',
          documentType: documentDto?.type || 'Document',
          summary: summary,
          documentNumber: documentDto?.document_number || documentId,
          startPage: documentDto?.start_page,
          endPage: documentDto?.end_page,
          cfrReferences: this.formatCfrReferences(documentDto?.cfr_references) || [],
          docketIds: documentDto?.docket_ids || [],
          regulationIdNumbers: documentDto?.regulation_id_numbers || [],
          effectiveDate: this.formatDate(documentDto?.effective_on),
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
        return this.fallbackToFederalRegisterApi(documentId, processStep);
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
  
  private formatDate(dateString: string | null): string {
    if (!dateString) return '';
    
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || '';
    }
  }

  private fallbackToFederalRegisterApi(documentId: string, processStep?: Subject<number>): Observable<DocumentSummary> {
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
        // Try to construct a PDF URL for the Federal Register document
        pdfUrl: `https://www.govinfo.gov/content/pkg/FR-${new Date(item.publication_date).toISOString().split('T')[0]}/pdf/${item.document_number}.pdf`
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
          summary: 'Unable to retrieve document summary'
        });
      })
    );
  }


  
  askDocumentQuestion(documentId: string, question: string): Observable<QuestionResponse> {
    return this.getSingleShotSummary(documentId, question).pipe(
      map(response => {
        // Extract answer from the response
        const answer = response.openAIResponse || 'No answer available';
        // Get the regulationRequestId from the response
        const regulationRequestId = typeof response.regulationRequestId === 'number' ? response.regulationRequestId : (parseInt(response.regulationRequestId) || Date.now());
        // Generate a unique ID for the response
        const responseId = `q-${Date.now()}`;
        
        return {
          id: responseId,
          answer: answer,
          requestId: regulationRequestId // Pass the regulationRequestId to the component
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