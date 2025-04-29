// message.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Message, MessageSender } from '../../../../models/message.model';

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './message.component.html'
})
export class MessageComponent {
  @Input() message!: Message;
  @Output() copyContent = new EventEmitter<string>();
  @Output() downloadContent = new EventEmitter<{content: string, requestId?: number}>();
  @Output() provideFeedback = new EventEmitter<Message>();
  
  // Enum reference for use in template
  MessageSender = MessageSender;
  
  /**
   * Copy message content
   */
  onCopy(): void {
    this.copyContent.emit(this.message.content);
  }
  
  /**
   * Download message content
   */
  onDownload(): void {
    this.downloadContent.emit({
      content: this.message.content,
      requestId: this.message.requestId
    });
  }
  
  /**
   * Provide feedback for message
   */
  onFeedback(): void {
    this.provideFeedback.emit(this.message);
  }
}