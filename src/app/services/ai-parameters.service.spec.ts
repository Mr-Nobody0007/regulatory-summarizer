import { TestBed } from '@angular/core/testing';

import { AiParametersService } from './ai-parameters.service';

describe('AiParametersService', () => {
  let service: AiParametersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiParametersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
