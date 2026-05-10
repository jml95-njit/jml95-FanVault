import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CartService } from '../cart.service'; // IMPORT THE BASKET

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit {
  searchQuery: string = '';
  searchResults: any[] = [];
  searchAttempted: boolean = false;
  merchList: any[] = []; 

  // Inject the CartService here
  constructor(private router: Router, private http: HttpClient, public cartService: CartService) {}

  ngOnInit() {
    this.fetchMerch();
  }

  fetchMerch() {
    this.http.get('/api/merch').subscribe({
      next: (data: any) => this.merchList = data,
      error: (err) => console.error("Failed to load merch:", err)
    });
  }

  onLogout() {
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
      error: (err) => console.error("Search failed:", err)
    });
  }

  // NEW: Function to handle the button click
  addToCart(item: any) {
    this.cartService.addToCart(item);
  }
}
