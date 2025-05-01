// src/app/components/format-rules-editor/format-rules-editor.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { TextFormattingService, FormattingRule, FormattingConfig } from '../../services/text-formatting.service';

@Component({
  selector: 'app-format-rules-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatCardModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatExpansionModule,
    MatChipsModule
  ],
  templateUrl: './format-rules-editor.component.html',
  styleUrls: ['./format-rules-editor.component.scss']
})
export class FormatRulesEditorComponent implements OnInit {
  settingsForm!: FormGroup;
  rulesForm!: FormGroup;
  autoRulesForm!: FormGroup;
  previewText: string = 'This text will show formatting examples: **bold text**, _italic text_, {date:January 15, 2026}, {cite:12 CFR 1026.43}, {warning:This is a warning!}, `code snippet`, {def:qualified mortgage}, ==highlighted text==, {section:1033.5(b)}, {reg:12 CFR Part 1033}, $10,000, 75% percent.';
  formattedPreview: string = '';
  
  // Test samples for different rule patterns
  testSamples: { [key: string]: string } = {
    'boldImportant': 'This is **important text** to emphasize.',
    'italicEmphasis': 'This is _emphasized text_ for clarity.',
    'highlightCritical': 'This is ==critical information== to note.',
    'dateFormatting': 'The deadline is {date:January 15, 2026}.',
    'legalCitation': 'As referenced in {cite:12 CFR 1026.43}.',
    'definitionTerm': 'A {def:qualified mortgage} meets certain requirements.',
    'warningText': '{warning:Failure to comply may result in penalties.}',
    'codeSnippet': 'Use the `OAuth 2.0` authentication protocol.',
    'section': 'See {section:1033.5(b)} for details.',
    'regulation': '{reg:12 CFR Part 1033} outlines requirements.',
    'monetaryAmount': 'The fine is $10,000 per violation.',
    'percentageHighlight': 'This represents a 75% increase from last year.'
  };
  
  constructor(
    private fb: FormBuilder,
    private textFormattingService: TextFormattingService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}
  
  ngOnInit(): void {
    this.initForms();
    this.updatePreview();
  }
  
  /**
   * Initialize all forms with current formatting rules
   */
  initForms(): void {
    const rules = this.textFormattingService.getFormattingRules();
    
    // Settings form
    this.settingsForm = this.fb.group({
      enabled: [rules.settings.enabled],
      allowNestedFormatting: [rules.settings.allowNestedFormatting],
      preserveOriginalMarkers: [rules.settings.preserveOriginalMarkers]
    });
    
    // Explicit formatting rules form
    this.rulesForm = this.fb.group({
      rules: this.fb.array([])
    });
    
    // Automatic formatting rules form
    this.autoRulesForm = this.fb.group({
      rules: this.fb.array([])
    });
    
    // Add each explicit formatting rule
    rules.formattingRules.forEach(rule => {
      this.addRuleToForm(rule, false);
    });
    
    // Add each automatic formatting rule
    rules.automaticFormatting.forEach(rule => {
      this.addRuleToForm(rule, true);
    });
    
    // Subscribe to form changes to update preview
    this.settingsForm.valueChanges.subscribe(() => this.updatePreview());
    this.rulesForm.valueChanges.subscribe(() => this.updatePreview());
    this.autoRulesForm.valueChanges.subscribe(() => this.updatePreview());
  }
  
  /**
   * Get form array for rules (either explicit or automatic)
   */
  getRulesFormArray(isAutoRule: boolean): FormArray {
    return isAutoRule 
      ? this.autoRulesForm.get('rules') as FormArray 
      : this.rulesForm.get('rules') as FormArray;
  }
  
  /**
   * Add a rule to the appropriate form (explicit or automatic)
   */
  addRuleToForm(rule: FormattingRule, isAutoRule: boolean): void {
    const rulesArray = this.getRulesFormArray(isAutoRule);
    
    // Create form group for rule styles
    const styleControls: {[key: string]: any} = {};
    Object.entries(rule.effect.style).forEach(([key, value]) => {
      styleControls[key] = [value, Validators.required];
    });
    
    const styleForm = this.fb.group(styleControls);
    
    // Create the rule form group
    const ruleForm = this.fb.group({
      name: [rule.name, Validators.required],
      description: [rule.description, Validators.required],
      example: [rule.example, Validators.required],
      pattern: [rule.pattern, Validators.required],
      effect: this.fb.group({
        type: [rule.effect.type, Validators.required],
        style: styleForm,
        tooltip: [rule.effect.tooltip || false]
      })
    });
    
    rulesArray.push(ruleForm);
  }
  
  /**
   * Create a new empty rule
   */
  createNewRule(isAutoRule: boolean): void {
    const newRule: FormattingRule = {
      name: `new_rule_${Date.now()}`,
      description: 'New formatting rule',
      example: 'Example text',
      pattern: '\\{new:(.*?)\\}',
      effect: {
        type: 'custom',
        style: {
          'color': '#0000FF',
          'fontWeight': '500'
        }
      }
    };
    
    this.addRuleToForm(newRule, isAutoRule);
    this.showSnackBar('New rule added');
  }
  
  /**
   * Remove a rule from the form
   */
  removeRule(index: number, isAutoRule: boolean): void {
    const rulesArray = this.getRulesFormArray(isAutoRule);
    rulesArray.removeAt(index);
    this.showSnackBar('Rule removed');
  }
  
  /**
   * Add a new style property to a rule
   */
  addStyleProperty(ruleIndex: number, isAutoRule: boolean): void {
    const rulesArray = this.getRulesFormArray(isAutoRule);
    const rule = rulesArray.at(ruleIndex) as FormGroup;
    const effect = rule.get('effect') as FormGroup;
    const style = effect.get('style') as FormGroup;
    
    // Add a new property to the style form group
    style.addControl(`property_${Date.now()}`, this.fb.control('value', Validators.required));
    this.showSnackBar('Style property added');
  }
  
  /**
   * Remove a style property from a rule
   */
  removeStyleProperty(ruleIndex: number, propertyName: string, isAutoRule: boolean): void {
    const rulesArray = this.getRulesFormArray(isAutoRule);
    const rule = rulesArray.at(ruleIndex) as FormGroup;
    const effect = rule.get('effect') as FormGroup;
    const style = effect.get('style') as FormGroup;
    
    style.removeControl(propertyName);
    this.showSnackBar('Style property removed');
  }
  
  /**
   * Update the preview text with current formatting rules
   */
  updatePreview(): void {
    // Create a temporary config with the current form values
    const config: FormattingConfig = {
      formattingRules: this.getFormattedRulesFromForm(false),
      automaticFormatting: this.getFormattedRulesFromForm(true),
      settings: this.settingsForm.value
    };
    
    // Use the service to format the preview text
    try {
      // We can't directly use the service's formatText method because it returns SafeHtml
      // Instead, we'd need to create a temporary implementation or display it in an iframe
      this.formattedPreview = 'Preview will be shown when implemented';
    } catch (error) {
      console.error('Error formatting preview:', error);
      this.formattedPreview = 'Error formatting preview';
    }
  }
  
  /**
   * Get formatted rules from the form
   */
  getFormattedRulesFromForm(isAutoRule: boolean): FormattingRule[] {
    const rulesArray = this.getRulesFormArray(isAutoRule);
    const rules: FormattingRule[] = [];
    
    for (let i = 0; i < rulesArray.length; i++) {
      const ruleForm = rulesArray.at(i) as FormGroup;
      
      // Extract style properties
      const effectForm = ruleForm.get('effect') as FormGroup;
      const styleForm = effectForm.get('style') as FormGroup;
      const styleControls = styleForm.controls;
      
      const style: {[key: string]: string} = {};
      Object.keys(styleControls).forEach(key => {
        style[key] = styleControls[key].value;
      });
      
      // Create the rule object
      const rule: FormattingRule = {
        name: ruleForm.get('name')?.value,
        description: ruleForm.get('description')?.value,
        example: ruleForm.get('example')?.value,
        pattern: ruleForm.get('pattern')?.value,
        effect: {
          type: effectForm.get('type')?.value,
          style: style,
          tooltip: effectForm.get('tooltip')?.value
        }
      };
      
      rules.push(rule);
    }
    
    return rules;
  }
  
  /**
   * Save all changes to the formatting service
   */
  saveChanges(): void {
    try {
      // Update settings
      this.textFormattingService.updateSettings(this.settingsForm.value);
      
      // Update explicit formatting rules
      const explicitRules = this.getFormattedRulesFromForm(false);
      const autoRules = this.getFormattedRulesFromForm(true);
      
      // Create a new config
      const newConfig: FormattingConfig = {
        formattingRules: explicitRules,
        automaticFormatting: autoRules,
        settings: this.settingsForm.value
      };
      
      // Save to local storage (if we had a proper backend API, we would save there)
      localStorage.setItem('formatting-rules', JSON.stringify(newConfig));
      
      this.showSnackBar('Changes saved successfully');
    } catch (error) {
      console.error('Error saving changes:', error);
      this.showSnackBar('Error saving changes', true);
    }
  }
  
  /**
   * Reset all rules to defaults
   */
  resetToDefaults(): void {
    if (confirm('Are you sure you want to reset all formatting rules to defaults? All customizations will be lost.')) {
      this.textFormattingService.resetToDefaults();
      this.initForms();
      this.showSnackBar('Rules reset to defaults');
    }
  }
  
  /**
   * Export rules as JSON
   */
  exportRules(): void {
    try {
      const config: FormattingConfig = {
        formattingRules: this.getFormattedRulesFromForm(false),
        automaticFormatting: this.getFormattedRulesFromForm(true),
        settings: this.settingsForm.value
      };
      
      const json = JSON.stringify(config, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'formatting-rules.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showSnackBar('Rules exported successfully');
    } catch (error) {
      console.error('Error exporting rules:', error);
      this.showSnackBar('Error exporting rules', true);
    }
  }
  
  /**
   * Import rules from JSON file
   */
  importRules(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const json = e.target?.result as string;
        const config = JSON.parse(json) as FormattingConfig;
        
        // Validate the imported config
        if (!config.formattingRules || !config.automaticFormatting || !config.settings) {
          throw new Error('Invalid JSON format');
        }
        
        // Save to local storage and reload
        localStorage.setItem('formatting-rules', json);
        this.initForms();
        this.showSnackBar('Rules imported successfully');
      } catch (error) {
        console.error('Error importing rules:', error);
        this.showSnackBar('Error importing rules: Invalid JSON format', true);
      }
    };
    
    reader.readAsText(file);
    
    // Reset the input value so the same file can be selected again
    input.value = '';
  }
  
  /**
   * Test a specific rule
   */
  testRule(ruleName: string): void {
    // Use the sample text for this rule
    const sampleText = this.testSamples[ruleName] || `Test text for ${ruleName}`;
    
    // TODO: Implement rule testing and display the result
    console.log(`Testing rule ${ruleName} with sample: ${sampleText}`);
  }
  
  /**
   * Show a snackbar message
   */
  private showSnackBar(message: string, isError: boolean = false): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: isError ? ['error-snackbar'] : ['success-snackbar']
    });
  }
}