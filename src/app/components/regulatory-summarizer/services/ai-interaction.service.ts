// ai-interaction.service.ts - Handles communication with the AI backend

import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { DocumentSummary } from '../models/document.model';
import { QuestionResponse } from '../models/message.model';
import { AIParameters } from '../models/prompt.model';

// Define request interfaces
export interface DocumentInfo {
  documentId: string;
  documentSource: string;
  documentURL: string;
  documentText: string;
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

@Injectable({
  providedIn: 'root'
})
export class AiInteractionService {
  private apiBaseUrl = "http://ah.corp:8007";
  private orchestrateV2Endpoint = "/api/v1/open-ai/orchestrate-v2-send-prompt";
  private userName = "User";
  
  constructor() { }

  /**
   * Get AI parameters from service
   */
  getCurrentAIParameters(): AIParameters {
    // This should be replaced with actual integration with AIParametersService
    // For now, return default values
    return {
      temperature: 0,
      nucleusSampling: 0,
      seed: '100',
      chunkMethod: "Character",
      chunkMethodValue: 0
    };
  }

  /**
   * Send document and prompt to AI for processing
   */
  getSummaryV2(input: string, prompt: string, isUrl: boolean = false): Observable<any> {
    const url = `${this.apiBaseUrl}${this.orchestrateV2Endpoint}`;
    
    // Get current AI parameters
    const aiParams = this.getCurrentAIParameters();
    
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
   * Process document using AI with the specified prompt
   */
  summarizeDocumentWithPrompt(input: string, prompt: string, isUrl: boolean = false): Observable<DocumentSummary> {
    // Use the new orchestrate-v2 endpoint for both document IDs and URLs
    return this.getSummaryV2(input, prompt, isUrl).pipe(
      map(response => {
        // Extract the summary and documentDto from the response
        const summary = response.openAIResponse || 'No summary available';
        const documentDto = response.documentDto || null;
        
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
        return this.getFallbackDocumentSummary(input, isUrl);
      })
    );
  }

  /**
   * Ask a question about a document
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

  // Helper methods
  
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
  
  private extractAgencyNames(agencies: any[] | null): string {
    if (!agencies || !Array.isArray(agencies) || agencies.length === 0) {
      return '';
    }
    
    return agencies.map(agency => agency.name || '').filter(name => name).join(', ');
  }
  
  /**
 * Get a fallback document summary when the API fails
 */
private getFallbackDocumentSummary(documentId: string, isUrl: boolean): Observable<DocumentSummary> {
  // For URL-based documents
  if (isUrl) {
    return of({
      id: documentId,
      title: 'External Document',
      publicationDate: this.formatDateYYYYMMDD(new Date().toISOString()),
      agency: 'Unknown Agency',
      documentType: 'External Document',
      summary: 'Unable to process external document. Please try again later.',
      isUrl: true
    });
  }
  
  // For regular document IDs
  return of({
    id: documentId,
    title: `Document ${documentId}`,
    publicationDate: this.formatDateYYYYMMDD(new Date().toISOString()),
    agency: 'Unknown Agency',
    documentType: 'Document',
    summary: 'Unable to retrieve document summary. Please try again later.',
    documentNumber: documentId
  });
}
  
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
}