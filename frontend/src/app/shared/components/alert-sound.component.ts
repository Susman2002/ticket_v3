import { Component, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alert-sound',
  standalone: true,
  imports: [CommonModule],
  template: `
    <audio #audio preload="auto">
      <source src="assets/alert.mp3" type="audio/mpeg">
      <source src="assets/alert.wav" type="audio/wav">
    </audio>
  `,
  styles: []
})
export class AlertSoundComponent {
  trigger = input<number>(0);
  blocked = output<void>();
  private audio = signal<HTMLAudioElement | null>(null);

  constructor() {
    effect(() => {
      const t = this.trigger();
      if (t > 0) {
        this.play();
      }
    });
  }

  play(): void {
    const audio = new Audio('assets/alert.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {
      // Fallback: try to create a beep using Web Audio API
      this.playBeep();
    });
  }

  private playBeep(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

      const emitBeep = () => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          if (ctx.state === 'running') {
            emitBeep();
          } else {
            this.blocked.emit();
          }
        }).catch(() => this.blocked.emit());
      } else {
        emitBeep();
      }
    } catch {
      this.blocked.emit();
    }
  }
}
