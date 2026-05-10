import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private items: any[] = [];

  addToCart(product: any) {
    this.items.push(product);
    alert(`${product.name} added to cart!`);
  }

  getItems() {
    return this.items;
  }

  getCartCount() {
    return this.items.length;
  }

  clearCart() {
    this.items = [];
    return this.items;
  }
}
