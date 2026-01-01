type HapticPattern = 'success' | 'warning' | 'error' | 'light';

const patterns: Record<HapticPattern, number[]> = {
  success: [50],
  warning: [50, 50, 50],
  error: [100, 50, 100],
  light: [10]
};

export function triggerHaptic(pattern: HapticPattern = 'success'): void {
  if (!('vibrate' in navigator)) {
    return;
  }

  try {
    navigator.vibrate(patterns[pattern]);
  } catch {
    // Silently fail on unsupported devices
  }
}
