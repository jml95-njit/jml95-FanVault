import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home {
  searchQuery: string = '';
  searchResults: any[] = [];
  searchAttempted: boolean = false;

  constructor(private router: Router, private http: HttpClient) {}

  onLogout() {
    console.log("User logged off.");
    localStorage.removeItem('session_token');
    this.router.navigate(['/login']);
  }

  onSearch() {
    if (!this.searchQuery.trim()) return;
    
    this.http.get(`/api/search?q=${this.searchQuery}`).subscribe({
      next: (results: any) => {
        this.searchResults = results;
        this.searchAttempted = true;
      },
      error: (err) => {
        console.error("Search failed:", err);
      }
    });
  }
}
