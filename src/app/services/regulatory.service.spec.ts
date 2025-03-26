import { TestBed } from '@angular/core/testing';

import { RegulatoryService } from './regulatory.service';

describe('RegulatoryService', () => {
  let service: RegulatoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RegulatoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
