import * as SecureStore from "expo-secure-store";

export const tokenCache = {
  async getToken(key) {
    return await SecureStore.getItemAsync(key);
  },
  async saveToken(key, value) {
    await SecureStore.setItemAsync(key, value);
  },
};
