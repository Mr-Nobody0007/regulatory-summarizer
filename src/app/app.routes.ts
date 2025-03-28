import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { DocumentSummaryComponent } from './components/document-summary/document-summary.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'document/:id',
    component: DocumentSummaryComponent
  },
  {
    path: 'document/:id/:isUrl',
    component: DocumentSummaryComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];