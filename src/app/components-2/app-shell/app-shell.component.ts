// src/app/components-2/app-shell/app-shell.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AIParametersService } from '../../services/ai-parameters.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss']
})
export class AppShellComponent {
  title = 'regulatory-summarizer';
  
  constructor(
    private dialog: MatDialog,
    private aiParametersService: AIParametersService
  ) {}
  
  openAIParametersDialog(): void {
    // We'll maintain the same AI parameters dialog functionality
    // but will import the dialog component when implementing this method
    console.log('Opening AI parameters dialog');
  }
}