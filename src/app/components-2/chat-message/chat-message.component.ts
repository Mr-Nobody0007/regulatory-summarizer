// src/app/components-2/chat-message/chat-message.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ChatMessage } from '../chat-interface/chat-interface.component';
import { RegulatoryService } from '../../services/regulatory.service';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  templateUrl: './chat-message.component.html',
  styleUrls: ['./chat-message.component.scss']
})
export class ChatMessageComponent {
  @Input() message!: ChatMessage;
  @Input() documentNumber?: string;
  
  constructor(
    private dialog: MatDialog,
    private regulatoryService: RegulatoryService
  ) {}
  
  /**
   * Copy message content to clipboard
   */
  copyText(): void {
    if (!this.message.content) return;
    
    navigator.clipboard.writeText(this.message.content).then(() => {
      console.log('Text copied to clipboard');
    }).catch(err => {
      console.error('Error copying text: ', err);
    });
  }
  
  /**
   * Download message content as a text file
   */
  downloadText(): void {
    if (!this.message.content) return;
    
    // Generate filename
    const formattedFilename = this.message.requestId ? 
      `${this.documentNumber || 'document'}-${this.message.requestId}.txt` : 
      `${this.documentNumber || 'document'}-${Date.now()}.txt`;
    
    const blob = new Blob([this.message.content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = formattedFilename;
    
    document.body.appendChild(a);
    a.click();
    
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
  
  /**
   * Open feedback dialog
   */
  provideFeedback(): void {
    if (!this.message.requestId) return;
    
    // We'll import and use the feedback dialog in the final implementation
    console.log('Opening feedback dialog for request ID:', this.message.requestId);
    
    // This logic will open the FeedbackDialogComponent and handle the result
    // similar to the existing implementation, but we'll keep it simple for now
  }
  
  /**
   * Format the message timestamp
   */
  formatTimestamp(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}