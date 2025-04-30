import { TestBed } from '@angular/core/testing';

import { AiInteractionService } from './ai-interaction.service';

describe('AiInteractionServiceTsService', () => {
  let service: AiInteractionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiInteractionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
