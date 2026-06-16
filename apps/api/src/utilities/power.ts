/**
 * Normalized Power — 30-second rolling average raised to the 4th power,
 * averaged, then 4th-rooted. Uses a sliding window for O(n) performance.
 * Returns null if the watts stream is too short or all zeros.
 */
export function computeNormalizedPower(watts: number[], time: number[]): number | null {
  if (watts.length < 30 || time.length !== watts.length) return null;

  const totalSeconds = time[time.length - 1]! - time[0]!;
  const avgSampleRate = totalSeconds / (time.length - 1); // seconds per sample
  const windowSamples = Math.max(1, Math.round(30 / avgSampleRate));

  const rollingAvgs: number[] = [];
  let windowSum = 0;

  for (let i = 0; i < watts.length; i++) {
    windowSum += watts[i]!;
    if (i >= windowSamples) {
      windowSum -= watts[i - windowSamples]!;
      rollingAvgs.push(windowSum / windowSamples);
    } else {
      rollingAvgs.push(windowSum / (i + 1));
    }
  }

  const meanFourthPower = rollingAvgs.reduce((acc, v) => acc + Math.pow(v, 4), 0) / rollingAvgs.length;
  const np = Math.round(Math.pow(meanFourthPower, 0.25));
  return isFinite(np) ? np : null;
}

export function computeIntensityFactor(ftp: number, np: number): number {
  return np / ftp;
}

export function computeTrainingStressScore(ftp: number, np: number, intensityFactor: number, durationSeconds: number): number {
  return (durationSeconds * np * intensityFactor) / (ftp * 36);
}

/**
 * Mean Maximal Power curve: for each duration d from 5s up to watts.length,
 * find the highest rolling average power over any window of d seconds.
 * Returns array where index 0 = 5s, index 1 = 6s, etc.
 * O(n^2) — acceptable for typical ride lengths.
 */
export function computeMmpCurve(watts: number[]): number[] {
  const n = watts.length;
  if (n < 5) return [];

  const result: number[] = [];

  for (let d = 5; d <= n; d++) {
    // Initialize window sum for first window of size d
    let windowSum = 0;
    for (let i = 0; i < d; i++) windowSum += watts[i]!;
    let maxAvg = windowSum / d;

    // Slide window across the rest of the array
    for (let i = d; i < n; i++) {
      windowSum += watts[i]! - watts[i - d]!;
      const avg = windowSum / d;
      if (avg > maxAvg) maxAvg = avg;
    }
    result.push(Math.round(maxAvg));
  }

  return result;
}

/** Downsample an array to at most maxPoints elements, taking evenly spaced samples. */
export function downsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = arr.length / maxPoints;
  return Array.from({ length: maxPoints }, (_, i) => arr[Math.round(i * step)]!);
}
