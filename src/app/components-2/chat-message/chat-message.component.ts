import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatMessage } from '../chat-interface/chat-interface.component';
import { RegulatoryService } from '../../services/regulatory.service';
import { FeedbackDialogComponent } from '../../components/feedback-dialog/feedback-dialog.component';
import { TextFormattingService } from '../../services/text-formatting.service';
import { SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './chat-message.component.html',
  styleUrls: ['./chat-message.component.scss']
})
export class ChatMessageComponent implements OnInit {
  @Input() message!: ChatMessage;
  @Input() documentNumber?: string;
  
  formattedContent: SafeHtml = '';
  
  constructor(
    private dialog: MatDialog,
    private regulatoryService: RegulatoryService,
    private textFormatting: TextFormattingService
  ) {}
  
  ngOnInit() {
    // Log the message properties for debugging
    console.log('Message initialized:', {
      id: this.message.id,
      isUser: this.message.isUser,
      content: this.message.content?.substring(0, 20) + '...',
      requestId: this.message.requestId,
      hasRequestId: !!this.message.requestId
    });

    console.log("flags",this.message.isUser," ",this.message.content);
    
    
    
    
    // Format the message content for AI/system messages
    if (!this.message.isUser && this.message.content) {
      this.formattedContent = this.textFormatting.formatText(this.message.content);
    } else {
      // For user messages, just pass the content as-is
      this.formattedContent = this.message.content;
    }

    console.log("next formatted content",this.formattedContent);
  }
  
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
   * Open the feedback dialog component
   */
  provideFeedback(): void {
    if (!this.message.requestId) {
      console.warn('Cannot provide feedback: No requestId available');
      return;
    }
    
    // Use the existing feedback dialog component
    const dialogRef = this.dialog.open(FeedbackDialogComponent, {
      width: '800px',
      data: { responseId: this.message.requestId }
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Feedback submitted:', result);
        
        // Submit feedback using the regulatory service
        this.regulatoryService.submitFeedback(result).subscribe({
          next: () => {
            console.log('Feedback submitted successfully');
          },
          error: err => {
            console.error('Error submitting feedback', err);
          }
        });
      }
    });
  }
  
  /**
   * Format the message timestamp
   */
  formatTimestamp(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}