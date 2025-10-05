import { Component, signal } from '@angular/core';
import { Aside } from "./components/aside/aside";

@Component({
  selector: 'app-root',
  imports: [Aside],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Portfolio');
}
