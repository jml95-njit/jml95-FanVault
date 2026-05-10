import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartService {
  private items: any[] = [];

  constructor() {
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

  getCartTotal() {
    return this.items.reduce((total, item) => total + item.price, 0);
  }

  clearCart() {
    this.items = [];
    this.saveCart();
    return this.items;
  }

  private saveCart() {
    localStorage.setItem('fanvault_cart', JSON.stringify(this.items));
  }
}
