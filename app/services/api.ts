import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://:8000";
const TOKEN_KEY = "auth_token";

// endpoints that must NOT send Authorization header
const PUBLIC_ENDPOINTS = ["/login/", "/register/"];

export async function apiPost(endpoint: string, body: any) {
  const headers: any = {
    "Content-Type": "application/json",
  };

  // attach token ONLY for protected endpoints
  if (!PUBLIC_ENDPOINTS.includes(endpoint)) {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      headers.Authorization = `Token ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return response.json();
}
