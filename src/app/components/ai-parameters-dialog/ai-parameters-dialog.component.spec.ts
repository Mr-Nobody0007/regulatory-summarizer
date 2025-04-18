import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiParametersDialogComponent } from './ai-parameters-dialog.component';

describe('AiParametersDialogComponent', () => {
  let component: AiParametersDialogComponent;
  let fixture: ComponentFixture<AiParametersDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiParametersDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AiParametersDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
