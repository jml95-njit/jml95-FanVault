import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  username = '';
  password = '';
  errorMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  onLogin() {
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter both username and password.';
      return;
    }

    const payload = { 
      username: this.username, 
      password: this.password 
    };

    // Send it to the reverse proxy (/api/login -> 192.168.10.20:3000)
    this.http.post('/api/login', payload).subscribe({
      next: (response: any) => {
        alert('Success! ' + response.message);
        this.router.navigate(['/home']); // Send them to the dashboard/home page!
      },
      error: (err) => {
        console.error('Login failed:', err);
        this.errorMessage = err.error.error || 'Server error. Check the cables.';
      }
    });
  }
}
