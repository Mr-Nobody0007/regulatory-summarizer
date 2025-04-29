import { Routes } from '@angular/router';
import { HomeComponent } from './components/regulatory-summarizer/document-view/components/home/home.component';
import { DocumentViewComponent } from './components/regulatory-summarizer/document-view/document-view.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'document/:id',
    component: DocumentViewComponent
  },
  {
    path: 'document/:id/:isUrl',
    component: DocumentViewComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];