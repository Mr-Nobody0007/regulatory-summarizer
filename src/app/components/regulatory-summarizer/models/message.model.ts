// message.model.ts - Contains interfaces for chat messages

export interface Message {
    id: string;
    content: string;
    timestamp: Date;
    sender: MessageSender;
    isLoading?: boolean;
    requestId?: number;
  }
  
  export enum MessageSender {
    USER = 'user',
    AI = 'ai'
  }
  
  export interface PromptResponse {
    id: string;
    question: string;
    answer: string;
    timestamp: Date;
    isActive?: boolean;
    isLoading?: boolean;
    requestId?: number;
  }
  
  export interface QuestionResponse {
    id: string;
    answer: string;
    requestId?: number;
  }