/**
 * Türkiye ve çevresi fay hatları — basitleştirilmiş koordinatlar.
 * Kuzey Anadolu Fayı (NAF) ve Doğu Anadolu Fayı (EAF) yaklaşık izleri.
 * Kaynak: Genel coğrafi bilgi, GEM/USGS verilerinden esinlenmiştir.
 */

export interface FaultLine {
    name: string;
    coordinates: [number, number][]; // [lon, lat]
}

export const TURKEY_FAULT_LINES: FaultLine[] = [
    {
        name: "Kuzey Anadolu Fayı",
        coordinates: [
            [26.5, 40.4], [27.2, 40.2], [28.0, 40.8], [29.0, 40.9], [30.0, 41.0],
            [31.0, 40.8], [32.0, 40.5], [33.0, 40.2], [34.0, 40.8], [35.0, 40.5],
            [36.0, 40.2], [37.0, 40.0], [38.0, 40.5], [39.0, 40.8], [40.0, 41.0],
            [41.0, 40.8], [42.0, 40.5],
        ],
    },
    {
        name: "Doğu Anadolu Fayı",
        coordinates: [
            [38.5, 37.0], [39.0, 37.5], [39.5, 38.0], [40.0, 38.5], [40.5, 39.0],
            [41.0, 39.5], [41.5, 39.8], [42.0, 39.5], [42.5, 39.0], [43.0, 38.5],
        ],
    },
];
