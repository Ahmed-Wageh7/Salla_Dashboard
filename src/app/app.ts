import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastOutletComponent } from './shared/toast/toast-outlet';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastOutletComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  title = 'salla';
}
