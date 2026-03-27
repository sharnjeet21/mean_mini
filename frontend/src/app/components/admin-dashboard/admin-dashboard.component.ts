import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  itineraries: any[] = [];
  activeTab = 'All';
  tabs = ['All', 'Active', 'Inactive'];
  searchQuery = '';

  stats = [
    { icon: 'map',        label: 'Total Active',   value: 0,       badge: '',      iconStyle: 'color:#ae2f34; background:#ffdad8', badgeStyle: '' },
    { icon: 'visibility', label: 'Itineraries',    value: 0,       badge: '',      iconStyle: 'color:#6b586c; background:#f4dbf3', badgeStyle: '' },
    { icon: 'archive',    label: 'Inactive',        value: 0,       badge: '',      iconStyle: 'color:#8e4e14; background:#ffdcc4', badgeStyle: '' },
    { icon: 'group',      label: 'Total',           value: 0,       badge: '',      iconStyle: 'color:#ae2f34; background:#ffdad8', badgeStyle: '' },
  ];

  mockData = [
    { _id: '1', title: 'The Royal London Explorer', subtitle: 'High-end cultural tour',   destination: 'London, UK',      createdAt: '2023-10-24', status: 'active',   isActive: true },
    { _id: '2', title: 'Desert Mirage Luxury',      subtitle: 'Modern luxury getaway',    destination: 'Dubai, UAE',      createdAt: '2023-11-12', status: 'active',   isActive: true },
    { _id: '3', title: 'Zen Spirit Kyoto',          subtitle: 'Wellness and mindfulness', destination: 'Kyoto, Japan',   createdAt: '2023-12-01', status: 'inactive', isActive: false },
    { _id: '4', title: 'Amalfi Coast Classics',     subtitle: 'Gastronomy and views',     destination: 'Positano, Italy', createdAt: '2024-01-15', status: 'active',   isActive: true },
  ];

  constructor(public auth: AuthService, private api: ApiService) {}

  ngOnInit() {
    this.api.getItineraries().subscribe({
      next: (data: any) => {
        const list = data?.data || data || [];
        this.itineraries = Array.isArray(list)
          ? list.map((i: any) => ({ ...i, status: i.isActive === false ? 'inactive' : 'active' }))
          : [];
        this.updateStats();
      },
      error: () => {
        this.itineraries = this.mockData;
        this.updateStats();
      }
    });
  }

  updateStats() {
    const list = this.itineraries.length ? this.itineraries : this.mockData;
    const active = list.filter((i: any) => i.status !== 'inactive').length;
    const inactive = list.filter((i: any) => i.status === 'inactive').length;
    this.stats[0].value = active;
    this.stats[1].value = list.length;
    this.stats[2].value = inactive;
    this.stats[3].value = list.length;
  }

  delete(id: string) {
    if (!confirm('Delete this itinerary?')) return;
    this.api.deleteItinerary(id).subscribe({
      next: () => {
        this.itineraries = this.itineraries.filter((i: any) => i._id !== id);
        this.updateStats();
      },
      error: () => {}
    });
  }

  get filteredItineraries() {
    let list = this.itineraries.length ? this.itineraries : this.mockData;
    if (this.activeTab === 'Active')   list = list.filter((i: any) => i.status !== 'inactive');
    if (this.activeTab === 'Inactive') list = list.filter((i: any) => i.status === 'inactive');
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter((i: any) =>
        i.title?.toLowerCase().includes(q) || i.destination?.toLowerCase().includes(q)
      );
    }
    return list;
  }
}
