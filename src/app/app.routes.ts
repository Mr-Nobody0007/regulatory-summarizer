// src/app/app.routes-v2.ts
import { Routes } from '@angular/router';
import { AppShellComponent } from './components-2/app-shell/app-shell.component';
import { HomePageComponent } from './components-2/home-page/home-page.component';
import { ChatInterfaceComponent } from './components-2/chat-interface/chat-interface.component';
import { TextFormattingTesterComponent } from './components/text-formatting-tester.component';

export const routes: Routes = [
  {
    path:'format-test', component:TextFormattingTesterComponent
  },
  {
    path: '',
    component: AppShellComponent,
    children: [
      {
        path: '',
        component: HomePageComponent
      },
      {
        path: 'document/:id',
        component: ChatInterfaceComponent
      },
      {
        path: 'document/:id/:isUrl',
        component: ChatInterfaceComponent
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];