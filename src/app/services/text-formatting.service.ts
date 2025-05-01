// src/app/services/text-formatting.service.ts
import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, tap } from 'rxjs';

// Define interfaces for the formatting rules
export interface FormattingStyle {
  [key: string]: string;
}

export interface FormattingEffect {
  type: string;
  style: FormattingStyle;
  tooltip?: boolean;
}

export interface FormattingRule {
  name: string;
  description: string;
  example: string;
  pattern: string;
  effect: FormattingEffect;
}

export interface FormattingConfig {
  formattingRules: FormattingRule[];
  automaticFormatting: FormattingRule[];
  settings: {
    enabled: boolean;
    allowNestedFormatting: boolean;
    preserveOriginalMarkers: boolean;
  };
}

/**
 * The TextFormattingService applies custom styling to text based on regex patterns
 * defined in a JSON configuration file. This allows for highlighting important
 * information, dates, citations, etc. in AI responses.
 */
@Injectable({
  providedIn: 'root'
})
export class TextFormattingService {
  // Default formatting rules - used as fallback if loading from file fails
  private formattingRules: FormattingConfig = {
    "formattingRules": [
      {
        "name": "boldImportant",
        "description": "Makes text bold",
        "example": "Text with **bold words** in it",
        "pattern": "\\*\\*(.*?)\\*\\*",
        "effect": {
          "type": "bold",
          "style": {
            "fontWeight": "700"
          }
        }
      },
      {
        "name": "italicEmphasis",
        "description": "Makes text italic",
        "example": "Text with _italicized words_ in it",
        "pattern": "_(.*?)_",
        "effect": {
          "type": "italic",
          "style": {
            "fontStyle": "italic"
          }
        }
      },
      {
        "name": "highlightCritical",
        "description": "Highlights text with yellow background",
        "example": "Text with ==highlighted words== in it",
        "pattern": "==(.*?)==",
        "effect": {
          "type": "highlight",
          "style": {
            "backgroundColor": "#FFEB3B",
            "padding": "0 4px",
            "borderRadius": "2px"
          }
        }
      },
      {
        "name": "dateFormatting",
        "description": "Makes dates blue and bold",
        "example": "The deadline is {date:January 15, 2026}",
        "pattern": "\\{date:(.*?)\\}",
        "effect": {
          "type": "styled",
          "style": {
            "color": "#1976D2",
            "fontWeight": "500"
          }
        }
      },
      {
        "name": "legalCitation",
        "description": "Styles citations in legal format",
        "example": "As stated in {cite:Regulation Z, Section 1026.43}",
        "pattern": "\\{cite:(.*?)\\}",
        "effect": {
          "type": "citation",
          "style": {
            "fontFamily": "Georgia, serif",
            "color": "#004D40",
            "fontStyle": "italic",
            "textDecoration": "underline"
          }
        }
      },
      {
        "name": "definitionTerm",
        "description": "Formats defined terms with dotted underline",
        "example": "The {def:qualified mortgage} requirements apply to all lenders",
        "pattern": "\\{def:(.*?)\\}",
        "effect": {
          "type": "definition",
          "style": {
            "fontWeight": "bold",
            "borderBottom": "1px dotted #333",
            "cursor": "help"
          }
        }
      },
      {
        "name": "warningText",
        "description": "Creates warning boxes with red border",
        "example": "{warning:Failure to comply may result in penalties}",
        "pattern": "\\{warning:(.*?)\\}",
        "effect": {
          "type": "warning",
          "style": {
            "backgroundColor": "#FFCCBC",
            "color": "#D84315",
            "padding": "2px 6px",
            "borderLeft": "3px solid #D84315",
            "borderRadius": "2px"
          }
        }
      },
      {
        "name": "codeSnippet",
        "description": "Formats technical terms with code styling",
        "example": "Use the `OAuth 2.0` protocol for authentication",
        "pattern": "`(.*?)`",
        "effect": {
          "type": "code",
          "style": {
            "fontFamily": "monospace",
            "backgroundColor": "#F5F5F5",
            "padding": "2px 4px",
            "borderRadius": "3px"
          }
        }
      },
      {
        "name": "section",
        "description": "Highlights section references in blue",
        "example": "See {section:1033.5(b)} for technical requirements",
        "pattern": "\\{section:(.*?)\\}",
        "effect": {
          "type": "section",
          "style": {
            "fontWeight": "600",
            "color": "#0D47A1"
          }
        }
      },
      {
        "name": "regulation",
        "description": "Formats regulation references in serif font",
        "example": "{reg:12 CFR Part 1033} requires data sharing capabilities",
        "pattern": "\\{reg:(.*?)\\}",
        "effect": {
          "type": "regulation",
          "style": {
            "fontFamily": "Georgia, serif",
            "fontWeight": "500",
            "letterSpacing": "0.5px"
          }
        }
      }
    ],
    "automaticFormatting": [
      {
        "name": "deadlineHighlight",
        "description": "Automatically highlights deadline phrases",
        "example": "The deadline is January 15, 2026",
        "pattern": "(?i)(deadline|due date|by|before)\\s+([A-Za-z]+ \\d{1,2},? \\d{4}|\\d{1,2}/\\d{1,2}/\\d{2,4})",
        "effect": {
          "type": "deadline",
          "style": {
            "backgroundColor": "#FFD180",
            "fontWeight": "bold",
            "padding": "0 4px",
            "borderRadius": "2px"
          }
        }
      },
      {
        "name": "monetaryAmount",
        "description": "Makes dollar amounts green",
        "example": "The penalty is $10,000 per violation",
        "pattern": "\\$[\\d,]+(\\.[\\d]{2})?( ?million| ?billion)?",
        "effect": {
          "type": "money",
          "style": {
            "color": "#2E7D32",
            "fontWeight": "500"
          }
        }
      },
      {
        "name": "percentageHighlight",
        "description": "Makes percentages purple",
        "example": "A 75% reduction in costs is expected",
        "pattern": "\\d+(\\.\\d+)?\\s*%",
        "effect": {
          "type": "percentage",
          "style": {
            "color": "#7B1FA2",
            "fontWeight": "500"
          }
        }
      },
      {
        "name": "keyTerms",
        "description": "Highlights industry-specific key terms",
        "example": "Financial institutions must maintain adequate capital reserves",
        "pattern": "(?i)(financial institution|capital reserves|regulatory compliance|fiduciary duty|enforcement action)",
        "effect": {
          "type": "keyterm",
          "style": {
            "textDecoration": "underline",
            "textDecorationStyle": "dotted",
            "textDecorationColor": "#0D47A1"
          }
        }
      },
      {
        "name": "cfr",
        "description": "Automatically formats CFR references",
        "example": "As described in 12 CFR 1026.43",
        "pattern": "(\\d+)\\s*CFR\\s*(\\d+\\.?\\d*)",
        "effect": {
          "type": "cfr",
          "style": {
            "fontFamily": "Georgia, serif",
            "color": "#004D40",
            "fontWeight": "500"
          }
        }
      }
    ],
    "settings": {
      "enabled": true,
      "allowNestedFormatting": true,
      "preserveOriginalMarkers": false
    }
  };
  
  constructor(
    private sanitizer: DomSanitizer,
    private http: HttpClient
  ) {
    // Try to load the formatting rules from a JSON file on initialization
    this.loadFormattingRules();
  }
  
  /**
   * Format text according to the formatting rules
   * @param text The text to format
   * @returns Safely formatted HTML
   */
  formatText(text: string): SafeHtml {
    if (!text || !this.formattingRules.settings.enabled) {
      return this.sanitizer.bypassSecurityTrustHtml(text || '');
    }
    
    let formattedText = text;
    
    // Apply explicit formatting rules (user-defined markup)
    this.formattingRules.formattingRules.forEach(rule => {
      const regex = new RegExp(rule.pattern, 'g');
      
      formattedText = formattedText.replace(regex, (match, content) => {
        // Create a styled span with the appropriate styling
        const styles = Object.entries(rule.effect.style)
          .map(([property, value]) => `${property}:${value}`)
          .join(';');
        
        return `<span class="formatted-text ${rule.effect.type}" style="${styles}" 
                title="${rule.description}">${content}</span>`;
      });
    });
    
    // Apply automatic formatting rules
    this.formattingRules.automaticFormatting.forEach(rule => {
      const regex = new RegExp(rule.pattern, 'g');
      
      formattedText = formattedText.replace(regex, (match) => {
        // Create a styled span with the appropriate styling
        const styles = Object.entries(rule.effect.style)
          .map(([property, value]) => `${property}:${value}`)
          .join(';');
        
        return `<span class="formatted-text ${rule.effect.type}" style="${styles}" 
                title="${rule.description}">${match}</span>`;
      });
    });
    
    // Return as SafeHtml to bypass Angular's sanitization
    return this.sanitizer.bypassSecurityTrustHtml(formattedText);
  }
  
  /**
   * Load formatting rules from an external JSON file
   * @param filePath Path to the JSON file containing formatting rules
   * @returns Observable of the formatting rules
   */
  loadFormattingRules(filePath: string = 'assets/formatting-rules.json'): Observable<FormattingConfig> {
    return this.http.get<FormattingConfig>(filePath).pipe(
      tap(rules => {
        console.log('Successfully loaded formatting rules from:', filePath);
        this.formattingRules = rules;
      }),
      catchError(error => {
        console.error('Error loading formatting rules from file:', error);
        console.log('Using default formatting rules instead');
        // Just return the default rules if loading fails
        return of(this.formattingRules);
      })
    );
  }
  
  /**
   * Update a single rule in the formatting configuration
   * @param ruleType Type of rule ('formattingRules' or 'automaticFormatting')
   * @param ruleName Name of the rule to update
   * @param updatedRule The updated rule
   * @returns True if the rule was found and updated, false otherwise
   */
  updateRule(ruleType: 'formattingRules' | 'automaticFormatting', ruleName: string, updatedRule: FormattingRule): boolean {
    const rules = this.formattingRules[ruleType];
    const index = rules.findIndex(rule => rule.name === ruleName);
    
    if (index !== -1) {
      rules[index] = updatedRule;
      return true;
    }
    
    return false;
  }
  
  /**
   * Add a new rule to the formatting configuration
   * @param ruleType Type of rule ('formattingRules' or 'automaticFormatting')
   * @param newRule The new rule to add
   */
  addRule(ruleType: 'formattingRules' | 'automaticFormatting', newRule: FormattingRule): void {
    // Check if a rule with this name already exists
    const existingRule = this.formattingRules[ruleType].find(rule => rule.name === newRule.name);
    
    if (!existingRule) {
      this.formattingRules[ruleType].push(newRule);
    } else {
      console.warn(`Rule with name '${newRule.name}' already exists in ${ruleType}`);
    }
  }
  
  /**
   * Remove a rule from the formatting configuration
   * @param ruleType Type of rule ('formattingRules' or 'automaticFormatting')
   * @param ruleName Name of the rule to remove
   * @returns True if the rule was found and removed, false otherwise
   */
  removeRule(ruleType: 'formattingRules' | 'automaticFormatting', ruleName: string): boolean {
    const rules = this.formattingRules[ruleType];
    const index = rules.findIndex(rule => rule.name === ruleName);
    
    if (index !== -1) {
      rules.splice(index, 1);
      return true;
    }
    
    return false;
  }
  
  /**
   * Get the current formatting rules configuration
   * @returns The current formatting rules
   */
  getFormattingRules(): FormattingConfig {
    return this.formattingRules;
  }
  
  /**
   * Update all formatting settings
   * @param settings New settings to apply
   */
  updateSettings(settings: { enabled: boolean; allowNestedFormatting: boolean; preserveOriginalMarkers: boolean }): void {
    this.formattingRules.settings = settings;
  }
  
  /**
   * Save the current formatting rules to local storage
   * This can be used as a backup or for user customizations
   */
  saveToLocalStorage(): void {
    try {
      localStorage.setItem('formatting-rules', JSON.stringify(this.formattingRules));
      console.log('Successfully saved formatting rules to local storage');
    } catch (error) {
      console.error('Error saving formatting rules to local storage:', error);
    }
  }
  
  /**
   * Load formatting rules from local storage
   * @returns True if rules were successfully loaded, false otherwise
   */
  loadFromLocalStorage(): boolean {
    try {
      const savedRules = localStorage.getItem('formatting-rules');
      if (savedRules) {
        this.formattingRules = JSON.parse(savedRules);
        console.log('Successfully loaded formatting rules from local storage');
        return true;
      }
    } catch (error) {
      console.error('Error loading formatting rules from local storage:', error);
    }
    
    return false;
  }
  
  /**
   * Reset to default formatting rules
   */
  resetToDefaults(): void {
    this.loadFormattingRules().subscribe();
  }
  
  /**
   * Toggle the enabled state of the formatting service
   * @returns The new enabled state
   */
  toggleEnabled(): boolean {
    this.formattingRules.settings.enabled = !this.formattingRules.settings.enabled;
    return this.formattingRules.settings.enabled;
  }
}