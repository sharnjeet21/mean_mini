import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService, Itinerary } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-container">
      <div class="container">
        <!-- Header Section -->
        <div class="row mb-5">
          <div class="col-12">
            <div class="bg-gradient text-white rounded-4 p-5">
              <div class="row align-items-center">
                <div class="col-md-8">
                  <h1 class="display-5 fw-bold mb-3">Travel Dashboard</h1>
                  <p class="lead mb-0">Discover amazing travel itineraries and plan your next adventure</p>
                </div>
                <div class="col-md-4 text-end">
                  <i class="fas fa-compass" style="font-size: 5rem; opacity: 0.3;"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="row g-4 mb-5">
          <div class="col-md-3">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body text-center">
                <i class="fas fa-map-marked-alt text-primary mb-3" style="font-size: 2.5rem;"></i>
                <h3 class="fw-bold">{{ itineraries.length }}</h3>
                <p class="text-muted mb-0">Available Itineraries</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body text-center">
                <i class="fas fa-globe-americas text-success mb-3" style="font-size: 2.5rem;"></i>
                <h3 class="fw-bold">{{ getUniqueDestinations() }}</h3>
                <p class="text-muted mb-0">Destinations</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body text-center">
                <i class="fas fa-calendar-alt text-info mb-3" style="font-size: 2.5rem;"></i>
                <h3 class="fw-bold">{{ getAverageDuration() }}</h3>
                <p class="text-muted mb-0">Avg Duration</p>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-body text-center">
                <i class="fas fa-dollar-sign text-warning mb-3" style="font-size: 2.5rem;"></i>
                <h3 class="fw-bold">\${{ getAverageBudget() }}</h3>
                <p class="text-muted mb-0">Avg Budget</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Itineraries Grid -->
        <div class="row">
          <div class="col-12">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h2 class="fw-bold">Featured Itineraries</h2>
              <div class="btn-group" role="group">
                <button type="button" class="btn btn-outline-primary active">All</button>
                <button type="button" class="btn btn-outline-primary">Popular</button>
                <button type="button" class="btn btn-outline-primary">Recent</button>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-4" *ngIf="itineraries.length > 0; else noItineraries">
          <div class="col-lg-4 col-md-6" *ngFor="let itinerary of itineraries">
            <div class="card border-0 shadow-sm h-100 itinerary-card">
              <div class="card-header bg-transparent border-0 p-4">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <h5 class="card-title fw-bold mb-1">{{ itinerary.title }}</h5>
                    <p class="text-muted mb-0">
                      <i class="fas fa-map-marker-alt me-1"></i>{{ itinerary.destination }}
                    </p>
                  </div>
                  <span class="badge bg-primary rounded-pill">{{ itinerary.duration }}</span>
                </div>
              </div>
              
              <div class="card-body pt-0">
                <p class="card-text text-muted mb-3">{{ itinerary.description || 'Explore this amazing destination with our carefully crafted itinerary.' }}</p>
                
                <div class="row g-2 mb-3">
                  <div class="col-6">
                    <small class="text-muted d-block">Start Date</small>
                    <strong>{{ formatDate(itinerary.startDate) }}</strong>
                  </div>
                  <div class="col-6">
                    <small class="text-muted d-block">Budget</small>
                    <strong class="text-success">\${{ itinerary.budget }}</strong>
                  </div>
                </div>
                
                <div class="mb-3">
                  <small class="text-muted">Created by</small>
                  <div class="d-flex align-items-center mt-1">
                    <i class="fas fa-user-circle text-primary me-2"></i>
                    <span class="fw-semibold">{{ itinerary.createdBy.name || 'Travel Expert' }}</span>
                  </div>
                </div>
              </div>
              
              <div class="card-footer bg-transparent border-0 p-4 pt-0">
                <div class="d-grid gap-2">
                  <button class="btn btn-gradient">
                    <i class="fas fa-eye me-2"></i>View Details
                  </button>
                  <button class="btn btn-outline-primary">
                    <i class="fas fa-bookmark me-2"></i>Save for Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ng-template #noItineraries>
          <div class="row">
            <div class="col-12">
              <div class="text-center py-5">
                <i class="fas fa-map text-muted" style="font-size: 5rem; opacity: 0.3;"></i>
                <h3 class="mt-4 text-muted">No Itineraries Available</h3>
                <p class="text-muted">Check back later for amazing travel plans!</p>
                <button class="btn btn-gradient mt-3">
                  <i class="fas fa-plus me-2"></i>Create New Itinerary
                </button>
              </div>
            </div>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 100px 0 50px;
      min-height: 100vh;
      background-color: #f8f9fa;
    }
    
    .bg-gradient {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    .itinerary-card {
      transition: all 0.3s ease;
      border-radius: 15px;
      overflow: hidden;
    }
    
    .itinerary-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 35px rgba(0,0,0,0.1);
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
    
    .card {
      border-radius: 15px;
    }
    
    .badge {
      font-size: 0.75rem;
    }
  `]
})
export class DashboardComponent implements OnInit {
  itineraries: Itinerary[] = [];
  loading = true;
  error: string | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadItineraries();
  }

  loadItineraries() {
    this.loading = true;
    this.apiService.getItineraries().subscribe({
      next: (data) => {
        this.itineraries = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading itineraries:', error);
        this.error = 'Failed to load itineraries. Using sample data.';
        this.loading = false;
        // Fallback to mock data
        this.loadMockData();
      }
    });
  }

  loadMockData() {
    // Mock data as fallback
    this.itineraries = [
      {
        _id: '1',
        title: 'Amazing Paris Adventure',
        destination: 'Paris, France',
        startDate: '2024-06-15',
        endDate: '2024-06-22',
        duration: '7 Days',
        budget: 2500,
        description: 'Explore the City of Light with visits to iconic landmarks, world-class museums, and charming neighborhoods.',
        createdBy: { _id: '1', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'admin' },
        dailyPlan: [],
        tripSummary: {},
        isActive: true,
        bookings: [],
        createdAt: '2024-01-15'
      },
      {
        _id: '2',
        title: 'Tokyo Cultural Experience',
        destination: 'Tokyo, Japan',
        startDate: '2024-07-10',
        endDate: '2024-07-20',
        duration: '10 Days',
        budget: 3200,
        description: 'Immerse yourself in Japanese culture, from ancient temples to modern technology and incredible cuisine.',
        createdBy: { _id: '2', name: 'Mike Chen', email: 'mike@example.com', role: 'admin' },
        dailyPlan: [],
        tripSummary: {},
        isActive: true,
        bookings: [],
        createdAt: '2024-01-20'
      },
      {
        _id: '3',
        title: 'Bali Tropical Getaway',
        destination: 'Bali, Indonesia',
        startDate: '2024-08-05',
        endDate: '2024-08-12',
        duration: '7 Days',
        budget: 1800,
        description: 'Relax on beautiful beaches, explore ancient temples, and enjoy the vibrant local culture.',
        createdBy: { _id: '3', name: 'Emma Wilson', email: 'emma@example.com', role: 'admin' },
        dailyPlan: [],
        tripSummary: {},
        isActive: true,
        bookings: [],
        createdAt: '2024-01-25'
      }
    ];
  }

  getUniqueDestinations(): number {
    const destinations = new Set(this.itineraries.map(i => i.destination));
    return destinations.size;
  }

  getAverageDuration(): string {
    if (this.itineraries.length === 0) return '0 Days';
    const totalDays = this.itineraries.reduce((sum, itinerary) => {
      const days = parseInt(itinerary.duration.split(' ')[0]);
      return sum + days;
    }, 0);
    return Math.round(totalDays / this.itineraries.length) + ' Days';
  }

  getAverageBudget(): number {
    if (this.itineraries.length === 0) return 0;
    const totalBudget = this.itineraries.reduce((sum, itinerary) => sum + itinerary.budget, 0);
    return Math.round(totalBudget / this.itineraries.length);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}