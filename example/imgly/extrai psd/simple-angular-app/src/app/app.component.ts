import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <app-psd-analyzer></app-psd-analyzer>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 2rem;
      box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
    }
  `]
})
export class AppComponent {
  title = 'PSD Font Extractor';
}