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

/** Downsample an array to at most maxPoints elements, taking evenly spaced samples. */
export function downsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = arr.length / maxPoints;
  return Array.from({ length: maxPoints }, (_, i) => arr[Math.round(i * step)]!);
}
