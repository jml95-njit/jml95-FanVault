import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Login } from './login/login';
import { Register } from './register/register';

// 👇 1. IMPORT THE BOUNCER HERE 👇
import { authGuard } from './auth.guard'; 

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  
  // 👇 2. ADD THE BOUNCER TO THE HOME ROUTE 👇
  { path: 'home', component: Home, canActivate: [authGuard] }, 
  
  { path: 'login', component: Login },
  { path: 'register', component: Register }
];
