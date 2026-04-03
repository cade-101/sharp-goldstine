import { Platform } from 'react-native';

// Health Connect is Android-only. All functions return null/0 on other platforms.
let hc: typeof import('react-native-health-connect') | null = null;

async function getHC() {
  if (Platform.OS !== 'android') return null;

  // Expo Go cannot load native modules — skip entirely
  const Constants = require('expo-constants');
  const isExpoGo = Constants.default?.appOwnership === 'expo';
  if (isExpoGo) return null;

  if (!hc) hc = await import('react-native-health-connect');
  return hc;
}

export async function initHealthConnect(): Promise<boolean> {
  const lib = await getHC();
  if (!lib) return false;
  try {
    // Must check availability before initialize() — calling initialize() when
    // Health Connect is not installed throws on the native Kotlin coroutine
    // before JS can catch it, crashing the app.
    const status = await lib.getSdkStatus();
    if (status !== lib.SdkAvailabilityStatus.SDK_AVAILABLE) return false;

    const initialized = await lib.initialize();
    if (!initialized) return false;

    // DO NOT call requestPermission here — it crashes on the native Kotlin thread
    // when called after Activity resume (ActivityResultLauncher lifecycle violation).
    // Check existing permissions only. Request happens via button in Settings.
    const granted = await lib.getGrantedPermissions();
    return Array.isArray(granted) && granted.length > 0;
  } catch (e) {
    console.warn('Health Connect unavailable:', e);
    return false;
  }
}

export async function getLastNightSleep(): Promise<{
  hours: number;
  startTime: string;
  endTime: string;
} | null> {
  const lib = await getHC();
  if (!lib) return null;
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(18, 0, 0, 0); // from 6pm yesterday

    const { records } = await lib.readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: yesterday.toISOString(),
        endTime: new Date().toISOString(),
      },
    });

    if (!records.length) return null;
    const session = records[records.length - 1] as any;
    const durationMs =
      new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
    const hours = durationMs / (1000 * 60 * 60);

    return {
      hours: Math.round(hours * 10) / 10,
      startTime: session.startTime,
      endTime: session.endTime,
    };
  } catch {
    return null;
  }
}

export async function getTodayHR(): Promise<number | null> {
  const lib = await getHC();
  if (!lib) return null;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { records } = await lib.readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: today.toISOString(),
        endTime: new Date().toISOString(),
      },
    });

    if (!records.length) return null;
    const samples = (records as any[]).flatMap((r: any) => r.samples ?? []);
    if (!samples.length) return null;
    const avg =
      samples.reduce((sum: number, s: any) => sum + (s.beatsPerMinute ?? 0), 0) /
      samples.length;
    return Math.round(avg);
  } catch {
    return null;
  }
}

export async function getLatestHRV(): Promise<number | null> {
  const lib = await getHC();
  if (!lib) return null;
  try {
    const { records } = await lib.readRecords('HeartRateVariabilityRmssd', {
      timeRangeFilter: {
        operator: 'between',
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
      },
    });

    if (!records.length) return null;
    return (records[records.length - 1] as any).heartRateVariabilityMillis ?? null;
  } catch {
    return null;
  }
}

export async function getTodaySteps(): Promise<number> {
  const lib = await getHC();
  if (!lib) return 0;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { records } = await lib.readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime: today.toISOString(),
        endTime: new Date().toISOString(),
      },
    });

    return (records as any[]).reduce((sum: number, r: any) => sum + (r.count ?? 0), 0);
  } catch {
    return 0;
  }
}

export async function getRestingHR(): Promise<number | null> {
  const lib = await getHC();
  if (!lib) return null;
  try {
    const { records } = await lib.readRecords('RestingHeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
      },
    });

    if (!records.length) return null;
    return (records[records.length - 1] as any).beatsPerMinute ?? null;
  } catch {
    return null;
  }
}

export async function getAllHealthData() {
  try {
    const granted = await initHealthConnect();
    if (!granted) return null;

    const [sleep, avgHR, hrv, steps, restingHR] = await Promise.all([
      getLastNightSleep(),
      getTodayHR(),
      getLatestHRV(),
      getTodaySteps(),
      getRestingHR(),
    ]);

    return { sleep, avgHR, hrv, steps, restingHR };
  } catch (e) {
    console.warn('Health Connect hard fail:', e);
    return null;
  }
}

export type HealthData = Awaited<ReturnType<typeof getAllHealthData>>;


/**
 * Opens the Health Connect settings screen where the user grants permissions manually.
 * Does NOT use requestPermission() — that API crashes on many devices due to
 * ActivityResultLauncher lifecycle constraints (must register before onStart).
 * After the user returns to the app, call checkHealthPermissions() to read the result.
 */
export async function requestHealthPermissions(): Promise<void> {
  const lib = await getHC();
  if (!lib) return;
  try {
    const status = await lib.getSdkStatus();
    if (status !== lib.SdkAvailabilityStatus.SDK_AVAILABLE) return;
    lib.openHealthConnectSettings();
  } catch (e) {
    console.warn('Could not open Health Connect settings:', e);
  }
}

export async function checkHealthPermissions(): Promise<boolean> {
  const lib = await getHC();
  if (!lib) return false;
  try {
    const granted = await lib.getGrantedPermissions();
    return Array.isArray(granted) && granted.length > 0;
  } catch {
    return false;
  }
}
