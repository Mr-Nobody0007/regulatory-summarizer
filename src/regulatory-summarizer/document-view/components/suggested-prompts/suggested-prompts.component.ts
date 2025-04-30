// suggested-prompts.component.ts - Component for displaying suggested prompts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// Material imports
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

// Models
import { Prompt } from '../../../models/prompt.model';

@Component({
  selector: 'app-suggested-prompts',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './suggested-prompts.component.html'
})
export class SuggestedPromptsComponent {
  @Input() prompts: Prompt[] = [];
  @Output() promptSelected = new EventEmitter<Prompt>();
  
  // Control variables
  initialPromptCount = 4;
  showAllPrompts = false;
  
  /**
   * Get the prompts to display based on showAllPrompts state
   */
  get visiblePrompts(): Prompt[] {
    if (this.showAllPrompts) {
      return this.prompts;
    } else {
      return this.prompts.slice(0, this.initialPromptCount);
    }
  }
  
  /**
   * Toggle between showing all prompts and just the initial set
   */
  toggleShowAllPrompts(): void {
    this.showAllPrompts = !this.showAllPrompts;
  }
  
  /**
   * Select a prompt and emit the event
   */
  selectPrompt(prompt: Prompt): void {
    this.promptSelected.emit(prompt);
  }
}