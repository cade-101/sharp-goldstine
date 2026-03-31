import { Platform } from 'react-native';

// Health Connect is Android-only. All functions return null/0 on other platforms.
let hc: typeof import('react-native-health-connect') | null = null;

async function getHC() {
  if (Platform.OS !== 'android') return null;
  if (!hc) hc = await import('react-native-health-connect');
  return hc;
}

export async function initHealthConnect(): Promise<boolean> {
  const lib = await getHC();
  if (!lib) return false;
  try {
    const initialized = await lib.initialize();
    if (!initialized) return false;

    const granted = await lib.requestPermission([
      { accessType: 'read', recordType: 'SleepSession' },
      { accessType: 'read', recordType: 'HeartRate' },
      { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
      { accessType: 'read', recordType: 'RestingHeartRate' },
    ]);

    return Array.isArray(granted) ? granted.length > 0 : !!granted;
  } catch {
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
}

export type HealthData = Awaited<ReturnType<typeof getAllHealthData>>;
