// src/app/components-2/chat-input/chat-input.component.ts
import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './chat-input.component.html',
  styleUrls: ['./chat-input.component.scss']
})
export class ChatInputComponent {
  @Input() disabled: boolean = false;
  @Output() messageSent = new EventEmitter<string>();
  
  messageControl = new FormControl('', [Validators.required]);
  charLimit = 1000; // Maximum character limit for messages
  
  /**
   * Send message on submit
   */
  sendMessage(): void {
    if (this.messageControl.invalid || this.disabled) return;
    
    const message = this.messageControl.value?.trim();
    if (!message) return;
    
    this.messageSent.emit(message);
    this.messageControl.reset('');
  }
  
  /**
   * Calculate remaining characters for the char counter
   */
  getRemainingCharacters(): number {
    const currentLength = this.messageControl.value?.length || 0;
    return this.charLimit - currentLength;
  }
  
  /**
   * Send message on Enter key (without shift key)
   * Allow new line with Shift+Enter
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
  
  /**
   * Auto-resize textarea based on content
   */
  autoResize(textarea: HTMLTextAreaElement): void {
    // Reset height to recalculate
    textarea.style.height = 'auto';
    
    // Set the height based on scrollHeight (with a max of 200px)
    const newHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${newHeight}px`;
  }
}