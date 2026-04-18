import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register {
  username = '';
  password = '';
  errorMessage = '';

  // Injecting the HTTP Client (to talk to the Backend) and Router (to change pages)
  constructor(private http: HttpClient, private router: Router) {}

  onRegister() {
    // 1. Basic validation before sending
    if (!this.username || !this.password) {
      this.errorMessage = 'Please fill out both fields.';
      return;
    }

    // 2. Package the data
    const payload = { 
      username: this.username, 
      password: this.password 
    };

    // 3. Send it to our reverse proxy (/api/register -> 192.168.10.20:3000)
    this.http.post('/api/register', payload).subscribe({
      next: (response: any) => {
        alert('Success! ' + response.message);
        this.router.navigate(['/login']); // Kick them to the login page
      },
      error: (err) => {
        console.error('Registration failed:', err);
        this.errorMessage = err.error.error || 'Server error. Check the cables.';
      }
    });
  }
}
