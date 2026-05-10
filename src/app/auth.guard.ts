import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('session_token');

  console.log("GUARD CHECK: Checking for session_token...");
  console.log("TOKEN FOUND:", token);

  if (token) {
      return true;
  } else {
      // THIS WILL POP UP IN YOUR BROWSER IF THE GUARD IS FIRING
      alert("SECURITY ALERT: No session token found. Redirecting to login.");
      router.navigate(['/login']);
      return false;
  }
};
