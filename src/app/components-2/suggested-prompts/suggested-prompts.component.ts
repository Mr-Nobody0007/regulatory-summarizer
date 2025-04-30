// src/app/components-2/suggested-prompts/suggested-prompts.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { Prompt } from '../../services/prompt.service';

interface PromptGroup {
  purpose: string;
  prompts: Prompt[];
  expanded: boolean;
}

@Component({
  selector: 'app-suggested-prompts',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule
  ],
  templateUrl: './suggested-prompts.component.html',
  styleUrls: ['./suggested-prompts.component.scss']
})
export class SuggestedPromptsComponent {
  @Input() prompts: Prompt[] = [];
  @Output() promptSelected = new EventEmitter<Prompt>();
  
  promptGroups: PromptGroup[] = [];
  showAllPrompts: boolean = false;
  initialPromptCount: number = 4;
  
  ngOnChanges() {
    if (this.prompts && this.prompts.length > 0) {
      this.groupPromptsByPurpose();
    }
  }
  
  /**
   * Group prompts by their purpose
   */
  private groupPromptsByPurpose(): void {
    // Reset groups
    this.promptGroups = [];
    
    // Get unique purposes
    const purposes = [...new Set(this.prompts.map(p => p.purpose))];
    
    // Create groups
    this.promptGroups = purposes.map(purpose => ({
      purpose,
      prompts: this.prompts.filter(p => p.purpose === purpose),
      expanded: false
    }));
  }
  
  /**
   * Toggle expansion state of a prompt group
   */
  toggleGroup(group: PromptGroup, event: Event): void {
    event.stopPropagation(); // Prevent selecting the prompt
    group.expanded = !group.expanded;
  }
  
  /**
   * Toggle showing all prompts vs. limited set
   */
  toggleShowAllPrompts(): void {
    this.showAllPrompts = !this.showAllPrompts;
  }
  
  /**
   * Select a prompt and emit event to parent
   */
  selectPrompt(prompt: Prompt): void {
    this.promptSelected.emit(prompt);
  }
  
  /**
   * Get visible prompts based on show all toggle
   */
  get visiblePromptGroups(): PromptGroup[] {
    if (this.showAllPrompts) {
      return this.promptGroups;
    } else {
      // If we have few groups, show them all but limit prompts in each
      if (this.promptGroups.length <= 2) {
        return this.promptGroups;
      }
      // Otherwise limit the number of groups
      return this.promptGroups.slice(0, 2);
    }
  }
  
  /**
   * Check if we should show the "more suggestions" button
   */
  get shouldShowMoreButton(): boolean {
    return this.promptGroups.length > 2 || 
           this.prompts.length > this.initialPromptCount;
  }
}