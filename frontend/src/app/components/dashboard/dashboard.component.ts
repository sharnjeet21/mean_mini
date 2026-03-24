import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  itineraries: any[] = [];
  activeFilter = 'Budget';
  filters = ['Budget', 'Duration', 'Date'];

  stats = [
    { icon: 'map',      label: 'Total Itineraries',    value: 24,        badge: '+12%', badgeStyle: 'color:#835100', iconStyle: 'color:#3953bd; background:#dde1ff' },
    { icon: 'explore',  label: 'Unique Destinations',  value: 18,        badge: 'Global', badgeStyle: 'color:#3953bd', iconStyle: 'color:#754aa1; background:#f0dbff' },
    { icon: 'schedule', label: 'Avg Duration',         value: '8.5 Days',badge: 'Avg.', badgeStyle: 'color:#444653', iconStyle: 'color:#835100; background:#ffddb9' },
    { icon: 'payments', label: 'Avg Budget',           value: '$3,420',  badge: 'Active', badgeStyle: 'color:#ba1a1a', iconStyle: 'color:#93000a; background:#ffdad6' },
  ];

  mockItineraries = [
    { _id: '1', title: 'Aegean Dreams',     destination: 'Santorini, Greece', duration: 7,  budget: 2400, createdBy: 'Elena Rossi',  badge: 'Recommended', badgeColor: '#3953bd' },
    { _id: '2', title: 'Neon Horizon',      destination: 'Tokyo, Japan',      duration: 12, budget: 4850, createdBy: 'Hiroshi Sato', badge: 'In Progress', badgeColor: '#754aa1' },
    { _id: '3', title: 'Parisian Escapade', destination: 'Paris, France',     duration: 5,  budget: 3200, createdBy: 'Julian Dash',  badge: 'Current',     badgeColor: '#835100' },
  ];

  constructor(public auth: AuthService, private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any>('http://localhost:5000/api/itineraries').subscribe({
      next: (res) => {
        const data = res.data || res || [];
        this.itineraries = Array.isArray(data) ? data : [];
        if (this.itineraries.length) this.stats[0].value = this.itineraries.length;
      },
      error: () => { this.itineraries = this.mockItineraries; }
    });
  }

  get displayItineraries() {
    return this.itineraries.length ? this.itineraries : this.mockItineraries;
  }
}
