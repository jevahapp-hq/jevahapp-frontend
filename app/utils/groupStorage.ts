import AsyncStorage from "@react-native-async-storage/async-storage";

export type MyGroup = {
  id: string;
  title: string;
  description: string;
  members: number;
  imageUri?: string | null;
};

const KEY = "myGroups";

export async function getMyGroups(): Promise<MyGroup[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addMyGroup(group: MyGroup): Promise<void> {
  const groups = await getMyGroups();
  const exists = groups.some(g => g.id === group.id && g.title === group.title);
  const next = exists ? groups : [group, ...groups];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function removeMyGroup(groupId: string): Promise<void> {
  const groups = await getMyGroups();
  const next = groups.filter(g => g.id !== groupId);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function clearMyGroups(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}


