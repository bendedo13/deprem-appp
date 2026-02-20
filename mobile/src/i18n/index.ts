/**
 * i18n konfigürasyonu — expo-localization + i18next.
 * Cihaz dilini okur, desteklenen dile eşler, fallback: 'en'.
 * rules.md: bu dosya app/_layout.tsx'den import edilmeli (init tetikler).
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import tr from "./locales/tr.json";
import en from "./locales/en.json";
import ja from "./locales/ja.json";
import zh from "./locales/zh.json";
import id from "./locales/id.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import it from "./locales/it.json";
import el from "./locales/el.json";
import pt from "./locales/pt.json";
import ru from "./locales/ru.json";
import ne from "./locales/ne.json";

/** Desteklenen dil kodları */
const SUPPORTED: readonly string[] = [
    "tr", "en", "ja", "zh", "id", "fr", "de", "it", "el", "pt", "ru", "ne",
];

/**
 * Cihaz locale'ini desteklenen dil koduna çevirir.
 * Örn: "ja-JP" → "ja", "en-US" → "en", "pt-BR" → "pt"
 */
function resolveLocale(): string {
    const locales = Localization.getLocales();
    for (const loc of locales) {
        const lang = loc.languageCode ?? "";
        if (SUPPORTED.includes(lang)) return lang;
    }
    return "en";
}

i18n.use(initReactI18next).init({
    resources: { tr, en, ja, zh, id, fr, de, it, el, pt, ru, ne },
    lng: resolveLocale(),
    fallbackLng: "en",
    ns: ["translation"],
    defaultNS: "translation",
    interpolation: { escapeValue: false },
    compatibilityJSON: "v4",
});

export default i18n;
