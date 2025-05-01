// text-formatting-tester.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TextFormattingService } from '../services/text-formatting.service';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-text-formatting-tester',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule
  ],
  template: `
    <div class="tester-container">
      <h1>Text Formatting Tester</h1>
      
      <mat-card>
        <mat-card-content>
          <mat-tab-group>
            <mat-tab label="Test Formatting">
              <div class="test-container">
                <div class="input-section">
                  <h2>Input Text</h2>
                  <mat-form-field appearance="outline" class="full-width">
                    <textarea
                      matInput
                      [(ngModel)]="testText"
                      rows="15"
                      placeholder="Enter text with formatting markup to test">
                    </textarea>
                  </mat-form-field>
                  
                  <button mat-raised-button color="primary" (click)="applyFormatting()">
                    Apply Formatting
                  </button>
                  
                  <button mat-button (click)="loadSampleText()">
                    Load Sample Text
                  </button>
                </div>
                
                <div class="output-section">
                  <h2>Formatted Output</h2>
                  <div class="formatted-output" [innerHTML]="formattedText"></div>
                  
                  <h3>HTML Output</h3>
                  <pre class="html-output">{{ htmlOutput }}</pre>
                </div>
              </div>
            </mat-tab>
            
            <mat-tab label="Formatting Rules">
              <div class="rules-container">
                <h2>Explicit Formatting Rules</h2>
                <div class="rules-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Pattern</th>
                        <th>Example</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let rule of explicitRules">
                        <td>{{ rule.name }}</td>
                        <td><code>{{ rule.pattern }}</code></td>
                        <td>{{ rule.example }}</td>
                        <td>{{ rule.description }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <h2>Automatic Formatting Rules</h2>
                <div class="rules-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Pattern</th>
                        <th>Example</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let rule of automaticRules">
                        <td>{{ rule.name }}</td>
                        <td><code>{{ rule.pattern }}</code></td>
                        <td>{{ rule.example }}</td>
                        <td>{{ rule.description }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </mat-tab>
            
            <mat-tab label="Debug">
              <div class="debug-container">
                <h2>Debug Information</h2>
                
                <h3>Settings</h3>
                <pre>{{ formatSettings | json }}</pre>
                
                <h3>Rule Test Results</h3>
                <div class="test-results">
                  <div *ngFor="let result of testResults" class="test-result">
                    <div [ngClass]="{'success': result.matches, 'failure': !result.matches}">
                      <strong>{{ result.ruleName }}</strong>: 
                      {{ result.matches ? 'Matched' : 'Not matched' }}
                      <div *ngIf="result.matches">
                        Matches: <code>{{ result.matches }}</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .tester-container {
      max-width: 1200px;
      margin: 20px auto;
      padding: 0 20px;
    }
    
    .test-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 20px;
    }
    
    .full-width {
      width: 100%;
    }
    
    .formatted-output {
      padding: 15px;
      border: 1px solid #ccc;
      border-radius: 4px;
      min-height: 300px;
      max-height: 500px;
      overflow-y: auto;
      background-color: #fff;
    }
    
    .html-output {
      padding: 15px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background-color: #f5f5f5;
      max-height: 200px;
      overflow: auto;
      font-size: 12px;
    }
    
    .rules-table {
      margin-bottom: 30px;
      overflow-x: auto;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th, td {
      padding: 10px;
      border: 1px solid #ccc;
      text-align: left;
    }
    
    th {
      background-color: #f0f0f0;
    }
    
    .test-result {
      margin-bottom: 10px;
      padding: 10px;
      border-radius: 4px;
    }
    
    .success {
      background-color: #e8f5e9;
      border-left: 4px solid #4caf50;
    }
    
    .failure {
      background-color: #ffebee;
      border-left: 4px solid #f44336;
    }
  `]
})
export class TextFormattingTesterComponent implements OnInit {
  testText: string = '';
  formattedText: SafeHtml = '';
  htmlOutput: string = '';
  
  explicitRules: any[] = [];
  automaticRules: any[] = [];
  formatSettings: any = {};
  testResults: any[] = [];
  
  constructor(
    private textFormattingService: TextFormattingService,
    private sanitizer: DomSanitizer
  ) {}
  
  ngOnInit(): void {
    this.loadFormattingRules();
  }
  
  loadFormattingRules(): void {
    const rules = this.textFormattingService.getFormattingRules();
    this.explicitRules = rules.formattingRules;
    this.automaticRules = rules.automaticFormatting;
    this.formatSettings = rules.settings;
  }
  
  applyFormatting(): void {
    if (!this.testText) return;
    
    try {
      // Get formatted HTML from service
      this.formattedText = this.textFormattingService.formatText(this.testText);
      
      // For debug - get the HTML as a string
      const htmlElement = document.createElement('div');
      htmlElement.innerHTML = this.formattedText.toString();
      this.htmlOutput = htmlElement.innerHTML;
      
      // Test each rule against the input text
      this.runRuleTests();
    } catch (error) {
      console.error('Error formatting text:', error);
     
    }
  }
  
  runRuleTests(): void {
    this.testResults = [];
    
    // Test explicit rules
    this.explicitRules.forEach(rule => {
      try {
        const regex = new RegExp(rule.pattern, 'g');
        const matches = this.testText.match(regex);
        
        this.testResults.push({
          ruleName: rule.name,
          matches: matches ? matches.length : 0,
          pattern: rule.pattern
        });
      } catch (error) {
        this.testResults.push({
          ruleName: rule.name,
          matches: 0,
          
        });
      }
    });
    
    // Test automatic rules
    this.automaticRules.forEach(rule => {
      try {
        const regex = new RegExp(rule.pattern, 'gi');
        const matches = this.testText.match(regex);
        
        this.testResults.push({
          ruleName: rule.name,
          matches: matches ? matches.length : 0,
          pattern: rule.pattern
        });
      } catch (error) {
        this.testResults.push({
          ruleName: rule.name,
          matches: 0,
          
        });
      }
    });
  }
  
  loadSampleText(): void {
    this.testText = `# Formatting Rules Test Text

## Explicit Formatting Tests

**This text should be bold** using the boldImportant rule.

_This text should be italic_ using the italicEmphasis rule.

==This text should have a yellow highlight== using the highlightCritical rule.

The deadline is {date:January 15, 2026} using the dateFormatting rule.

As referenced in {cite:12 CFR 1026.43}, lenders must follow certain guidelines according to the legalCitation rule.

A {def:qualified mortgage} meets certain requirements as defined by the CFPB using the definitionTerm rule.

{warning:Failure to comply with these regulations may result in significant penalties and enforcement actions.} This should appear in a warning box.

Financial institutions must implement \`OAuth 2.0\` authentication protocols to secure their systems. This should use codeSnippet formatting.

For more detailed information, see {section:1033.5(b)} of the regulation. This section reference should be highlighted.

{reg:12 CFR Part 1033} outlines requirements for financial data rights. This should use the regulation formatting.

## Automatic Formatting Tests

The deadline for submission is December 31, 2025. This should be automatically highlighted without markup.

The regulatory fine can be up to $10,000 per violation, with some cases reaching $1.2 million in total penalties. These monetary amounts should be green.

According to recent studies, 75% of financial institutions have updated their systems to meet the new requirements. This percentage should be purple.

Financial institutions must maintain adequate capital reserves to meet the regulatory compliance standards and avoid enforcement action related to their fiduciary duty. These key terms should be underlined with dotted lines.

As described in 12 CFR 1026.43, the regulation provides clear guidelines for the industry. This CFR reference should be formatted without explicit markup.

Remember that before January 1, 2026, all institutions must complete the certification process. This deadline should be detected.`;
    
    // Apply formatting to the sample text
    this.applyFormatting();
  }
}