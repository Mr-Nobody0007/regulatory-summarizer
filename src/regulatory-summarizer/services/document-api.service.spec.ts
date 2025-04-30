import { TestBed } from '@angular/core/testing';

import { DocumentApiService } from './document-api.service';

describe('DocumentApiService', () => {
  let service: DocumentApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DocumentApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
