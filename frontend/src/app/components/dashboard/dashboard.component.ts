import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  itineraries: any[] = [];
  loading = true;
  showCreateModal = false;
  creating = false;
  createError = '';

  newItinerary = { title: '', destination: '', duration: null as number | null, budget: null as number | null, description: '' };

  stats = [
    { icon: 'map',      label: 'Total Itineraries', value: 0,          badge: '',       iconStyle: { color: '#ae2f34', bg: '#ffdad8' } },
    { icon: 'explore',  label: 'Destinations',       value: 0,          badge: 'Global', iconStyle: { color: '#6b586c', bg: '#f4dbf3' } },
    { icon: 'schedule', label: 'Avg Duration',        value: '0 Days',   badge: 'Avg.',   iconStyle: { color: '#8e4e14', bg: '#ffdcc4' } },
    { icon: 'payments', label: 'Avg Budget',          value: '$0',       badge: '',       iconStyle: { color: '#ae2f34', bg: '#ffdad8' } },
  ];

  mockItineraries = [
    { _id: 'm1', title: 'Aegean Dreams',     destination: 'Santorini, Greece', duration: 7,  budget: 2400, description: 'An island-hopping adventure through the Greek Aegean.' },
    { _id: 'm2', title: 'Neon Horizon',      destination: 'Tokyo, Japan',      duration: 12, budget: 4850, description: 'Street food, tech culture, and ancient temples in harmony.' },
    { _id: 'm3', title: 'Parisian Escapade', destination: 'Paris, France',     duration: 5,  budget: 3200, description: 'Art, haute cuisine, and Haussmann boulevards.' },
  ];

  constructor(public auth: AuthService, private api: ApiService) {}

  get initials(): string {
    const name = this.auth.currentUser()?.name || '';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  }

  ngOnInit() {
    this.api.getItineraries().subscribe({
      next: (data: any) => {
        const list = data?.data || data || [];
        this.itineraries = Array.isArray(list) ? list : [];
        this.updateStats();
        this.loading = false;
      },
      error: () => {
        this.itineraries = this.mockItineraries;
        this.updateStats();
        this.loading = false;
      }
    });
  }

  updateStats() {
    const list = this.displayItineraries;
    const total = list.length;
    const destinations = new Set(list.map((i: any) => i.destination)).size;
    const avgDur = total ? Math.round(list.reduce((s: number, i: any) => s + Number(i.duration || 0), 0) / total) : 0;
    const avgBudget = total ? Math.round(list.reduce((s: number, i: any) => s + Number(i.budget || 0), 0) / total) : 0;
    this.stats[0].value = total;
    this.stats[1].value = destinations;
    this.stats[2].value = `${avgDur} Days`;
    this.stats[3].value = `$${avgBudget.toLocaleString()}`;
  }

  get displayItineraries() {
    return this.itineraries.length ? this.itineraries : this.mockItineraries;
  }

  createItinerary() {
    if (!this.newItinerary.title || !this.newItinerary.destination) {
      this.createError = 'Title and destination are required.';
      return;
    }
    this.createError = '';
    this.creating = true;
    this.api.createItinerary({
      title: this.newItinerary.title,
      destination: this.newItinerary.destination,
      duration: String(this.newItinerary.duration || ''),
      budget: this.newItinerary.budget || 0,
      description: this.newItinerary.description,
    }).subscribe({
      next: (item: any) => {
        this.itineraries = [item?.data || item, ...this.itineraries];
        this.updateStats();
        this.showCreateModal = false;
        this.creating = false;
        this.newItinerary = { title: '', destination: '', duration: null, budget: null, description: '' };
      },
      error: (err: any) => {
        this.createError = err?.error?.message || 'Failed to create itinerary.';
        this.creating = false;
      }
    });
  }
}
