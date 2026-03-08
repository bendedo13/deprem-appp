/**
 * QuakeSense Design System
 * Vizyon: "Guven, Hiz ve Mutlak Dogruluk"
 * Dark Mode, Glassmorphism, yuksek kontrastli tipografi
 */

export const Colors = {
    // Ana Palet — Deep Navy tabani
    primary: '#10B981',        // Emerald Green (Guvenlik)
    primaryDark: '#059669',
    primaryLight: '#34D399',
    accent: '#F97316',         // Safety Orange (Uyarilar)
    danger: '#DC2626',         // Crimson Red (Kritik alarmlar)
    dangerDark: '#B91C1C',

    background: {
        light: '#f0f4f8',
        dark: '#0a0e17',       // Deep Navy
        surface: '#111827',   // Glassmorphism kart tabani
        elevated: '#1f2937',  // Yukseltiimis yuzey
        glass: 'rgba(17, 24, 39, 0.7)',  // Glassmorphism efekti
        onPrimary: '#ffffff',  // Beyaz (primary üzerinde metin)
    },
    text: {
        light: '#0F172A',
        dark: '#F1F5F9',
        muted: '#6B7280',
        accent: '#10B981',
    },
    status: {
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#DC2626',
        info: '#3B82F6',
        critical: '#EF4444',
    },
    // QuakeSense semantik — Toast/Snackbar, bağlantı durumu
    semantic: {
        toastSuccess: '#065f46',
        toastError: '#7f1d1d',
        warningAmber: '#ca8a04',
        liveBadge: '#10B981',
        disconnectedBadge: '#6B7280',
    },
    border: {
        light: '#E2E8F0',
        dark: '#1f2937',
        glass: 'rgba(255, 255, 255, 0.08)',
    },
    gradient: {
        emerald: ['#059669', '#10B981'],
        danger: ['#DC2626', '#EF4444'],
        navy: ['#0a0e17', '#111827'],
        orange: ['#EA580C', '#F97316'],
    },
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
};

export const BorderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
};

export const Typography = {
    fontFamily: 'Inter',
    monoFamily: 'Roboto Mono',
    sizes: {
        xs: 11,
        sm: 13,
        md: 15,
        lg: 17,
        xl: 20,
        xxl: 24,
        xxxl: 32,
        display: 48,
        hero: 56,
    },
    weights: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
        extrabold: '800' as const,
        black: '900' as const,
    },
};

export const Shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    glow: (color: string) => ({
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 12,
    }),
};

// Glassmorphism stil yardimcisi
export const Glass = {
    card: {
        backgroundColor: Colors.background.glass,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderRadius: BorderRadius.xl,
    },
    surface: {
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderRadius: BorderRadius.lg,
    },
};
