import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

export interface FeedbackDialogData {
  responseId: string;
}

export interface FeedbackSubmission {
  responseId: string;
  accuracy: number;
  completeness: number;
  consistency: number;
  clarity: number;
  timeSavings: number;
  usefulness: number;
  comments: string;
  timestamp: Date;
}

@Component({
  selector: 'app-feedback-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule
  ],
  templateUrl: './feedback-dialog.component.html',
  styleUrls: ['./feedback-dialog.component.scss']
})
export class FeedbackDialogComponent {
  feedbackForm: FormGroup;
  
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<FeedbackDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FeedbackDialogData
  ) {
    this.feedbackForm = this.fb.group({
      accuracy: [null],
      completeness: [null],
      consistency: [null],
      clarity: [null],
      timeSavings: [null],
      usefulness: [null],
      comments: ['']
    });
  }
  
  onClose(): void {
    this.dialogRef.close();
  }
  
  onSubmit(): void {
    if (this.feedbackForm.valid) {
      const feedback: FeedbackSubmission = {
        responseId: this.data.responseId,
        ...this.feedbackForm.value,
        timestamp: new Date()
      };
      
      this.dialogRef.close(feedback);
    }
  }
  
  // Helper method for template to generate rating options
  getRatingOptions(): number[] {
    return [1,2,3,4,5];
  }
}
