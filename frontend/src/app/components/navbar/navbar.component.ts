import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
      <div class="container">
        <a class="navbar-brand" routerLink="/">
          <i class="fas fa-map-marked-alt me-2"></i>
          Travel Itinerary Planner
        </a>
        
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav ms-auto">
            <li class="nav-item">
              <a class="nav-link" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
                <i class="fas fa-home me-1"></i>Home
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/dashboard" routerLinkActive="active">
                <i class="fas fa-tachometer-alt me-1"></i>Dashboard
              </a>
            </li>
            <li class="nav-item">
              <a class="btn btn-outline-light ms-2" routerLink="/login">
                <i class="fas fa-sign-in-alt me-1"></i>Login
              </a>
            </li>
            <li class="nav-item">
              <a class="btn btn-gradient ms-2" routerLink="/register">
                <i class="fas fa-user-plus me-1"></i>Register
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar-brand {
      font-weight: 600;
      font-size: 1.5rem;
    }
    
    .nav-link.active {
      color: #667eea !important;
      font-weight: 500;
    }
    
    .btn-gradient {
      background: linear-gradient(45deg, #667eea, #764ba2);
      border: none;
      color: white;
      transition: all 0.3s ease;
    }
    
    .btn-gradient:hover {
      background: linear-gradient(45deg, #764ba2, #667eea);
      color: white;
      transform: translateY(-1px);
    }
  `]
})
export class NavbarComponent { }