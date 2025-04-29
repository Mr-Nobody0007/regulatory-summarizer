import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserQuestionInputComponent } from './user-question-input.component';

describe('UserQuestionInputComponent', () => {
  let component: UserQuestionInputComponent;
  let fixture: ComponentFixture<UserQuestionInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserQuestionInputComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserQuestionInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
