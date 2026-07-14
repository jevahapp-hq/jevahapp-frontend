import AsyncStorage from "@react-native-async-storage/async-storage";

const DEVICE_ID_KEY = "jevah_device_id";
let sessionId: string | null = null;

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export async function getDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = generateId("device");
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return generateId("device");
  }
}

export function getSessionId(): string {
  if (!sessionId) {
    sessionId = generateId("session");
  }
  return sessionId;
}
