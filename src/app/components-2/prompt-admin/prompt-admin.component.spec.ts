import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PromptAdminComponent } from './prompt-admin.component';

describe('PromptAdminComponent', () => {
  let component: PromptAdminComponent;
  let fixture: ComponentFixture<PromptAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PromptAdminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PromptAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
