import { TestBed } from '@angular/core/testing';

import { PromptManagementService } from './prompt-management.service';

describe('PromptManagementService', () => {
  let service: PromptManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PromptManagementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
