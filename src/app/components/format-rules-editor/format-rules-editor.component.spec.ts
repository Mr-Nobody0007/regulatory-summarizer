import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormatRulesEditorComponent } from './format-rules-editor.component';

describe('FormatRulesEditorComponent', () => {
  let component: FormatRulesEditorComponent;
  let fixture: ComponentFixture<FormatRulesEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormatRulesEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormatRulesEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
