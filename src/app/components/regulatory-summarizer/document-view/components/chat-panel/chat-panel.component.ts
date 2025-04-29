// chat-panel.component.ts - Component for displaying chat messages between user and AI

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

// Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

// Models
import { Message, MessageSender } from '../../../models/message.model';
import { MessageComponent } from '../chat-panel/message/message.component';
import { UserQuestionInputComponent } from '../user-question-input/user-question-input.component';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MessageComponent,
    UserQuestionInputComponent
  ],
  templateUrl: './chat-panel.component.html'
})
export class ChatPanelComponent {
  @Input() messages: Message[] = [];
  @Output() questionSubmit = new EventEmitter<string>();

  questionControl = new FormControl('', [Validators.required]);
  questionCharLimit = 1000;
  
  constructor(
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}
  
  /**
   * Submit a question to the parent component
   */
  submitQuestion(): void {
    if (this.questionControl.valid && this.questionControl.value) {
      this.questionSubmit.emit(this.questionControl.value);
      this.questionControl.reset();
    }
  }
  
  /**
   * Handle Enter key to submit
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitQuestion();
    }
  }

  
  
  /**
   * Get the remaining character count for the question
   */
  getRemainingCharacters(): number {
    const currentLength = this.questionControl.value?.length || 0;
    return this.questionCharLimit - currentLength;
  }
  
  /**
   * Copy message text to clipboard
   */
  copyText(text: string): void {
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Text copied to clipboard', 'Dismiss', {
        duration: 3000
      });
    }).catch(err => {
      console.error('Error copying text: ', err);
    });
  }

  
  
  /**
   * Download message text as a file
   */
  downloadText(text: string, requestId?: number): void {
    if (!text) return;
  
    // Generate a filename
    const formattedFilename = requestId ? 
      `response-${requestId}.txt` : 
      `response-${Date.now()}.txt`;
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
  
    a.href = url;
    a.download = formattedFilename;
    
    document.body.appendChild(a);
    a.click();
  
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    this.snackBar.open('Text downloaded', 'Dismiss', {
      duration: 3000
    });
  }

  onDownloadContent(data: {content: string, requestId?: number}): void {
    if (!data.content) return;
  
    // Generate a filename
    const formattedFilename = data.requestId ? 
      `response-${data.requestId}.txt` : 
      `response-${Date.now()}.txt`;
    
    const blob = new Blob([data.content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
  
    a.href = url;
    a.download = formattedFilename;
    
    document.body.appendChild(a);
    a.click();
  
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    this.snackBar.open('Text downloaded', 'Dismiss', {
      duration: 3000
    });
  }

  onQuestionSubmit(question: string): void {
    this.questionSubmit.emit(question);
  }

  onCopyContent(text: string): void {
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Text copied to clipboard', 'Dismiss', {
        duration: 3000
      });
    }).catch(err => {
      console.error('Error copying text: ', err);
    });
  }

  onProvideFeedback(message: Message): void {
    // This will be implemented with a dialog component
    // For now, just show a message
    this.snackBar.open('Feedback dialog will open here', 'Dismiss', {
      duration: 3000
    });
  }
  
  /**
   * Open the feedback dialog
   */
  provideFeedback(message: Message): void {
    // This will be implemented with a dialog component
    // For now, just show a message
    this.snackBar.open('Feedback dialog will open here', 'Dismiss', {
      duration: 3000
    });
  }
}