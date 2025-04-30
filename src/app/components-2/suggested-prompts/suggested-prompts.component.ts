import { Component, Input, Output, EventEmitter, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Prompt } from '../../services/prompt.service';

@Component({
  selector: 'app-suggested-prompts',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './suggested-prompts.component.html',
  styleUrls: ['./suggested-prompts.component.scss']
})
export class SuggestedPromptsComponent implements AfterViewInit {
  @Input() prompts: Prompt[] = [];
  @Output() promptSelected = new EventEmitter<Prompt>();
  @ViewChild('promptsList') promptsListElement?: ElementRef;
  
  visiblePrompts: Prompt[] = [];
  
  // Track which prompts are expanded
  expandedPromptIds: Set<string> = new Set();
  
  ngOnChanges() {
    if (this.prompts && this.prompts.length > 0) {
      // Show all prompts by default
      this.visiblePrompts = this.prompts;
    }
  }
  
  ngAfterViewInit() {
    // Force scrollbar visibility check after view init
    setTimeout(() => {
      this.checkScroll();
    }, 100);
  }
  
  /**
   * Toggle expansion state of a prompt
   */
  togglePromptExpansion(prompt: Prompt): void {
    // Create a unique ID for the prompt based on label
    const promptId = this.getPromptId(prompt);
    
    if (this.expandedPromptIds.has(promptId)) {
      this.expandedPromptIds.delete(promptId);
    } else {
      this.expandedPromptIds.add(promptId);
    }
    
    // Check scroll state after expansion/collapse
    setTimeout(() => {
      this.checkScroll();
    }, 300); // Wait for animation to complete
  }
  
  /**
   * Ensure proper scrolling after expansion
   */
  private checkScroll(): void {
    if (this.promptsListElement) {
      const element = this.promptsListElement.nativeElement;
      // Force a reflow to ensure scrollbar visibility is up-to-date
      element.style.overflow = 'hidden';
      setTimeout(() => {
        element.style.overflow = 'auto';
      }, 0);
    }
  }
  
  /**
   * Check if a prompt is expanded
   */
  isPromptExpanded(prompt: Prompt): boolean {
    return this.expandedPromptIds.has(this.getPromptId(prompt));
  }
  
  /**
   * Generate a unique ID for a prompt
   */
  private getPromptId(prompt: Prompt): string {
    return `${prompt.purpose}-${prompt.label}`;
  }
  
  /**
   * Select a prompt and emit event to parent
   */
  selectPrompt(prompt: Prompt): void {
    this.promptSelected.emit(prompt);
  }
}