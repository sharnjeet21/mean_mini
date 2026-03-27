import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  constructor(public auth: AuthService) {}

  featuredCards = [
    { icon: 'temple_buddhist', title: 'The Zen of Kyoto', subtitle: 'Culture, Cuisine & Traditions', duration: '12 Days', price: '$3,200' },
    { icon: 'sailing', title: 'Cyclades Serenity', subtitle: 'Luxury Yachting & Island Hopping', duration: '7 Days', price: '$4,850' },
    { icon: 'landscape', title: 'Alpine Elevation', subtitle: 'Luxury Lodges & Peak Adventures', duration: '9 Days', price: '$5,100' },
  ];

  features = [
    { icon: 'map', title: 'Create Itineraries', desc: 'Build detailed day-by-day travel plans. Add destinations, notes, and local secrets seamlessly.' },
    { icon: 'travel_explore', title: 'Manage Trips', desc: 'Centralize all your trips in one editorial view. Track progress and organize every detail.' },
    { icon: 'admin_panel_settings', title: 'Admin Controls', desc: 'Full-suite management for admins. Manage multiple itineraries with complete visibility.' },
  ];
}
