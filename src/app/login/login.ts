import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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

    this.http.post('/api/login', payload).subscribe({
      next: (response: any) => {
        alert('Success! ' + response.message);
        // This is the "Wristband" the Bouncer looks for
        localStorage.setItem('session_token', this.username);
        this.router.navigate(['/home']);
      },
      error: (err) => {
        console.error('Login failed:', err);
        this.errorMessage = err.error.error || 'Server error. Check the cables.';
      }
    });
  }
}
