/**
 * Ülke önayarları — Bounding Box + Kaynak yönlendirme
 *
 * Turkey: AFAD + Kandilli (yerel yüksek çözünürlük)
 * Diğerleri: USGS + EMSC (global veri)
 */

export type CountryCode = string;

export interface CountryPreset {
    code: CountryCode;
    name: string;
    flag: string;
    sources: ("AFAD" | "KANDILLI" | "USGS" | "EMSC")[];
    /** Bounding box — USGS/EMSC için kullanılır */
    bbox: {
        minlat: number;
        maxlat: number;
        minlon: number;
        maxlon: number;
    };
}

export const COUNTRY_PRESETS: CountryPreset[] = [
    {
        code: "TR",
        name: "Türkiye",
        flag: "🇹🇷",
        sources: ["AFAD", "KANDILLI"],
        bbox: { minlat: 34.0, maxlat: 43.0, minlon: 25.0, maxlon: 45.0 },
    },
    {
        code: "GLOBAL",
        name: "Dünya Geneli",
        flag: "🌍",
        sources: ["USGS", "EMSC"],
        bbox: { minlat: -90, maxlat: 90, minlon: -180, maxlon: 180 },
    },
    {
        code: "JP",
        name: "Japonya",
        flag: "🇯🇵",
        sources: ["USGS", "EMSC"],
        bbox: { minlat: 24.0, maxlat: 46.0, minlon: 122.0, maxlon: 154.0 },
    },
    {
        code: "US",
        name: "Amerika",
        flag: "🇺🇸",
        sources: ["USGS", "EMSC"],
        bbox: { minlat: 24.0, maxlat: 50.0, minlon: -125.0, maxlon: -65.0 },
    },
    {
        code: "GR",
        name: "Yunanistan",
        flag: "🇬🇷",
        sources: ["USGS", "EMSC"],
        bbox: { minlat: 34.0, maxlat: 42.0, minlon: 19.0, maxlon: 30.0 },
    },
    {
        code: "IT",
        name: "İtalya",
        flag: "🇮🇹",
        sources: ["USGS", "EMSC"],
        bbox: { minlat: 36.0, maxlat: 48.0, minlon: 6.0, maxlon: 19.0 },
    },
    {
        code: "ID",
        name: "Endonezya",
        flag: "🇮🇩",
        sources: ["USGS", "EMSC"],
        bbox: { minlat: -11.0, maxlat: 7.0, minlon: 95.0, maxlon: 141.0 },
    },
    {
        code: "CL",
        name: "Şili",
        flag: "🇨🇱",
        sources: ["USGS", "EMSC"],
        bbox: { minlat: -56.0, maxlat: -17.0, minlon: -76.0, maxlon: -66.0 },
    },
    {
        code: "MX",
        name: "Meksika",
        flag: "🇲🇽",
        sources: ["USGS", "EMSC"],
        bbox: { minlat: 14.0, maxlat: 33.0, minlon: -118.0, maxlon: -86.0 },
    },
    {
        code: "IR",
        name: "İran",
        flag: "🇮🇷",
        sources: ["USGS", "EMSC"],
        bbox: { minlat: 25.0, maxlat: 40.0, minlon: 44.0, maxlon: 64.0 },
    },
    {
        code: "NZ",
        name: "Yeni Zelanda",
        flag: "🇳🇿",
        sources: ["USGS", "EMSC"],
        bbox: { minlat: -48.0, maxlat: -34.0, minlon: 166.0, maxlon: 178.0 },
    },
    {
        code: "PE",
        name: "Peru",
        flag: "🇵🇪",
        sources: ["USGS", "EMSC"],
        bbox: { minlat: -18.0, maxlat: 0.0, minlon: -82.0, maxlon: -68.0 },
    },
];

export function getCountryPreset(code: CountryCode): CountryPreset {
    return COUNTRY_PRESETS.find((c) => c.code === code) ?? COUNTRY_PRESETS[0];
}
