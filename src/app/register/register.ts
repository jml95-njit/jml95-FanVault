import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register {
  username = '';
  password = '';
  qrCodeUrl = ''; // Holds the MFA barcode from the server
  errorMessage = '';

  constructor(private router: Router, private http: HttpClient) {}

  onRegister() {
    this.errorMessage = '';
    this.http.post('/api/register', { username: this.username, password: this.password }).subscribe({
      next: (res: any) => {
        // If the server sends a QR code, display it!
        if (res.qrCode) {
          this.qrCodeUrl = res.qrCode;
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.error || "Registration failed. Try again.";
      }
    });
  }
}
