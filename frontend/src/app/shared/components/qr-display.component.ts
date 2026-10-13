import { Component, input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QRCodeModule } from 'angularx-qrcode';

@Component({
  selector: 'app-qr-display',
  standalone: true,
  imports: [CommonModule, QRCodeModule],
  template: `
    <div class="bg-white rounded-lg p-4 inline-block" [class.animate-pulse]="rotating()">
      <!-- Force re-render by using a key that changes with qrData -->
      <qrcode
        [attr.data-qr-key]="qrKey()"
        [qrdata]="qrData()"
        [width]="size()"
        [errorCorrectionLevel]="'M'"
        [cssClass]="'qr-code'"
        [elementType]="'canvas'">
      </qrcode>
    </div>
  `,
  styles: [`
    .qr-code {
      display: block;
      margin: 0 auto;
    }
    :host(.rotating) .qr-code {
      animation: rotate 0.3s ease-in-out;
    }
    @keyframes rotate {
      0% { transform: rotate(0deg) scale(1); }
      50% { transform: rotate(5deg) scale(1.02); }
      100% { transform: rotate(0deg) scale(1); }
    }
  `]
})
export class QRDisplayComponent {
  qrData = input.required<string>();
  size = input<number>(256);
  rotating = input<boolean>(false);

  // Generate a key that changes when qrData changes to force re-render
  qrKey = signal(0);

  constructor() {
    effect(() => {
      this.qrData(); // Track qrData changes
      this.qrKey.update(k => k + 1); // Increment key to force re-render
    });
  }
}