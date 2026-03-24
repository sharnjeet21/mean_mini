import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AboutComponent } from './components/about/about.component';
import { ItineraryDetailComponent } from './components/itinerary-detail/itinerary-detail.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '',          component: HomeComponent },
  { path: 'home',      component: HomeComponent },
  { path: 'about',     component: AboutComponent },
  { path: 'login',     component: LoginComponent },
  { path: 'register',  component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'itinerary/:id', component: ItineraryDetailComponent, canActivate: [authGuard] },
  { path: 'admin',     component: AdminDashboardComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '/home', pathMatch: 'full' },
];
