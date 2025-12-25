import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// Token management
export class TokenManager {
  static async getToken(): Promise<string | null> {
    try {
      // Try multiple token sources
      let token = await AsyncStorage.getItem("userToken");
      if (!token) {
        token = await AsyncStorage.getItem("token");
      }
      if (!token) {
        token = await SecureStore.getItemAsync("jwt");
      }
      return token;
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  }

  static async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem("userToken", token);
      await AsyncStorage.setItem("token", token);
      await SecureStore.setItemAsync("jwt", token);
    } catch (error) {
      console.error("Error setting token:", error);
    }
  }

  static async clearToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("token");
      await SecureStore.deleteItemAsync("jwt");
    } catch (error) {
      console.error("Error clearing token:", error);
    }
  }
}

