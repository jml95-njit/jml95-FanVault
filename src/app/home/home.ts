import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CartService } from '../cart.service';

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
  tourResults: any[] = []; // NEW: Array to hold Ticketmaster data
  searchAttempted: boolean = false;
  merchList: any[] = []; 
  isCheckoutOpen: boolean = false;

  constructor(private router: Router, private http: HttpClient, public cartService: CartService) {}

  ngOnInit() {
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
    this.searchAttempted = true;

    // 1. Search Database for Artist Info
    this.http.get(`/api/search?q=${this.searchQuery}`).subscribe({
      next: (results: any) => this.searchResults = results,
      error: (err) => console.error("Database search failed:", err)
    });

    // 2. Search Ticketmaster for Tour Dates
    this.http.get(`/api/tour?q=${this.searchQuery}`).subscribe({
      next: (results: any) => this.tourResults = results,
      error: (err) => console.error("Ticketmaster search failed:", err)
    });
  }

  addToCart(item: any) { this.cartService.addToCart(item); }
  openCheckout() { this.isCheckoutOpen = true; }
  closeCheckout() { this.isCheckoutOpen = false; }
  
  checkoutCart() {
    if (this.cartService.getCartCount() === 0) return alert("Your cart is empty!");
    alert("Purchase successful! Thank you for your order.");
    this.cartService.clearCart();
    this.closeCheckout();
  }
}
