import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './components/home/home.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'login', component: HomeComponent },
  { path: 'dashboard', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'users', loadChildren: () => import('./modules/users/users.module').then((u) => u.UsersModule) },
  { path: 'profiles', loadChildren: () => import('./modules/profile/profile.module').then((p) => p.ProfileModule) },
  { path: 'missions', loadChildren: () => import('./modules/mission/mission.module').then((m) => m.MissionModule) },
  { path: 'contrats', loadChildren: () => import('./modules/contrat/contrat.module').then((c) => c.ContratModule) },
  { path: 'reviews', loadChildren: () => import('./modules/review/review.module').then((r) => r.ReviewModule) },
  { path: 'chats', loadChildren: () => import('./modules/chat/chat.module').then((ch) => ch.ChatModule) },
  { path: '**', redirectTo: 'home' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
