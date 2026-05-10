import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login {
  username = '';
  password = '';
  mfaCode = '';
  requireMFA = false; // Toggles the screen state
  errorMessage = '';

  constructor(private router: Router, private http: HttpClient) {}

  onLogin() {
    this.errorMessage = '';
    
    // Build the payload. Include the mfaCode only if we are on step 2.
    const payload: any = { username: this.username, password: this.password };
    if (this.requireMFA) {
      payload.mfaCode = this.mfaCode;
    }

    this.http.post('/api/login', payload).subscribe({
      next: (res: any) => {
        if (res.requireMFA) {
          // Password was right, now ask for the 6-digit code
          this.requireMFA = true; 
        } else {
          // MFA verified! Let them in.
          localStorage.setItem('session_token', 'fanvault_auth_token');
          this.router.navigate(['/home']);
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.error || "Login failed.";
      }
    });
  }
}
