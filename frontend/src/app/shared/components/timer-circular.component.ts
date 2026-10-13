import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-timer-circular',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-24 h-24 mx-auto" [class.text-yellow-300]="warning()" [class.text-red-400]="critical()">
      <svg class="w-full h-full transform -rotate-90">
        <circle
          class="text-gray-700"
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke="currentColor"
          stroke-width="6"
        />
        <circle
          class="transition-all duration-1000 ease-linear"
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke="currentColor"
          stroke-width="6"
          stroke-linecap="round"
          [attr.stroke-dasharray]="circumference()"
          [attr.stroke-dashoffset]="dashOffset()"
          [style.stroke]="strokeColor()"
        />
      </svg>
      <div class="absolute inset-0 flex items-center justify-center">
        <span class="text-2xl font-mono font-bold">{{ seconds() }}s</span>
      </div>
    </div>
  `,
  styles: []
})
export class TimerCircularComponent {
  seconds = input.required<number>();
  totalSeconds = input<number>(90);

  circumference = computed(() => 2 * Math.PI * 40);
  progress = computed(() => this.seconds() / this.totalSeconds());
  dashOffset = computed(() => this.circumference() * (1 - this.progress()));
  
  warning = computed(() => this.seconds() <= 30 && this.seconds() > 10);
  critical = computed(() => this.seconds() <= 10);
  
  strokeColor = computed(() => {
    if (this.critical()) return '#ef4444';
    if (this.warning()) return '#f59e0b';
    return '#22c55e';
  });
}