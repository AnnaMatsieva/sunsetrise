/**
 * Smooth primitives for the scoring model. All are C1-continuous (the derivative
 * exists even at the joints) so small input changes don't jitter the category.
 * NaN inputs yield 0 everywhere — data gaps don't poison the math.
 */

/** Clamp to [0,1]; NaN → 0. */
export function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/**
 * Cubic smoothstep: 0 at x<=a, 1 at x>=b, a smooth S-transition between.
 * When a===b it behaves like a threshold (step), with no division by zero.
 */
export function smoothstep(a: number, b: number, x: number): number {
  if (Number.isNaN(x)) return 0;
  if (a === b) return x < a ? 0 : 1;
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Inverted smoothstep: 1 at x<=a, 0 at x>=b (decreasing transition). */
export function invertSmoothstep(a: number, b: number, x: number): number {
  return 1 - smoothstep(a, b, x);
}

/**
 * Trapezoid: 0 → smooth rise loEdge→loPlat → plateau 1 (loPlat..hiPlat)
 * → smooth fall hiPlat→hiEdge → 0. C1 at all four corners.
 * Requires loEdge <= loPlat <= hiPlat <= hiEdge.
 */
export function trapezoid(
  x: number,
  loEdge: number,
  loPlat: number,
  hiPlat: number,
  hiEdge: number,
): number {
  if (Number.isNaN(x)) return 0;
  if (x <= loEdge) return 0;
  if (x < loPlat) return smoothstep(loEdge, loPlat, x);
  if (x <= hiPlat) return 1;
  if (x < hiEdge) return invertSmoothstep(hiPlat, hiEdge, x);
  return 0;
}

/**
 * Symmetric bell around center: a plateau of width plateauHalf on each side,
 * with slopes of shoulder beyond it. Equivalent to
 * trapezoid(center-p-shoulder, center-p, center+p, center+p+shoulder).
 */
export function bell(
  x: number,
  center: number,
  plateauHalf: number,
  shoulder: number,
): number {
  return trapezoid(x, center - plateauHalf - shoulder, center - plateauHalf, center + plateauHalf, center + plateauHalf + shoulder);
}