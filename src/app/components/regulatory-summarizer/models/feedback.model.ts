// feedback.model.ts - Contains interfaces for feedback functionality

export interface FeedbackDialogData {
    responseId: number;
  }
  
  export interface FeedbackSubmission {
    responseId: number;
    accuracy: number;
    completeness: number;
    consistency: number;
    clarity: number;
    timeSavings: number;
    usefulness: number;
    comments: string;
    timestamp: Date;
  }
  
  export interface FeedbackItem {
    surveyQuestionId: number;
    feedbackText: string | null;
    regulationRequestId: number;
    feedbackScore: number | null;
  }
  
  export interface FeedbackResponse {
    success: boolean;
    message?: string;
  }