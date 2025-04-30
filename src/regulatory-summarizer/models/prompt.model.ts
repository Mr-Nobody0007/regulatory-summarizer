// prompt.model.ts - Contains interfaces for prompts and suggestions

export interface Prompt {
    purpose: string;
    isDefault: boolean;
    label: string;
    prompt: string;
    documentType: string;
  }
  
  export interface AIParameters {
    temperature: number;
    nucleusSampling: number;
    seed: string;
    chunkMethod: string; 
    chunkMethodValue: number;
  }
  
  export interface APITuningParameters {
    openAITemperature: string;
    openAITopP: string;
    openAISeed: string;
  }