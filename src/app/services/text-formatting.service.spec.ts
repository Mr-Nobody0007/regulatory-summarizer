import { TestBed } from '@angular/core/testing';

import { TextFormattingService } from './text-formatting.service';

describe('TextFormattingService', () => {
  let service: TextFormattingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TextFormattingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
