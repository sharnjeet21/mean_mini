import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  featuredCards = [
    { icon: 'temple_buddhist', title: 'The Zen of Kyoto', subtitle: 'Culture, Cuisine & Traditions', duration: '12 Days', price: '$3,200' },
    { icon: 'sailing', title: 'Cyclades Serenity', subtitle: 'Luxury Yachting & Island Hopping', duration: '7 Days', price: '$4,850' },
    { icon: 'landscape', title: 'Alpine Elevation', subtitle: 'Luxury Lodges & Peak Adventures', duration: '9 Days', price: '$5,100' },
  ];
  features = [
    { icon: 'map', title: 'Professional Itineraries', desc: 'Access expert-level route mapping and time-management schedules tailored to your pace and style.' },
    { icon: 'bolt', title: 'One-Click Booking', desc: 'Seamlessly transition from planning to reality. Book flights, stays, and activities in a single, unified flow.' },
    { icon: 'admin_panel_settings', title: 'Admin Management', desc: 'Full-suite controls for agents and group leaders. Manage multiple trips with enterprise-grade visibility.' },
  ];
}
