/**
 * AppContext — Merkezi state yönetimi ve performans optimizasyonu.
 *
 * Amaç: Dark/Light tema, çoklu dil, dashboard verileri ve izin durumları
 * gibi global state'leri tek bir context'te tutarak gereksiz re-render'ları
 * engellemek.
 *
 * Optimizasyonlar:
 * 1. Separate context'ler: Her concern kendi context'inde
 *    → Tema değiştiğinde deprem listesi re-render olmaz
 * 2. useMemo ile memoize edilmiş value'lar
 * 3. useCallback ile memoize edilmiş fonksiyonlar
 * 4. React.memo ile sarılmış child componentler için uygun
 */

import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useMemo,
    useEffect,
    useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PermissionState } from "../services/permissionService";

// ── 1. Background Service Context ───────────────────────────────────────────

interface BackgroundServiceState {
    isActive: boolean;
    lastHeartbeat: string | null;
    setActive: (active: boolean) => void;
    setLastHeartbeat: (ts: string | null) => void;
}

const BackgroundServiceContext = createContext<BackgroundServiceState>({
    isActive: false,
    lastHeartbeat: null,
    setActive: () => {},
    setLastHeartbeat: () => {},
});

export function useBackgroundService() {
    return useContext(BackgroundServiceContext);
}

// ── 2. Permission Context ───────────────────────────────────────────────────

const DEFAULT_PERMISSIONS: PermissionState = {
    location: "undetermined",
    backgroundLocation: "undetermined",
    notifications: "undetermined",
    sms: "undetermined",
    camera: "undetermined",
};

interface PermissionContextState {
    permissions: PermissionState;
    updatePermission: (key: keyof PermissionState, status: PermissionState[keyof PermissionState]) => void;
    setPermissions: (state: PermissionState) => void;
}

const PermissionContext = createContext<PermissionContextState>({
    permissions: DEFAULT_PERMISSIONS,
    updatePermission: () => {},
    setPermissions: () => {},
});

export function usePermissions() {
    return useContext(PermissionContext);
}

// ── 3. Calibration Context ──────────────────────────────────────────────────

interface CalibrationContextState {
    baselineNoise: number;
    adjustedTriggerRatio: number;
    isCalibrated: boolean;
    calibratedAt: string | null;
    setCalibrationData: (data: {
        baselineNoise: number;
        adjustedTriggerRatio: number;
        calibratedAt: string;
    }) => void;
}

const CalibrationContext = createContext<CalibrationContextState>({
    baselineNoise: 0.05,
    adjustedTriggerRatio: 3.0,
    isCalibrated: false,
    calibratedAt: null,
    setCalibrationData: () => {},
});

export function useCalibration() {
    return useContext(CalibrationContext);
}

// ── 4. Network / Cache Context ──────────────────────────────────────────────

interface NetworkContextState {
    isOnline: boolean;
    isRetrying: boolean;
    cacheAge: number | null;
    setOnline: (online: boolean) => void;
    setRetrying: (retrying: boolean) => void;
    setCacheAge: (age: number | null) => void;
}

const NetworkContext = createContext<NetworkContextState>({
    isOnline: true,
    isRetrying: false,
    cacheAge: null,
    setOnline: () => {},
    setRetrying: () => {},
    setCacheAge: () => {},
});

export function useNetwork() {
    return useContext(NetworkContext);
}

// ── Master Provider ─────────────────────────────────────────────────────────

interface AppProviderProps {
    children: React.ReactNode;
}

/**
 * AppProvider — Tüm context'leri saran master provider.
 * Her context ayrı memoize edilir → gereksiz re-render engellenir.
 */
export function AppProvider({ children }: AppProviderProps) {
    // Background Service
    const [bgActive, setBgActive] = useState(false);
    const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);

    const bgValue = useMemo(
        () => ({
            isActive: bgActive,
            lastHeartbeat,
            setActive: setBgActive,
            setLastHeartbeat,
        }),
        [bgActive, lastHeartbeat]
    );

    // Permissions
    const [permissions, setPermissionsState] = useState<PermissionState>(DEFAULT_PERMISSIONS);

    const updatePermission = useCallback(
        (key: keyof PermissionState, status: PermissionState[keyof PermissionState]) => {
            setPermissionsState((prev) => ({ ...prev, [key]: status }));
        },
        []
    );

    const setPermissions = useCallback((state: PermissionState) => {
        setPermissionsState(state);
    }, []);

    const permValue = useMemo(
        () => ({ permissions, updatePermission, setPermissions }),
        [permissions, updatePermission, setPermissions]
    );

    // Calibration
    const [baselineNoise, setBaselineNoise] = useState(0.05);
    const [adjustedTriggerRatio, setAdjustedTriggerRatio] = useState(3.0);
    const [isCalibrated, setIsCalibrated] = useState(false);
    const [calibratedAt, setCalibratedAt] = useState<string | null>(null);

    const setCalibrationData = useCallback(
        (data: { baselineNoise: number; adjustedTriggerRatio: number; calibratedAt: string }) => {
            setBaselineNoise(data.baselineNoise);
            setAdjustedTriggerRatio(data.adjustedTriggerRatio);
            setIsCalibrated(true);
            setCalibratedAt(data.calibratedAt);
        },
        []
    );

    const calValue = useMemo(
        () => ({
            baselineNoise,
            adjustedTriggerRatio,
            isCalibrated,
            calibratedAt,
            setCalibrationData,
        }),
        [baselineNoise, adjustedTriggerRatio, isCalibrated, calibratedAt, setCalibrationData]
    );

    // Kalibrasyon verilerini AsyncStorage'dan yükle
    useEffect(() => {
        AsyncStorage.getItem("sensor_calibration").then((raw) => {
            if (raw) {
                try {
                    const data = JSON.parse(raw);
                    setBaselineNoise(data.baselineNoise ?? 0.05);
                    setAdjustedTriggerRatio(data.adjustedTriggerRatio ?? 3.0);
                    setIsCalibrated(!!data.calibratedAt);
                    setCalibratedAt(data.calibratedAt ?? null);
                } catch {}
            }
        });
    }, []);

    // Network
    const [isOnline, setOnline] = useState(true);
    const [isRetrying, setRetrying] = useState(false);
    const [cacheAge, setCacheAge] = useState<number | null>(null);

    const netValue = useMemo(
        () => ({
            isOnline,
            isRetrying,
            cacheAge,
            setOnline,
            setRetrying,
            setCacheAge,
        }),
        [isOnline, isRetrying, cacheAge]
    );

    return (
        <BackgroundServiceContext.Provider value={bgValue}>
            <PermissionContext.Provider value={permValue}>
                <CalibrationContext.Provider value={calValue}>
                    <NetworkContext.Provider value={netValue}>
                        {children}
                    </NetworkContext.Provider>
                </CalibrationContext.Provider>
            </PermissionContext.Provider>
        </BackgroundServiceContext.Provider>
    );
}
