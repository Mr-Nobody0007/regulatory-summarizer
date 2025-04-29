// feedback.service.ts - Handles feedback submission

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { FeedbackSubmission, FeedbackItem, FeedbackResponse } from '../models/feedback.model';

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private feedbackApiUrl = 'https://ah-139282-001.sdi.corp.bankofamrica.com:8007/api/v1/Feedback/send-feedbacks';
  
  constructor(private http: HttpClient) { }

  /**
   * Submit feedback to the API
   */
  submitFeedback(feedback: FeedbackSubmission): Observable<FeedbackResponse> {
    // Map the feedback to the API format
    const feedbackData: FeedbackItem[] = this.mapFeedbackToApiFormat(feedback);
    
    return this.http.post<FeedbackResponse>(this.feedbackApiUrl, feedbackData)
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

  /**
   * Map the feedback submission to the API format
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
}