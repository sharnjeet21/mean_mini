import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  itineraries: any[] = [];
  activeTab = 'All';
  tabs = ['All', 'Active', 'Inactive'];

  stats = [
    { icon: 'map',        label: 'Total Active',   value: 42,      badge: '+12%', iconStyle: 'color:#001356; background:#dde1ff', badgeStyle: 'color:#835100; background:#ffddb9' },
    { icon: 'visibility', label: 'Monthly Views',  value: '128.4k', badge: '+5.4k', iconStyle: 'color:#2c0051; background:#f0dbff', badgeStyle: 'color:#3953bd; background:#dde1ff' },
    { icon: 'archive',    label: 'Drafted',        value: 8,       badge: '',    iconStyle: 'color:#444653; background:#e1e3e4', badgeStyle: '' },
    { icon: 'report',     label: 'Needs Review',   value: 3,       badge: '',    iconStyle: 'color:#93000a; background:#ffdad6', badgeStyle: '' },
  ];

  mockData = [
    { _id: '1', title: 'The Royal London Explorer', subtitle: 'High-end cultural tour',  destination: 'London, UK',     createdAt: '2023-10-24', status: 'active' },
    { _id: '2', title: 'Desert Mirage Luxury',      subtitle: 'Modern luxury getaway',   destination: 'Dubai, UAE',     createdAt: '2023-11-12', status: 'active' },
    { _id: '3', title: 'Zen Spirit Kyoto',          subtitle: 'Wellness and mindfulness', destination: 'Kyoto, Japan',  createdAt: '2023-12-01', status: 'inactive' },
    { _id: '4', title: 'Amalfi Coast Classics',     subtitle: 'Gastronomy and views',    destination: 'Positano, Italy', createdAt: '2024-01-15', status: 'active' },
  ];

  constructor(public auth: AuthService, private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/api/itinerary`).subscribe({
      next: (res) => { this.itineraries = res.data || res || []; },
      error: () => { this.itineraries = this.mockData; }
    });
  }

  delete(id: string) {
    if (!confirm('Delete this itinerary?')) return;
    this.http.delete(`${environment.apiUrl}/api/itinerary/${id}`).subscribe({
      next: () => { this.itineraries = this.itineraries.filter(i => i._id !== id); },
      error: () => {}
    });
  }

  get filteredItineraries() {
    const list = this.itineraries.length ? this.itineraries : this.mockData;
    if (this.activeTab === 'Active')   return list.filter(i => i.status !== 'inactive');
    if (this.activeTab === 'Inactive') return list.filter(i => i.status === 'inactive');
    return list;
  }
}
