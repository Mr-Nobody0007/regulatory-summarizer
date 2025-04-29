export interface DocumentSummary {
    id: string;
    title: string;
    publicationDate: string;
    agency: string;
    documentType: string;
    summary: string;
    // Additional metadata
    documentNumber?: string;
    startPage?: number;
    endPage?: number;
    cfrReferences?: string[];
    docketIds?: string[];
    regulationIdNumbers?: string[];
    effectiveDate?: string;
    // New field for documentDto from response
    documentDto?: any;
    // PDF URL from documentDto
    pdfUrl?: string;
    regulationRequestId?: number;
    // Flag to indicate if this is a URL-based document
    isUrl?: boolean;
  }

  export interface SearchResult {
    id: string;
    title: string;
    documentType: string;
    agencyName: string;
    publicationDate: string;
    // Additional metadata
    documentNumber?: string;
    startPage?: number;
    endPage?: number;
    cfrReferences?: string[];
    docketIds?: string[];
    regulationIdNumbers?: string[];
    effectiveDate?: string;
  }

  export interface DocumentContext {
    id?: string;
    title?: string;
    sourceType: 'search' | 'url';
    url?: string;
    selected: boolean;
  }
  
  export interface WhitelistedUrl {
    name: string;
    domain: string;
    url: string;
  }