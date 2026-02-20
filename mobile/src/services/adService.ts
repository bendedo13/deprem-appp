import { TestIds } from 'react-native-google-mobile-ads';

/**
 * AdMob Reklam Birimi Kimlikleri
 * Canlı ortamda kullanıcı tarafından sağlanan ID'ler kullanılır.
 * Geliştirme/Test aşamasında TestIds kullanılabilir.
 */

// CANLI ID'LER
export const AD_UNITS = {
    BANNER: 'ca-app-pub-1173265458993328/4118507973',
    INTERSTITIAL: 'ca-app-pub-1173265458993328/3324301051',
};

// TEST ID'LERİ (İhtiyaç halinde TestIds.BANNER veya TestIds.INTERSTITIAL kullanılabilir)
export const IS_TEST_MODE = false;

export const getBannerId = () => {
    return IS_TEST_MODE ? TestIds.BANNER : AD_UNITS.BANNER;
};

export const getInterstitialId = () => {
    return IS_TEST_MODE ? TestIds.INTERSTITIAL : AD_UNITS.INTERSTITIAL;
};
