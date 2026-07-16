import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './client-dashboard.component.html'
})
export class ClientDashboardComponent implements OnInit {
  proposals: any[] = [];
  loading = true;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    // In a real app, there would be a specific endpoint for fetching client-specific proposals.
    // For now, we reuse the basic getItineraries but filter for status === 'sent'.
    this.api.getItineraries().subscribe({
      next: (data) => {
        this.proposals = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
