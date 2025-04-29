// src/app/services/ai-parameters.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, from } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

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

const DEFAULT_PARAMETERS: AIParameters = {
  temperature: 0,
  nucleusSampling: 0,
  seed: '100',
  chunkMethod: "Character",
  chunkMethodValue: 0
};

@Injectable({
  providedIn: 'root'
})
export class AIParametersService {
  private storageKey = 'ai_parameters';
  private parametersSubject: BehaviorSubject<AIParameters>;
  private apiBaseUrl = "http://ah.corp:8007"; // Update with your actual base URL
  private tuningEndpoint = "/api/v1/ai-parameters/default-values"; // Update with the actual endpoint
  
  constructor() {
    // Initialize from localStorage or use defaults
    const savedParameters = this.loadFromStorage();
    this.parametersSubject = new BehaviorSubject<AIParameters>(savedParameters);
    
    // Fetch default values from API on initialization
    this.fetchDefaultParameters();
  }

  /**
   * Fetch default AI parameters from API
   */
  fetchDefaultParameters(): Observable<AIParameters> {
    return from(
      fetch(`${this.apiBaseUrl}${this.tuningEndpoint}`, {
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
      map((apiParams: APITuningParameters) => {
        // Convert API response to AIParameters format
        const params: AIParameters = {
          temperature: parseFloat(apiParams.openAITemperature) || 0,
          nucleusSampling: parseFloat(apiParams.openAITopP) || 0,
          seed: apiParams.openAISeed || '100',
          chunkMethod: this.getCurrentParameters().chunkMethod, // Keep existing value
          chunkMethodValue: this.getCurrentParameters().chunkMethodValue // Keep existing value
        };
        
        // Update parameters with values from API
        this.updateParameters(params);
        
        return params;
      }),
      catchError(error => {
        console.error('Error fetching default AI parameters:', error);
        // If there's an error, keep using current parameters
        return of(this.getCurrentParameters());
      })
    );
  }

  /**
   * Get parameters as an observable
   */
  getParameters(): Observable<AIParameters> {
    return this.parametersSubject.asObservable();
  }

  /**
   * Get current parameter values
   */
  getCurrentParameters(): AIParameters {
    return this.parametersSubject.getValue();
  }

  /**
   * Update parameters
   */
  updateParameters(parameters: AIParameters): void {
    this.parametersSubject.next(parameters);
    this.saveToStorage(parameters);
  }

  /**
   * Reset to default parameters
   */
  resetToDefaults(): void {
    // Fetch defaults from API first, fallback to hardcoded defaults if API fails
    this.fetchDefaultParameters().subscribe({
      error: () => {
        // If API call fails, use hardcoded defaults
        this.updateParameters(DEFAULT_PARAMETERS);
      }
    });
  }

  /**
   * Load parameters from localStorage
   */
  private loadFromStorage(): AIParameters {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsedParams = JSON.parse(saved);
        
        // Handle migration from old format (where chunkMethod was a number)
        if (typeof parsedParams.chunkMethod === 'number') {
          switch(parsedParams.chunkMethod) {
            case 0:
              parsedParams.chunkMethod = "Character";
              break;
            case 1:
              parsedParams.chunkMethod = "Paragraph";
              parsedParams.chunkMethodValue = 1;
              break;
            case 3: // This was Token in the old code
              parsedParams.chunkMethod = "Token";
              parsedParams.chunkMethodValue = 2;
              break;
            default:
              parsedParams.chunkMethod = "Character";
              parsedParams.chunkMethodValue = 0;
          }
        }
        
        return parsedParams;
      }
    } catch (error) {
      console.error('Error loading AI parameters from storage:', error);
    }
    return DEFAULT_PARAMETERS;
  }

  /**
   * Save parameters to localStorage
   */
  private saveToStorage(parameters: AIParameters): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(parameters));
    } catch (error) {
      console.error('Error saving AI parameters to storage:', error);
    }
  }
}