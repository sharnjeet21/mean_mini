import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AboutComponent } from './components/about/about.component';
import { ItineraryDetailComponent } from './components/itinerary-detail/itinerary-detail.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { ProfileComponent } from './components/profile/profile.component';
import { adminGuard, authGuard, guestGuard, tripManagerGuard, operationsGuard, platformGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '',          component: HomeComponent },
  { path: 'home',      component: HomeComponent },
  { path: 'about',     component: AboutComponent },
  { path: 'login',     component: LoginComponent,    canActivate: [guestGuard] },
  { path: 'register',  component: RegisterComponent, canActivate: [guestGuard] },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'workspace', component: DashboardComponent, canActivate: [tripManagerGuard] },
  { path: 'operations', component: AdminDashboardComponent, canActivate: [operationsGuard] },
  { path: 'platform', component: AdminDashboardComponent, canActivate: [platformGuard] },
  { path: 'profile',   component: ProfileComponent,  canActivate: [authGuard] },
  { path: 'itinerary/:id', component: ItineraryDetailComponent },
  { path: 'admin',     redirectTo: '/operations', pathMatch: 'full' },
  { path: '**', redirectTo: '/home', pathMatch: 'full' },
];
