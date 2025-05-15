// src/app/app.routes-v2.ts
import { Routes } from '@angular/router';
import { AppShellComponent } from './components-2/app-shell/app-shell.component';
import { HomePageComponent } from './components-2/home-page/home-page.component';
import { ChatInterfaceComponent } from './components-2/chat-interface/chat-interface.component';
import { TextFormattingTesterComponent } from './components/text-formatting-tester.component';
import { PromptAdminComponent } from './components-2/prompt-admin/prompt-admin.component';

export const routes: Routes = [
  {
    path:'format-test', component:TextFormattingTesterComponent
  },
  {
    path: '',
    component: AppShellComponent,
    children: [
      { 
        path: 'admin/prompts', 
        component: PromptAdminComponent,
        // You can add guards for admin authorization if needed
        // canActivate: [AdminGuard]
      },
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