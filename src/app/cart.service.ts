import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartService {
  private items: any[] = [];

  constructor() {
    // Check if a cart already exists in browser storage
    const savedCart = localStorage.getItem('fanvault_cart');
    if (savedCart) {
      this.items = JSON.parse(savedCart);
    }
  }

  addToCart(product: any) {
    this.items.push(product);
    this.saveCart();
    alert(`${product.name} added to cart!`);
  }

  getItems() { return this.items; }
  getCartCount() { return this.items.length; }

  // Calculates the final price for the Checkout screen
  getCartTotal() {
    return this.items.reduce((total, item) => total + item.price, 0);
  }

  clearCart() {
    this.items = [];
    this.saveCart();
    return this.items;
  }

  // Saves the basket to the browser so it survives page refreshes
  private saveCart() {
    localStorage.setItem('fanvault_cart', JSON.stringify(this.items));
  }
}
