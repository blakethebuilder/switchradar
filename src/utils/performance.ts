// Performance monitoring utilities for large datasets

export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();
  
  static startTimer(label: string): void {
    this.timers.set(label, performance.now());
  }
  
  static endTimer(label: string): number {
    const start = this.timers.get(label);
    if (!start) return 0;
    
    const duration = performance.now() - start;
    this.timers.delete(label);
    
    if (duration > 100) {
      console.warn(`Performance: ${label} took ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }
  
  static measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.startTimer(label);
    return fn().finally(() => this.endTimer(label));
  }
  
  static measure<T>(label: string, fn: () => T): T {
    this.startTimer(label);
    try {
      return fn();
    } finally {
      this.endTimer(label);
    }
  }
}