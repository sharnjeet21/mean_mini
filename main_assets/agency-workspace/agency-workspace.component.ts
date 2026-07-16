import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CurrencyService } from '../../services/currency.service';

@Component({
  selector: 'app-agency-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './agency-workspace.component.html'
})
export class AgencyWorkspaceComponent implements OnInit {
  currencyService = inject(CurrencyService);
  clients = [
    { id: 1, name: 'Alice Smith', email: 'alice@example.com', trips: 2 },
    { id: 2, name: 'Bob Johnson', email: 'bob@example.com', trips: 1 }
  ];
  
  recentProposals: any[] = [];
  loading = true;
  activeTab: 'proposals' | 'analytics' = 'proposals';
  analyticsData: any = null;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.fetchProposals();
  }

  fetchProposals(): void {
    this.loading = true;
    this.api.getItineraries().subscribe({
      next: (data) => {
        this.recentProposals = data.map(itinerary => ({
          id: itinerary._id,
          title: itinerary.title,
          client: itinerary.clientProfile ? 'Assigned' : 'Unassigned',
          status: itinerary.isActive ? 'Draft' : 'Sent',
          date: itinerary.createdAt
        }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadAnalytics(): void {
    this.activeTab = 'analytics';
    this.loading = true;
    this.api.getAgencyAnalytics().subscribe({
      next: (res) => {
        this.analyticsData = res;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
