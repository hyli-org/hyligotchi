interface Animation {
  lastUpdate: number;
  interval: number;
  callback: () => void;
}

/**
 * Centralized animation timing manager that handles multiple animations
 * with different intervals using a single requestAnimationFrame loop
 */
export class AnimationManager {
  private animations: Map<string, Animation>;
  
  constructor() {
    this.animations = new Map();
  }
  
  /**
   * Register a new animation with a specific interval
   */
  register(name: string, interval: number, callback: () => void) {
    this.animations.set(name, {
      lastUpdate: Date.now(),
      interval,
      callback
    });
  }
  
  /**
   * Unregister an animation by name
   */
  unregister(name: string) {
    this.animations.delete(name);
  }
  
  /**
   * Update all animations based on elapsed time
   */
  update() {
    const now = Date.now();
    this.animations.forEach((animation) => {
      if (now - animation.lastUpdate >= animation.interval) {
        animation.callback();
        animation.lastUpdate = now;
      }
    });
  }
  
  /**
   * Clear all animations
   */
  clear() {
    this.animations.clear();
  }
  
  /**
   * Get the number of active animations
   */
  get size() {
    return this.animations.size;
  }
}