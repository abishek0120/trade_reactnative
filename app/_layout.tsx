import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="auth/login"
        options={{ title: "Login", headerShown: false }}
      />
      <Stack.Screen
        name="auth/register"
        options={{ title: "Register", headerShown: false }}
      />
      <Stack.Screen
        name="dashboard/index"
        options={{ title: "Dashboard", headerShown: false }}
      />
      <Stack.Screen
        name="history/index"
        options={{ title: "History", headerShown: false }}
      />
      <Stack.Screen
        name="analytics/index"
        options={{ title: "Analytics", headerShown: false }}
      />
      <Stack.Screen
        name="settings/index"
        options={{ title: "Settings", headerShown: false }}
      />
    </Stack>
  );
}
