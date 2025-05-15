import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

interface Prompt {
  promptId?: number;
  promptType: string;  // e.g., "Notice", "Rule", "NoDocDefault"
  promptPurpose: string; // "Default", "Suggestion", "NoDocDefault"
  promptText: string;
}

@Component({
  selector: 'app-prompt-admin',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule
  ],
  templateUrl: './prompt-admin.component.html',
  styleUrls: ['./prompt-admin.component.scss']
})
export class PromptAdminComponent implements OnInit {
  prompts: Prompt[] = [];
  filteredPrompts: Prompt[] = [];
  documentTypes: string[] = [];
  promptForm: FormGroup;
  editMode = false;
  currentPromptId: number | null = null;
  filterType: string = '';
  filterPurpose: string = '';
  isLoading = false;
  apiIsReadOnly = true; // Flag to indicate API is read-only
  
  @ViewChild('newType') newTypeInput!: ElementRef;
  
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.promptForm = this.fb.group({
      promptType: ['', [Validators.required]],
      promptPurpose: ['', [Validators.required]],
      promptText: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadPrompts();
  }

  loadPrompts(): void {
    this.isLoading = true;
    
    // Use your actual API endpoint for getting prompts
    this.http.get<any>('/api/prompts').subscribe({
      next: (response) => {
        // Adapt the response based on your API structure
        // Assuming the API returns an array of prompts directly or within a data property
        let promptsData = Array.isArray(response) ? response : response.data || [];
        
        // Map the API response to our Prompt interface if needed
        this.prompts = promptsData.map((item: any) => ({
          promptId: item.promptId || item.id,
          promptType: item.promptType,
          promptPurpose: item.promptPurpose,
          promptText: item.promptText
        }));
        
        this.filteredPrompts = [...this.prompts];
        this.extractDocumentTypes();
        this.validatePromptConstraints();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading prompts:', err);
        this.snackBar.open('Failed to load prompts', 'Dismiss', { duration: 3000 });
        this.isLoading = false;
        
        // For demo purposes, load mock data
        this.loadMockData();
      }
    });
  }

  // Load mock data for demonstration or if API fails
  loadMockData(): void {
    this.prompts = [
      {
        promptId: 1,
        promptType: 'Notice',
        promptPurpose: 'Default',
        promptText: 'Provide a concise summary of this Notice, highlighting key regulatory requirements, deadlines, and implications for stakeholders.'
      },
      {
        promptId: 2,
        promptType: 'Notice',
        promptPurpose: 'Suggestion',
        promptText: 'What are the key deadlines mentioned in this notice?'
      },
      {
        promptId: 3,
        promptType: 'Notice',
        promptPurpose: 'Suggestion',
        promptText: 'How does this notice affect financial institutions?'
      },
      {
        promptId: 4,
        promptType: 'Rule',
        promptPurpose: 'Default',
        promptText: 'Summarize the main requirements and compliance obligations in this Rule, including implementation timelines.'
      },
      {
        promptId: 5,
        promptType: 'Proposed Rule',
        promptPurpose: 'Default',
        promptText: 'Provide a summary of this Proposed Rule, highlighting key changes from existing regulations and potential impacts.'
      },
      {
        promptId: 6,
        promptType: 'NoDocDefault',
        promptPurpose: 'NoDocDefault',
        promptText: 'Analyze this document and provide a concise summary of its key points, regulatory implications, and any deadlines or requirements.'
      }
    ];
    
    this.filteredPrompts = [...this.prompts];
    this.extractDocumentTypes();
    this.validatePromptConstraints();
  }

  extractDocumentTypes(): void {
    // Extract unique document types from prompts
    const types = new Set<string>();
    this.prompts.forEach(prompt => {
      if (prompt.promptType !== 'NoDocDefault') {
        types.add(prompt.promptType);
      }
    });
    this.documentTypes = Array.from(types);
  }

  validatePromptConstraints(): void {
    // Check constraints and show warnings if violated
    
    // Check for 'NoDocDefault' constraint
    const noDocDefaults = this.prompts.filter(p => 
      p.promptType === 'NoDocDefault' && p.promptPurpose === 'NoDocDefault');
    
    if (noDocDefaults.length !== 1) {
      this.snackBar.open(
        `Warning: There should be exactly one prompt with type and purpose 'NoDocDefault' (Found: ${noDocDefaults.length})`,
        'Dismiss',
        { duration: 5000 }
      );
    }
    
    // Check for 'Default' constraint for each document type
    this.documentTypes.forEach(type => {
      const defaultPromptsForType = this.prompts.filter(p => 
        p.promptType === type && p.promptPurpose === 'Default');
      
      if (defaultPromptsForType.length !== 1) {
        this.snackBar.open(
          `Warning: Document type "${type}" should have exactly one Default prompt (Found: ${defaultPromptsForType.length})`,
          'Dismiss',
          { duration: 5000 }
        );
      }
    });
  }

  filterPrompts(): void {
    this.filteredPrompts = this.prompts.filter(prompt => {
      return (this.filterType === '' || prompt.promptType === this.filterType) &&
             (this.filterPurpose === '' || prompt.promptPurpose === this.filterPurpose);
    });
  }

  resetFilters(): void {
    this.filterType = '';
    this.filterPurpose = '';
    this.filteredPrompts = [...this.prompts];
  }

  addPrompt(): void {
    this.editMode = false;
    this.currentPromptId = null;
    this.promptForm.reset();
    
    if (this.apiIsReadOnly) {
      this.snackBar.open(
        'This is a read-only demo. Add prompt functionality is visible but disabled.',
        'Dismiss',
        { duration: 3000 }
      );
    }
  }

  editPrompt(prompt: Prompt): void {
    this.editMode = true;
    this.currentPromptId = prompt.promptId || null;
    this.promptForm.patchValue({
      promptType: prompt.promptType,
      promptPurpose: prompt.promptPurpose,
      promptText: prompt.promptText
    });
    
    if (this.apiIsReadOnly) {
      this.snackBar.open(
        'This is a read-only demo. Edit prompt functionality is visible but disabled.',
        'Dismiss',
        { duration: 3000 }
      );
    }
  }

  savePrompt(): void {
    if (this.apiIsReadOnly) {
      this.snackBar.open(
        'This is a read-only demo. Save functionality is not available.',
        'Dismiss',
        { duration: 3000 }
      );
      return;
    }
    
    if (this.promptForm.invalid) {
      return;
    }

    const formValue = this.promptForm.value;
    const prompt: Prompt = {
      promptType: formValue.promptType,
      promptPurpose: formValue.promptPurpose,
      promptText: formValue.promptText
    };

    // Check if this violates the "one default prompt per type" constraint
    if (prompt.promptPurpose === 'Default') {
      const existingDefault = this.prompts.find(p => 
        p.promptType === prompt.promptType && 
        p.promptPurpose === 'Default' && 
        (!this.editMode || p.promptId !== this.currentPromptId)
      );

      if (existingDefault) {
        this.snackBar.open(
          `Error: Document type "${prompt.promptType}" already has a Default prompt. Please edit the existing one.`,
          'Dismiss',
          { duration: 5000 }
        );
        return;
      }
    }

    // Check NoDocDefault constraint
    if (prompt.promptType === 'NoDocDefault' && prompt.promptPurpose === 'NoDocDefault') {
      const existingNoDocDefault = this.prompts.find(p => 
        p.promptType === 'NoDocDefault' && 
        p.promptPurpose === 'NoDocDefault' &&
        (!this.editMode || p.promptId !== this.currentPromptId)
      );

      if (existingNoDocDefault) {
        this.snackBar.open(
          'Error: There can only be one NoDocDefault prompt. Please edit the existing one.',
          'Dismiss',
          { duration: 5000 }
        );
        return;
      }
    }

    if (this.editMode && this.currentPromptId) {
      // Update existing prompt
      prompt.promptId = this.currentPromptId;
      this.http.put<Prompt>(`/api/prompts/${this.currentPromptId}`, prompt).subscribe({
        next: (updatedPrompt) => {
          const index = this.prompts.findIndex(p => p.promptId === this.currentPromptId);
          if (index !== -1) {
            this.prompts[index] = updatedPrompt;
            this.filterPrompts();
          }
          this.snackBar.open('Prompt updated successfully', 'Dismiss', { duration: 3000 });
          this.resetForm();
        },
        error: (err) => {
          console.error('Error updating prompt:', err);
          this.snackBar.open('Failed to update prompt', 'Dismiss', { duration: 3000 });
        }
      });
    } else {
      // Create new prompt
      this.http.post<Prompt>('/api/prompts', prompt).subscribe({
        next: (newPrompt) => {
          this.prompts.push(newPrompt);
          this.filterPrompts();
          this.extractDocumentTypes();
          this.snackBar.open('Prompt created successfully', 'Dismiss', { duration: 3000 });
          this.resetForm();
        },
        error: (err) => {
          console.error('Error creating prompt:', err);
          this.snackBar.open('Failed to create prompt', 'Dismiss', { duration: 3000 });
        }
      });
    }
  }

  deletePrompt(prompt: Prompt): void {
    if (this.apiIsReadOnly) {
      this.snackBar.open(
        'This is a read-only demo. Delete functionality is not available.',
        'Dismiss',
        { duration: 3000 }
      );
      return;
    }
    
    // First, check if this is the last default prompt for this type
    if (prompt.promptPurpose === 'Default') {
      const defaultPromptsForType = this.prompts.filter(p => 
        p.promptType === prompt.promptType && 
        p.promptPurpose === 'Default'
      );
      
      if (defaultPromptsForType.length <= 1) {
        this.snackBar.open(
          `Cannot delete the only Default prompt for "${prompt.promptType}" type. Each document type must have at least one Default prompt.`,
          'Dismiss',
          { duration: 5000 }
        );
        return;
      }
    }
    
    // Check if this is the only NoDocDefault prompt
    if (prompt.promptType === 'NoDocDefault' && prompt.promptPurpose === 'NoDocDefault') {
      this.snackBar.open(
        'Cannot delete the NoDocDefault prompt. This prompt is required for URL inputs.',
        'Dismiss',
        { duration: 5000 }
      );
      return;
    }
    
    // If we pass the validation checks, open the confirmation dialog
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirm Delete',
        message: `Are you sure you want to delete this prompt for ${prompt.promptType}?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && prompt.promptId) {
        this.http.delete(`/api/prompts/${prompt.promptId}`).subscribe({
          next: () => {
            this.prompts = this.prompts.filter(p => p.promptId !== prompt.promptId);
            this.filterPrompts();
            this.extractDocumentTypes();
            this.validatePromptConstraints();
            this.snackBar.open('Prompt deleted successfully', 'Dismiss', { duration: 3000 });
          },
          error: (err) => {
            console.error('Error deleting prompt:', err);
            this.snackBar.open('Failed to delete prompt', 'Dismiss', { duration: 3000 });
          }
        });
      }
    });
  }

  resetForm(): void {
    this.promptForm.reset();
    this.editMode = false;
    this.currentPromptId = null;
  }

  getPromptTypeClass(type: string): string {
    const colorMap: {[key: string]: string} = {
      'Notice': 'type-notice',
      'Rule': 'type-rule',
      'NoDocDefault': 'type-nodoc',
      'Proposed Rule': 'type-proposed',
      // Add more types as needed
    };
    return colorMap[type] || 'type-default';
  }

  getPurposeClass(purpose: string): string {
    const colorMap: {[key: string]: string} = {
      'Default': 'purpose-default',
      'Suggestion': 'purpose-suggestion',
      'NoDocDefault': 'purpose-nodoc'
    };
    return colorMap[purpose] || '';
  }

  // Add a new document type that doesn't exist in the current list
  addNewDocumentType(type: string): void {
    if (!this.documentTypes.includes(type)) {
      this.documentTypes.push(type);
      // Set the form value to the new type
      this.promptForm.get('promptType')?.setValue(type);
    }
  }
}