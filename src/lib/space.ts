/**
 * Space weather from NOAA SWPC: solar flares (GOES X-ray) and the planetary
 * Kp index. Pure parsing — every function is lenient (garbage → null, never
 * throws) and takes `now` explicitly so tests stay deterministic.
 */

export interface SolarFlareInfo {
  /** X-ray class of a flare in progress, null when the Sun is quiet right now. */
  ongoingClass: string | null;
  /** Class of the last peak — "C1.9" etc. */
  lastMaxClass: string | null;
  /** When that last flare peaked. */
  lastMaxTime: Date | null;
}

export interface KpInfo {
  /** Planetary K index, 0–9 (the finer estimated value when present). */
  kp: number | null;
  estimatedAt: Date | null;
}

export interface SpaceWeather {
  flare: SolarFlareInfo | null;
  kp: KpInfo | null;
  /** Date.now() of the fetch — for the localStorage TTL. */
  fetchedAt: number;
}

export type FlareCategory = 'quiet' | 'moderate' | 'strong' | 'extreme';

/** A/B → quiet, C → moderate, M → strong, X → extreme (unknown → quiet). */
export function flareCategory(cls: string | null): FlareCategory {
  const letter = cls?.trim().charAt(0).toUpperCase();
  if (letter === 'C') return 'moderate';
  if (letter === 'M') return 'strong';
  if (letter === 'X') return 'extreme';
  return 'quiet';
}

export type KpCategory = 'calm' | 'unsettled' | 'storm';

/** ≤3 calm, 4 unsettled (G1 near), ≥5 geomagnetic storm (aurora possible). */
export function kpCategory(kp: number | null): KpCategory {
  if (kp === null || kp <= 3) return 'calm';
  if (kp <= 4) return 'unsettled';
  return 'storm';
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** Parses an ISO timestamp with an explicit Z (NOAA flare times carry one). */
function parseUtc(v: unknown): Date | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const d = new Date(v.includes('Z') ? v : `${v.trim()}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const FLARE_CLASSES = /^[A-Z]/;

/** Parses the xray-flares-latest payload (a small array, usually one record). */
export function parseFlares(data: unknown, now: Date): SolarFlareInfo | null {
  if (!Array.isArray(data)) return null;
  for (const rec of data) {
    if (!isRecord(rec)) continue;
    const ongoing = asString(rec.current_class);
    const max = asString(rec.max_class);
    const begin = asString(rec.begin_class);
    const lastMaxClass = max ?? begin;
    if (ongoing === null && lastMaxClass === null) continue;
    const endTime = parseUtc(rec.end_time);
    return {
      // A current_class means a flare is ongoing only until its end_time passes.
      ongoingClass: ongoing !== null && FLARE_CLASSES.test(ongoing) && (endTime === null || endTime > now)
        ? ongoing
        : null,
      lastMaxClass: lastMaxClass !== null && FLARE_CLASSES.test(lastMaxClass) ? lastMaxClass : null,
      lastMaxTime: parseUtc(rec.max_time) ?? parseUtc(rec.begin_time),
    };
  }
  return null;
}

/** Parses the planetary K index payload: the last record with a valid index. */
export function parseKp(data: unknown, now: Date = new Date()): KpInfo | null {
  if (!Array.isArray(data)) return null;
  for (let i = data.length - 1; i >= 0; i--) {
    const rec = data[i];
    if (!isRecord(rec)) continue;
    const idx = rec.kp_index;
    const est = rec.estimated_kp;
    const kp =
      typeof est === 'number' && Number.isFinite(est) && est >= 0 && est <= 9
        ? est
        : typeof idx === 'number' && Number.isInteger(idx) && idx >= 0 && idx <= 9
          ? idx
          : null;
    if (kp === null) continue;
    // NOAA's Kp time_tag carries NO trailing Z — without appending one the
    // browser would read the UTC stamp as local time and shift it by hours.
    const tag = asString(rec.time_tag);
    const estimatedAt = tag ? parseUtc(tag) : null;
    if (estimatedAt && estimatedAt > now) continue; // a future stamp is garbage
    return { kp, estimatedAt };
  }
  return null;
}

/** Cache shape: Dates as ISO strings. */
export function serializeSpaceWeather(sw: SpaceWeather): string {
  return JSON.stringify({
    flare: sw.flare
      ? {
          ongoingClass: sw.flare.ongoingClass,
          lastMaxClass: sw.flare.lastMaxClass,
          lastMaxTime: sw.flare.lastMaxTime?.toISOString() ?? null,
        }
      : null,
    kp: sw.kp
      ? { kp: sw.kp.kp, estimatedAt: sw.kp.estimatedAt?.toISOString() ?? null }
      : null,
    fetchedAt: sw.fetchedAt,
  });
}

/** Restores a cached value; anything malformed → null (never throws). */
export function deserializeSpaceWeather(raw: unknown): SpaceWeather | null {
  if (!isRecord(raw) || typeof raw.fetchedAt !== 'number') return null;
  const flareRaw = raw.flare;
  const flare: SolarFlareInfo | null =
    flareRaw === null || flareRaw === undefined
      ? null
      : isRecord(flareRaw) &&
          (asString(flareRaw.ongoingClass) !== null || asString(flareRaw.lastMaxClass) !== null)
        ? {
            ongoingClass: asString(flareRaw.ongoingClass),
            lastMaxClass: asString(flareRaw.lastMaxClass),
            lastMaxTime:
              typeof flareRaw.lastMaxTime === 'string' ? parseUtc(flareRaw.lastMaxTime) : null,
          }
        : null;
  const kpRaw = raw.kp;
  const kp: KpInfo | null =
    kpRaw === null || kpRaw === undefined
      ? null
      : isRecord(kpRaw) && typeof kpRaw.kp === 'number'
        ? {
            kp: kpRaw.kp,
            estimatedAt:
              typeof kpRaw.estimatedAt === 'string' ? parseUtc(kpRaw.estimatedAt) : null,
          }
        : null;
  if (flare === null && kp === null) return null;
  return { flare, kp, fetchedAt: raw.fetchedAt };
}