/**
 * UI string dictionary (English-only).
 *
 * Interpolation uses {name} placeholders, substituted via tmpl().
 * Colors/numbers/time are not text — they live in code; only chrome strings live here.
 */
import type { QualityCategory, EventKind } from '../types';

export interface ChartTh {
  offset: string;
  hour: string;
  score: string;
  category: string;
}

export interface CategoryText {
  label: string;
  short: string;
  hint: string;
}

/** Replaces {key} in a template with values. Missing keys are left as-is. */
export function tmpl(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) => {
    const v = vars[key];
    return v === undefined ? m : String(v);
  });
}

export const STRINGS = {
  header: {
    tagline: 'A week-ahead forecast for beautiful sunrises and sunsets',
    themeLight: 'Switch to light theme',
    themeDark: 'Switch to dark theme',
    navLabel: 'Pages',
    pageForecast: 'Forecast',
    pageMoon: 'Moon',
  },
  search: {
    placeholder: 'Enter a city, e.g. “Warsaw”',
    empty: 'Nothing found',
  },
  location: {
    myLocation: '📍 My location',
    locating: 'Locating…',
    located: 'Location found',
    locatedWith: 'Location found: {city}',
    recentsLabel: 'Recent cities',
    removeRecent: 'Remove {city} from recents',
    myLocationName: 'My location',
    currentLabel: 'Current location',
  },
  forecast: {
    banner: 'Best moment of the week — {date} ({kind})',
    bestSunrise: 'sunrise',
    bestSunset: 'sunset',
    loading: 'Loading forecast',
    fallbackError: 'An error occurred.',
  },
  dayCard: {
    kind: { sunrise: 'Sunrise', sunset: 'Sunset' } as Record<EventKind, string>,
    polarSunrise: "doesn't rise",
    polarSunset: "doesn't set",
    bestTag: '★ Best',
    lowConfidence: 'less confident',
  },
  badge: {
    noData: 'no data',
    aria: '{label}, score {score} of 100',
    ariaNoData: 'no data',
  },
  detail: {
    sectionLabel: 'Selected day details',
    tabsLabel: 'Day event',
  },
  chart: {
    kind: { sunrise: 'Sunrise', sunset: 'Sunset' } as Record<EventKind, string>,
    aria: 'Chart: {kind}',
    polarSunrise: 'Sun does not rise',
    polarSunset: 'Sun does not set',
    noData: 'Not enough data to forecast',
    hourlyAria: 'Hourly score for {kind}',
    atTime: ' at {time}',
    sub: 'at {time} · score {score} of 100',
    score: 'Score {score} of 100',
    noCat: 'no data',
    tableCaption: 'Hourly score for {kind} at {time}, score {score} of 100',
    th: { offset: 'Offset', hour: 'Hour', score: 'Score', category: 'Category' } as ChartTh,
    cellNoData: 'no data',
    cellScore: '{score} of 100',
    ariaSlotNoData: '{offset}: no data',
    ariaSlotScore: '{offset}, {hour}: score {score} of 100',
    ariaSlotCat: ', {label}',
    timeUnknown: 'time unknown',
  },
  legend: {
    label: 'Quality scale and forecast principles',
    titleScale: 'Quality scale',
    titleHow: 'How it’s calculated',
    science: [
      'Cirrus and altocumulus (high and mid clouds) — a screen catching low-sun light.',
      'Low clouds and precipitation block the sun; the sky turns grey.',
      'Moderate humidity and rising pressure after a front intensify the colour.',
    ],
    attr: 'Data: ',
  },
  error: {
    retry: 'Retry',
    network: 'Could not reach the weather service. Check your internet connection.',
    forecastHttp: 'The weather service returned error {status}.',
    forecastGeneric: 'The weather service returned invalid data.',
    forecastFail: 'Could not load the forecast.',
    geocodingNetwork: 'Could not reach the geocoding service.',
    geocodingHttp: 'The geocoding service returned error {status}.',
    geocodingFail: 'Could not find the city.',
    geolocationUnsupported: 'Geolocation is not supported by this browser.',
    geolocationDenied: 'Location access denied. Enter a city manually.',
    geolocationFail: 'Could not determine your location.',
  },
  moon: {
    pageLabel: 'Moon calendar',
    heroTitle: 'Moon calendar for your sky',
    heroText:
      'Phases for every day of the month, moonrise and moonset for your location, plus special events: supermoons and eclipses. Computed offline, in your browser.',
    locationSectionLabel: 'Location for moonrise and moonset',
    monthNavLabel: 'Month navigation',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    timesLocal: 'Times are shown in your local timezone.',
    weekdays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as string[],
    phase: {
      new: 'New moon',
      waxingCrescent: 'Waxing crescent',
      firstQuarter: 'First quarter',
      waxingGibbous: 'Waxing gibbous',
      full: 'Full moon',
      waningGibbous: 'Waning gibbous',
      thirdQuarter: 'Third quarter',
      waningCrescent: 'Waning crescent',
    },
    rise: 'Moonrise',
    set: 'Moonset',
    noLocation:
      'Choose a location to see moonrise and moonset times and eclipse visibility — the phases themselves are the same everywhere.',
    eventsTitle: 'Special events this month',
    noEvents: 'No special events this month.',
    fullMoon: 'Full moon',
    newMoon: 'New moon',
    supermoon: 'Supermoon',
    supermoonDetail: '({km} km from Earth)',
    lunarEclipse: 'Lunar eclipse',
    lunarPenumbral: 'Penumbral lunar eclipse',
    lunarPartial: 'Partial lunar eclipse',
    lunarTotal: 'Total lunar eclipse',
    solarEclipse: 'Solar eclipse',
    solarPartial: 'Partial solar eclipse',
    solarAnnular: 'Annular solar eclipse',
    solarTotal: 'Total solar eclipse',
    visibleHere: 'visible from your location',
    notVisibleHere: 'not visible from your location',
    visibilityUnknown: 'visibility from your location unknown',
    cellAria: '{date}: {phase}, {illum} illuminated, moonrise {rise}, moonset {set}',
    cellAriaNoLocation: '{date}: {phase}, {illum} illuminated',
    fullMoonDay: 'Full moon day',
    newMoonDay: 'New moon day',
    footer:
      'Sunsetrise — an amateur sky-beauty forecast. Moon data computed offline in your browser (astronomy-engine). Not a scientific ephemeris.',
  },
  today: {
    label: 'Today',
    ariaSun: 'Today at a glance: sunrise and sunset',
    ariaMoon: 'Today at a glance: moon',
    illumText: '{illum}% illuminated',
    selectHint: 'Show today’s details',
  },
  weather: {
    ariaLabel: 'Today’s weather',
    forecastAria: 'Weather forecast',
    humidity: 'Humidity {value}%',
    wind: 'Wind {value} km/h {dir}',
    gusts: 'gusts {value} km/h',
    rain: 'Rain {value}%',
    tempRange: '{min}–{max}°',
  },
  uv: {
    chipAria: 'UV index {uv} ({category})',
    ariaLabel: 'Sun danger',
    category: {
      low: 'low',
      moderate: 'moderate',
      high: 'high',
      'very high': 'very high',
      extreme: 'extreme',
    } as Record<string, string>,
    /** DayDetail line: "UV up to {uv} — {category}; fair skin: sunburn in ~{min} min". */
    dayMax: 'UV up to {uv} — {category}',
    sunburn: 'fair skin: sunburn in ~{min} min',
    /** "the sun is dangerous from {from} until {to}". */
    dangerWindow: 'the sun is dangerous from {from} until {to}',
    nowShort: 'now {uv}',
  },
  comfort: {
    ariaLabel: 'Comfort at the event hour',
    feels: 'Feels {feels}°',
    level: {
      cold: 'dress really warm',
      chilly: 'dress warm',
      mild: 'pleasant',
      warm: 'warm — take water',
      hot: 'hot — shade and water',
    } as Record<string, string>,
    wind: 'wind {value} km/h',
    strongWind: 'strong wind {value} km/h',
  },
  air: {
    ariaLabel: 'Air quality and health',
    title: 'Air & health',
    chipAria: 'Air quality index {value} ({band})',
    needLocation: 'Choose a location to see air quality from your sky',
    aqiTitle: 'Air quality',
    aqiValue: 'AQI {value}',
    aqiNoData: 'no air-quality data',
    whoLine: {
      1: 'Air quality is good — enjoy your usual outdoor activities.',
      2: 'Unusually sensitive people should consider reducing intense outdoor activity.',
      3: 'Children, older adults and people with asthma or heart disease should limit prolonged outdoor exertion.',
      4: 'Sensitive groups should avoid prolonged outdoor exertion; everyone may begin to feel effects.',
      5: 'Avoid outdoor exertion; sensitive groups should stay indoors if possible.',
      6: 'Health warning — everyone should avoid outdoor activity.',
    } as Record<number, string>,
    band: {
      1: 'Good',
      2: 'Fair',
      3: 'Moderate',
      4: 'Poor',
      5: 'Very poor',
      6: 'Extremely poor',
    } as Record<number, string>,
    pm25: 'Fine particles (PM2.5)',
    pm10: 'Coarse particles (PM10)',
    dust: 'Dust',
    smoke: 'Smoke haze in the air — people with asthma, be careful',
    peakAqi: 'Worst day this period: {date} (AQI {value})',
    pollenTitle: 'Pollen',
    pollenHigh: '{name} high — allergy sufferers, be careful',
    pollenNames: {
      alder: 'Alder',
      birch: 'Birch',
      grass: 'Grass',
      mugwort: 'Mugwort',
      olive: 'Olive',
      ragweed: 'Ragweed',
    } as Record<string, string>,
    pollenValue: '{value} grains/m³',
    units: 'µg/m³',
  },
  sky: {
    ariaLabel: 'Tonight’s sky events',
    title: 'Tonight’s sky',
    planets: { Saturn: 'Saturn', Jupiter: 'Jupiter' } as Record<string, string>,
    moonName: 'Moon',
    starNames: { Vega: 'Vega', Sirius: 'Sirius', Arcturus: 'Arcturus', Capella: 'Capella' } as Record<string, string>,
    dirIn: 'in the {dir}',
    mag: 'mag {mag}',
    /** Naked-eye visibility hints, by apparent magnitude bracket. */
    magCity: 'bright — visible even in a city',
    magEasy: 'easy to see without instruments',
    magDark: 'naked-eye only under a dark sky',
    magLimit: 'at the edge of naked-eye vision',
    magOptic: 'needs binoculars or a telescope',
    /** "22:00" caption under the map: time + how to read the disc. */
    mapCaption: 'at {time} · edge = horizon, center = overhead',
    mapAria: 'Sky map for tonight: {points}',
    mapPoint: '{name} — {alt}° above the horizon, in the {dir}',
    /** A dim rim marker for a body below the horizon now. */
    mapPointLater: '{name} — below the horizon now, rises at {time} in the {dir}',
    mapRiseLabel: '{name} ↑ {time}',
    moonNear: 'the Moon is near {planet} — {sep}° apart, in the {dir}',
    moonriseTitle: 'Moonrise',
    moonPace: 'comes ~{min} min later each evening',
    moonPaceFast: 'fast-moon season — comes only ~{min} min later each evening',
    moonGiant: 'giant moon: rise near perigee ({km} km) — the disc looks ~14% bigger',
    altHigh: 'high in the evening sky',
    altOk: 'visible in the evening sky',
    altLow: 'low on the horizon',
    risesLater: 'rises at {time}',
    belowHorizon: 'below the horizon tonight',
    meteorActive: '{name} — active, up to ~{zhr} meteors/h near the peak ({date})',
    meteorNext: 'Next shower: {name} — peak {date}, up to ~{zhr} meteors/h (in {days} days)',
    moonBright: 'Moon {illum}% — will wash out faint meteors',
    moonDark: 'Dark, moonless sky — good for meteors',
    needLocation: 'Choose a location to see planets from your sky',
    starsTitle: 'Stars tonight',
    starsScore: '{score} of 100',
    starsClear: 'clear night sky',
    skyPartly: 'partly cloudy',
    skyCloudy: 'cloudy',
    moonless: 'no moonlight',
    moonDim: 'dim moon ({illum}%)',
    moonBrightShort: 'bright moon ({illum}%)',
    starsNoData: 'no cloud data for tonight',
    bortleLabel: '{sky} sky, Bortle {bortle} (est.)',
    bortleDark: 'dark',
    bortleRural: 'rural',
    bortleSuburban: 'suburban',
    bortleCity: 'city',
    solarTitle: 'Solar activity',
    geoTitle: 'Geomagnetic activity',
    flareQuiet: 'quiet',
    flareModerate: 'moderate',
    flareStrong: 'strong',
    flareExtreme: 'extreme',
    flareOngoing: ' — {cls} flare in progress',
    flareLast: 'last flare {cls} at {time} UTC',
    noData: 'no data',
    kpCalm: 'calm',
    kpUnsettled: 'unsettled',
    kpStorm: 'storm',
    kpValue: 'Kp {kp}',
    aurora: 'aurora possible at high latitudes',
  },
  app: {
    heroLabel: 'Location search',
    heroTitle: 'Where to watch a sunrise or sunset?',
    heroText:
      'Pick a city or detect your location — and see for the next 7 days when the sky will be truly beautiful. The forecast accounts for clouds at different levels, humidity, pressure and precipitation.',
    chartWrapLabel: 'Selected day details',
    footer:
      'Sunsetrise — an amateur sky-beauty forecast. Data: Open-Meteo (CC-BY 4.0). This is not a scientific forecast, but an estimate from weather factors.',
  },
  categories: {
    Poor: {
      label: 'Poor',
      short: 'Poor',
      hint: 'Almost no colour: thick clouds or precipitation block the sun.',
    },
    Fair: {
      label: 'Fair',
      short: 'Fair',
      hint: 'A brief touch of colour: variable clouds or haze.',
    },
    Good: {
      label: 'Good',
      short: 'Good',
      hint: 'A colourful sky lasting a while, clouds at several levels.',
    },
    Great: {
      label: 'Great',
      short: 'Gt.',
      hint: 'A vivid, multicoloured sky for 30+ minutes: clouds at several levels.',
    },
  } as Record<QualityCategory, CategoryText>,
};

export type Dict = typeof STRINGS;