// document-header.component.ts - Component for displaying document header and metadata

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// Material imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// Models
import { DocumentSummary } from '../../../models/document.model';
import { DocumentMetadataComponent } from '../document-metadata/document-metadata.component';

@Component({
  selector: 'app-document-header',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    DocumentMetadataComponent
  ],
  templateUrl: './document-header.component.html'
})
export class DocumentHeaderComponent {
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
  
  /**
   * Navigate back to search
   */
  goBack(): void {
    this.backClicked.emit();
  }
  
  /**
   * Open PDF document
   */
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