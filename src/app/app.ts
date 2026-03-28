import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Home } from './home/home';
import { Login } from './login/login';
import { Register } from './register/register';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Home, Login, Register],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'fanvault';
}
