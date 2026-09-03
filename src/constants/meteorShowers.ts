/**
 * Major annual meteor showers, from the IMO (International Meteor Organization)
 * annual shower calendar — dates are stable year to year, so a static table is
 * accurate enough for "what's up tonight". Month/day are 1-indexed; a range
 * with start > end wraps the new year (Quadrantids).
 */
export interface MeteorShower {
  name: string;
  /** Activity range: start ≤ peak ≤ end; start > end means the range crosses the new year. */
  start: [number, number];
  peak: [number, number];
  end: [number, number];
  /** Zenithal Hourly Rate at the peak — meteors/h for a dark-sky observer. */
  zhr: number;
  /**
   * Radiant direction at the peak (J2000, degrees — RA 0–360, Dec −90..90).
   * Drifts a degree or two over the activity span; the peak value is plenty
   * for a "where to look" diagram.
   */
  radiant: { raDeg: number; decDeg: number };
}

export const METEOR_SHOWERS: readonly MeteorShower[] = [
  { name: 'Quadrantids', start: [12, 28], peak: [1, 3], end: [1, 12], zhr: 110, radiant: { raDeg: 230, decDeg: 49 } },
  { name: 'Lyrids', start: [4, 14], peak: [4, 22], end: [4, 30], zhr: 18, radiant: { raDeg: 271, decDeg: 34 } },
  { name: 'Eta Aquariids', start: [4, 19], peak: [5, 6], end: [5, 28], zhr: 50, radiant: { raDeg: 338, decDeg: -1 } },
  { name: 'Delta Aquariids', start: [7, 12], peak: [7, 30], end: [8, 23], zhr: 25, radiant: { raDeg: 340, decDeg: -16 } },
  { name: 'Perseids', start: [7, 17], peak: [8, 12], end: [8, 24], zhr: 100, radiant: { raDeg: 48, decDeg: 58 } },
  { name: 'Orionids', start: [10, 2], peak: [10, 21], end: [11, 7], zhr: 20, radiant: { raDeg: 95, decDeg: 16 } },
  { name: 'Northern Taurids', start: [10, 20], peak: [11, 12], end: [12, 10], zhr: 8, radiant: { raDeg: 58, decDeg: 22 } },
  { name: 'Leonids', start: [11, 6], peak: [11, 17], end: [11, 30], zhr: 10, radiant: { raDeg: 152, decDeg: 22 } },
  { name: 'Geminids', start: [12, 4], peak: [12, 13], end: [12, 20], zhr: 150, radiant: { raDeg: 112, decDeg: 33 } },
  { name: 'Ursids', start: [12, 17], peak: [12, 22], end: [12, 26], zhr: 10, radiant: { raDeg: 217, decDeg: 76 } },
];