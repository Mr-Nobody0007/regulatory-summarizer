// src/app/services/ai-parameters.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AIParameters {
  temperature: number;
  nucleusSampling: number;
  seed: string;
  chunkMethod: number;
  chunkMethodValue: number;
}

const DEFAULT_PARAMETERS: AIParameters = {
  temperature: 0,
  nucleusSampling: 0,
  seed: '100',
  chunkMethod: 0,
  chunkMethodValue: 0
};

@Injectable({
  providedIn: 'root'
})
export class AIParametersService {
  private storageKey = 'ai_parameters';
  private parametersSubject: BehaviorSubject<AIParameters>;
  
  constructor() {
    // Initialize from localStorage or use defaults
    const savedParameters = this.loadFromStorage();
    this.parametersSubject = new BehaviorSubject<AIParameters>(savedParameters);
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
    this.updateParameters(DEFAULT_PARAMETERS);
  }

  /**
   * Load parameters from localStorage
   */
  private loadFromStorage(): AIParameters {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return JSON.parse(saved);
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