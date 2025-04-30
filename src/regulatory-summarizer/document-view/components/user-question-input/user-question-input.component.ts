// user-question-input.component.ts
import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-user-question-input',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './user-question-input.component.html'
})
export class UserQuestionInputComponent {
  @Output() questionSubmit = new EventEmitter<string>();
  
  questionControl = new FormControl('', [Validators.required]);
  questionCharLimit = 1000;
  
  /**
   * Submit the question
   */
  submitQuestion(): void {
    if (this.questionControl.valid && this.questionControl.value) {
      this.questionSubmit.emit(this.questionControl.value);
      this.questionControl.reset();
    }
  }
  
  /**
   * Handle key events (e.g., Enter to submit)
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitQuestion();
    }
  }
  
  /**
   * Get the remaining character count
   */
  getRemainingCharacters(): number {
    const currentLength = this.questionControl.value?.length || 0;
    return this.questionCharLimit - currentLength;
  }
}