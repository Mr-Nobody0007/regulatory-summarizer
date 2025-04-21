// src/app/components/ai-parameters-dialog/ai-parameters-dialog.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { AIParameters } from '../../services/ai-parameters.service';

@Component({
  selector: 'app-ai-parameters-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatSliderModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatSelectModule
  ],
  templateUrl: './ai-parameters-dialog.component.html',
  styleUrl: './ai-parameters-dialog.component.scss'
})
export class AIParametersDialogComponent {
  parameters: AIParameters;
  
  // Updated chunk method options with string values
  chunkMethods = [
    { value: "Character", label: 'Character' },
    { value: "Paragraph", label: 'Paragraph' },
    { value: "Token", label: 'Token' }
  ];

  constructor(
    public dialogRef: MatDialogRef<AIParametersDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: AIParameters
  ) {
    // Initialize with data or defaults
    this.parameters = { 
      temperature: data.temperature ?? 0.8,
      nucleusSampling: data.nucleusSampling ?? 0.2,
      seed: data.seed ?? '100',
      chunkMethod: data.chunkMethod ?? "Character",
      chunkMethodValue: data.chunkMethodValue ?? 0
    };
    
    // Auto-set the chunkMethodValue based on the chunkMethod
    this.updateChunkMethodValue();
  }

  formatNumber(value: number): string {
    return value.toFixed(1);
  }
  
  // New method to update chunkMethodValue whenever chunkMethod changes
  updateChunkMethodValue(): void {
    // Set the corresponding numeric value based on the selected chunk method
    switch (this.parameters.chunkMethod) {
      case "Character":
        this.parameters.chunkMethodValue = 0;
        break;
      case "Paragraph":
        this.parameters.chunkMethodValue = 1;
        break;
      case "Token":
        this.parameters.chunkMethodValue = 2;
        break;
      default:
        this.parameters.chunkMethodValue = 0;
    }
  }
}