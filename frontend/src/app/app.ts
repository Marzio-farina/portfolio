import { Component, signal } from '@angular/core';
import { Aside } from "./components/aside/aside";
import { Navbar } from "./components/navbar/navbar";
import { Dashboard } from "./components/dashboard/dashboard";

@Component({
  selector: 'app-root',
  imports: [Aside, Navbar, Dashboard],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Portfolio');
}
