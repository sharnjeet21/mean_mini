import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatChipsModule],
  templateUrl: './home.component.html',
})
export class HomeComponent {
  constructor(private auth: AuthService, private router: Router) {}

  onStartPlanning() {
    this.router.navigate([this.auth.isLoggedIn ? '/dashboard' : '/register']);
  }
  featuredCards = [
    {
      title: 'The Zen of Kyoto',
      subtitle: 'Lantern-lit lanes, temple mornings and a food-first route.',
      duration: '12 days',
      price: '$3,200',
      image: '/images/kyoto.jpg',
      accent: '#ff9b7d',
    },
    {
      title: 'Cyclades Serenity',
      subtitle: 'Sun-washed villages, hidden coves and slow island days.',
      duration: '7 days',
      price: '$4,850',
      image: '/images/santorini.jpg',
      accent: '#7ae0c3',
    },
    {
      title: 'Alpine Elevation',
      subtitle: 'Glass-blue lakes, mountain rail and cinematic lodges.',
      duration: '9 days',
      price: '$5,100',
      image: '/images/alps.jpg',
      accent: '#ffc96b',
    },
  ];
  features = [
    { icon: 'route', title: 'Plans that breathe', desc: 'Routes adapt to your pace, budget and travel style without turning every day into a checklist.' },
    { icon: 'neurology', title: 'Explainable intelligence', desc: 'See feasibility, budget quality and planning risks before they become expensive surprises.' },
    { icon: 'travel', title: 'One calm workspace', desc: 'Discover, compare, save, book and review itineraries without losing the story of the trip.' },
  ];

  stats = [
    { value: '42K+', label: 'routes explored' },
    { value: '91%', label: 'plan confidence' },
    { value: '4.9', label: 'traveler rating' },
  ];
}
