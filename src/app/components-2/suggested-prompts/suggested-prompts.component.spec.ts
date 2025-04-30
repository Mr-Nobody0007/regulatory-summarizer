import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuggestedPromptsComponent } from './suggested-prompts.component';

describe('SuggestedPromptsComponent', () => {
  let component: SuggestedPromptsComponent;
  let fixture: ComponentFixture<SuggestedPromptsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuggestedPromptsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuggestedPromptsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
