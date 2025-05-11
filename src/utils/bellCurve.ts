import { RankedMedia } from "../types/media";

/**
 * Apply a bell curve (normal distribution) to convert rankings to ratings
 *
 * @param items The ranked media items
 * @param mean The mean of the bell curve (between 1-5)
 * @param stdDev The standard deviation of the bell curve
 * @param minRating The minimum possible rating (default: 0.5)
 * @param maxRating The maximum possible rating (default: 5.0)
 * @returns Media items with ratings applied
 */
export function applyBellCurve(
  items: RankedMedia[],
  mean: number = 3.0,
  stdDev: number = 1.0,
  minRating: number = 0.0,
  maxRating: number = 5.0
): RankedMedia[] {
  if (items.length === 0) return [];

  // Sort by rank to ensure correct ordering (higher rank = better)
  const sortedItems = [...items].sort((a, b) => b.rank - a.rank);
  const totalItems = sortedItems.length;

  // Calculate percentile for each item based on rank
  return sortedItems.map((item, index) => {
    // Calculate z-score based on percentile
    // Map index to percentile (0 to 1), where higher percentile = better ranking
    const percentile = index / (totalItems - 1);

    // Convert percentile to z-score using inverse of cumulative distribution
    // This is an approximation of the inverse normal CDF
    const z = approximateInverseNormalCDF(percentile);

    // Apply z-score to get rating
    const rating = mean + stdDev * z;

    // Clamp rating between minRating and maxRating
    const clampedRating = Math.max(minRating, Math.min(maxRating, rating));

    return {
      ...item,
      rating: parseFloat(clampedRating.toFixed(2)),
    };
  });
}

/**
 * Approximate the inverse of the normal cumulative distribution function
 *
 * @param p Percentile (0 to 1)
 * @returns Approximate z-score
 */
function approximateInverseNormalCDF(p: number): number {
  // Handle edge cases
  if (p <= 0) return -5; // Very negative z-score
  if (p >= 1) return 5; // Very positive z-score

  // Rational approximation for the inverse normal CDF
  if (p < 0.5) {
    return -approximateInverseNormalCDFHelper(1 - p);
  } else {
    return approximateInverseNormalCDFHelper(p);
  }
}

/**
 * Helper function for approximating the inverse normal CDF
 */
function approximateInverseNormalCDFHelper(p: number): number {
  // Coefficients for approximation
  const a = [2.50662823884, -18.61500062529, 41.39119773534, -25.44106049637];
  const b = [-8.4735109309, 23.08336743743, -21.06224101826, 3.13082909833];
  const c = [
    0.3374754822726147, 0.9761690190917186, 0.1607979714918209,
    0.0276438810333863, 0.0038405729373609,
  ];

  // Approximate the inverse function
  if (p >= 0.5 && p <= 0.92) {
    // Central region
    const y = p - 0.5;
    const r = y * y;
    return (
      (y * (((a[3] * r + a[2]) * r + a[1]) * r + a[0])) /
      ((((b[3] * r + b[2]) * r + b[1]) * r + b[0]) * r + 1)
    );
  } else {
    // Tail region
    const r = p < 0.5 ? p : 1 - p;
    const r2 = Math.log(-Math.log(r));
    return (
      c[0] +
      c[1] * r2 +
      c[2] * r2 * r2 +
      c[3] * r2 * r2 * r2 +
      c[4] * r2 * r2 * r2 * r2
    );
  }
}
