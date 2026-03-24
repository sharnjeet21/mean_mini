import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="container">
        <div class="row align-items-center">
          <div class="col-lg-6">
            <h1 class="display-4 fw-bold mb-4">Plan Your Perfect Trip</h1>
            <p class="lead mb-4">Create, organize and share travel itineraries easily with our comprehensive travel planning platform.</p>
            <div class="d-flex gap-3">
              <a routerLink="/register" class="btn btn-light btn-lg">
                <i class="fas fa-rocket me-2"></i>Get Started
              </a>
              <a routerLink="/dashboard" class="btn btn-outline-light btn-lg">
                <i class="fas fa-eye me-2"></i>View Itineraries
              </a>
            </div>
          </div>
          <div class="col-lg-6">
            <div class="text-center">
              <i class="fas fa-globe-americas" style="font-size: 15rem; opacity: 0.1;"></i>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-5">
      <div class="container">
        <div class="text-center mb-5">
          <h2 class="display-5 fw-bold">Main Features</h2>
          <p class="lead text-muted">Everything you need to plan amazing trips</p>
        </div>
        
        <div class="row g-4">
          <div class="col-md-4">
            <div class="card h-100 shadow-sm card-hover border-0">
              <div class="card-body text-center p-4">
                <div class="mb-3">
                  <i class="fas fa-map-marked-alt text-primary" style="font-size: 3rem;"></i>
                </div>
                <h5 class="card-title fw-bold">Create Itineraries</h5>
                <p class="card-text text-muted">Add destinations, schedules, and activities for your perfect trip with our intuitive planning tools.</p>
              </div>
            </div>
          </div>
          
          <div class="col-md-4">
            <div class="card h-100 shadow-sm card-hover border-0">
              <div class="card-body text-center p-4">
                <div class="mb-3">
                  <i class="fas fa-tasks text-success" style="font-size: 3rem;"></i>
                </div>
                <h5 class="card-title fw-bold">Manage Trips</h5>
                <p class="card-text text-muted">Edit, update, and organize all your travel plans easily with our comprehensive management system.</p>
              </div>
            </div>
          </div>
          
          <div class="col-md-4">
            <div class="card h-100 shadow-sm card-hover border-0">
              <div class="card-body text-center p-4">
                <div class="mb-3">
                  <i class="fas fa-share-alt text-info" style="font-size: 3rem;"></i>
                </div>
                <h5 class="card-title fw-bold">Share with Friends</h5>
                <p class="card-text text-muted">Collaborate and share itineraries with group members for seamless trip coordination.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="py-5 bg-light">
      <div class="container">
        <div class="text-center mb-5">
          <h2 class="display-5 fw-bold">How It Works</h2>
          <p class="lead text-muted">Simple steps to plan your dream vacation</p>
        </div>
        
        <div class="row g-4">
          <div class="col-md-4 text-center">
            <div class="mb-3">
              <div class="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" style="width: 80px; height: 80px;">
                <span class="fs-2 fw-bold">1</span>
              </div>
            </div>
            <h5 class="fw-bold">Sign Up</h5>
            <p class="text-muted">Create your account securely and start planning your adventures.</p>
          </div>
          
          <div class="col-md-4 text-center">
            <div class="mb-3">
              <div class="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center" style="width: 80px; height: 80px;">
                <span class="fs-2 fw-bold">2</span>
              </div>
            </div>
            <h5 class="fw-bold">Create Trip</h5>
            <p class="text-muted">Add destinations, activities, and create detailed daily plans.</p>
          </div>
          
          <div class="col-md-4 text-center">
            <div class="mb-3">
              <div class="bg-info text-white rounded-circle d-inline-flex align-items-center justify-content-center" style="width: 80px; height: 80px;">
                <span class="fs-2 fw-bold">3</span>
              </div>
            </div>
            <h5 class="fw-bold">Share & Enjoy</h5>
            <p class="text-muted">Share your itinerary with friends and enjoy your perfect trip.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-5 bg-primary text-white">
      <div class="container text-center">
        <h2 class="display-5 fw-bold mb-4">Ready to Start Planning?</h2>
        <p class="lead mb-4">Join thousands of travelers who trust us with their trip planning</p>
        <a routerLink="/register" class="btn btn-light btn-lg">
          <i class="fas fa-plane me-2"></i>Start Planning Now
        </a>
      </div>
    </section>
  `,
  styles: [`
    .hero-section {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 120px 0 80px;
      margin-top: 56px;
    }
    
    .card-hover {
      transition: all 0.3s ease;
    }
    
    .card-hover:hover {
      transform: translateY(-10px);
      box-shadow: 0 15px 35px rgba(0,0,0,0.1);
    }
    
    .btn:hover {
      transform: translateY(-2px);
    }
  `]
})
export class HomeComponent { }