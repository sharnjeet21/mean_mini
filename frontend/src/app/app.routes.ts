import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AboutComponent } from './components/about/about.component';
import { ItineraryDetailComponent } from './components/itinerary-detail/itinerary-detail.component';
import { ProfileComponent } from './components/profile/profile.component';
import { AgencyWorkspaceComponent } from './components/agency-workspace/agency-workspace.component';
import { ClientDashboardComponent } from './components/client-dashboard/client-dashboard.component';
import { PublicItineraryComponent } from './components/public-itinerary/public-itinerary.component';
import { adminGuard, authGuard, guestGuard, tripManagerGuard, operationsGuard, platformGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '',          component: HomeComponent },
  { path: 'home',      component: HomeComponent },
  { path: 'about',     component: AboutComponent },
  { path: 'login',     component: LoginComponent,    canActivate: [guestGuard] },
  { path: 'register',  component: RegisterComponent, canActivate: [guestGuard] },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'workspace', redirectTo: 'agency/trips', pathMatch: 'full' },
  {
    path: 'agency',
    component: AgencyWorkspaceComponent,
    canActivate: [tripManagerGuard],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', loadComponent: () => import('./components/agency-workspace/overview/agency-overview.component').then(m => m.AgencyOverviewComponent) },
      { path: 'trips', loadComponent: () => import('./components/agency-workspace/trips/agency-trips.component').then(m => m.AgencyTripsComponent) },
      { path: 'proposals', loadComponent: () => import('./components/agency-workspace/proposals/agency-proposals.component').then(m => m.AgencyProposalsComponent) },
      { path: 'clients', loadComponent: () => import('./components/agency-workspace/clients/agency-clients.component').then(m => m.AgencyClientsComponent) },
      { path: 'analytics', loadComponent: () => import('./components/agency-workspace/analytics/agency-analytics.component').then(m => m.AgencyAnalyticsComponent) },
      { path: 'operations', loadComponent: () => import('./components/agency-workspace/operations/agency-operations.component').then(m => m.AgencyOperationsComponent), canActivate: [operationsGuard] },
      { path: 'platform', loadComponent: () => import('./components/agency-workspace/platform/agency-platform.component').then(m => m.AgencyPlatformComponent), canActivate: [platformGuard] },
    ]
  },
  { path: 'client-portal', component: ClientDashboardComponent, canActivate: [authGuard] },
  { path: 'operations', redirectTo: 'agency/operations', pathMatch: 'full' },
  { path: 'platform',   redirectTo: 'agency/platform',   pathMatch: 'full' },
  { path: 'profile',    component: ProfileComponent,        canActivate: [authGuard] },
  { path: 'itinerary/:id', component: ItineraryDetailComponent },
  // Public shareable proposal — no auth required
  { path: 'proposal/:id', component: PublicItineraryComponent },
  { path: 'admin',     redirectTo: 'agency/operations', pathMatch: 'full' },
  { path: '**',        redirectTo: '/home',       pathMatch: 'full' },
];
