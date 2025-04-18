import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AIParametersDialogComponent } from './components/ai-parameters-dialog/ai-parameters-dialog.component';
import { AIParametersService } from './services/ai-parameters.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'regulatory-summarizer';
  
  constructor(
    private dialog: MatDialog,
    private aiParametersService: AIParametersService
  ) {}
  
  openAIParametersDialog(): void {
    const dialogRef = this.dialog.open(AIParametersDialogComponent, {
      width: '500px',
      data: this.aiParametersService.getCurrentParameters()
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.aiParametersService.updateParameters(result);
      }
    });
  }
}