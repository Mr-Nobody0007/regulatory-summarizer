// src/app/components-2/document-header/document-header.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DocumentInfo } from '../chat-interface/chat-interface.component';

@Component({
  selector: 'app-document-header',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './document-header.component.html',
  styleUrls: ['./document-header.component.scss']
})
export class DocumentHeaderComponent {
  @Input() document!: DocumentInfo;
  @Input() isLoading: boolean = false;
  
  showExtendedMetadata: boolean = false;
  
  /**
   * Toggle extended metadata visibility
   */
  toggleExtendedMetadata(): void {
    this.showExtendedMetadata = !this.showExtendedMetadata;
  }
  
  /**
   * Open the document PDF in a new tab
   */
  openPdfDocument(): void {
    if (!this.document) return;
    
    // For URL-based documents, if they have a PDF URL, use it directly
    if (this.document.isUrl) {
      if (this.document.pdfUrl) {
        window.open(this.document.pdfUrl, '_blank');
      } else {
        // For URL documents without PDF link, redirect to the original URL
        window.open(this.document.id, '_blank');
      }
      return;
    }
    
    // For Federal Register documents, use the PDF URL if available
    if (this.document.pdfUrl) {
      window.open(this.document.pdfUrl, '_blank');
      return;
    }
    
    // Fall back to constructing URL based on document ID and publication date
    if (!this.document.publicationDate) {
      console.error('Missing publication date required for fallback PDF URL');
      return;
    }
    
    const pdfUrl = `https://www.govinfo.gov/content/pkg/FR-${this.document.publicationDate}/pdf/${this.document.id}.pdf`;
    window.open(pdfUrl, '_blank');
  }
  
  /**
   * Format a date string to YYYY-MM-DD
   */
  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch (error) {
      return dateStr;
    }
  }
}