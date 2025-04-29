// document-metadata.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DocumentSummary } from '../../../models/document.model';

@Component({
  selector: 'app-document-metadata',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './document-metadata.component.html'
})
export class DocumentMetadataComponent {
  @Input() document: DocumentSummary | null = null;
  @Output() backClicked = new EventEmitter<void>();
  @Output() pdfOpened = new EventEmitter<string>();
  
  // Control variables
  showExtendedMetadata = false;
  
  /**
   * Toggle extended metadata visibility
   */
  toggleExtendedMetadata(): void {
    this.showExtendedMetadata = !this.showExtendedMetadata;
  }

  goBack(): void {
    this.backClicked.emit();
  }

  openPdf(): void {
    if (this.document && this.document.id) {
      this.pdfOpened.emit(this.document.id);
    }
  }
  
  /**
   * Format date for display
   */
  formatDate(dateString: string | null): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString || '';
    }
  }
}