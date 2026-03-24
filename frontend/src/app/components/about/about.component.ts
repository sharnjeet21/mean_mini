import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './about.component.html',
})
export class AboutComponent {
  tasks = [
    { number: 1, icon: 'settings', title: 'Node.js & npm Setup', description: 'Install and configure Node.js, npm packages, and project structure.', techs: ['Node.js', 'npm', 'package.json'] },
    { number: 2, icon: 'dns', title: 'Express Server', description: 'Create Express project and build static site using Express and Node.', techs: ['Express.js', 'Node.js', 'REST API'] },
    { number: 3, icon: 'palette', title: 'Bootstrap / Tailwind UI', description: 'Import Bootstrap/Tailwind for quick, responsive layouts across all views.', techs: ['Tailwind CSS', 'Bootstrap 5', 'Responsive'] },
    { number: 4, icon: 'storage', title: 'MongoDB CRUD', description: 'Install MongoDB and perform insert, update, read and delete operations.', techs: ['MongoDB', 'CRUD', 'NoSQL'] },
    { number: 5, icon: 'schema', title: 'Mongoose Data Models', description: 'Build data models with MongoDB and Mongoose schema definitions.', techs: ['Mongoose', 'Schema', 'Models'] },
    { number: 6, icon: 'cable', title: 'MongoDB Connection', description: 'Connect Express application to MongoDB using Mongoose.', techs: ['Mongoose', 'MongoDB Atlas', 'dotenv'] },
    { number: 7, icon: 'web', title: 'Angular Application', description: 'Create an Angular application and work with its components and routing.', techs: ['Angular 21', 'TypeScript', 'Components'] },
    { number: 8, icon: 'route', title: 'SPA Architecture', description: 'Single Page Application with Angular Router, guards, and lazy loading.', techs: ['Angular Router', 'Guards', 'SPA'] },
    { number: 9, icon: 'lock', title: 'JWT Authentication', description: 'Secure authentication using JWT tokens and bcrypt password hashing.', techs: ['JWT', 'bcryptjs', 'Auth Guards'] },
  ];

  stack = [
    { icon: 'dns', color: '#68a063', name: 'Node.js', role: 'Runtime' },
    { icon: 'api', color: '#000000', name: 'Express', role: 'Backend' },
    { icon: 'storage', color: '#4db33d', name: 'MongoDB', role: 'Database' },
    { icon: 'web', color: '#dd0031', name: 'Angular', role: 'Frontend' },
  ];
}
