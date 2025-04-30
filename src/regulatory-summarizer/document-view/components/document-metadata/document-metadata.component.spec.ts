import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentMetadataComponent } from './document-metadata.component';

describe('DocumentMetadataComponent', () => {
  let component: DocumentMetadataComponent;
  let fixture: ComponentFixture<DocumentMetadataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentMetadataComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DocumentMetadataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
