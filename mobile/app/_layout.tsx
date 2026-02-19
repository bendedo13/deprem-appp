import { useEffect } from "react";
import { Stack } from "expo-router";
import { setupFcmEarthquakeHandler, setBackgroundEarthquakeHandler } from "../src/services/fcmEarthquakeHandler";

setBackgroundEarthquakeHandler();

export default function RootLayout() {
  useEffect(() => {
    const unsub = setupFcmEarthquakeHandler();
    return unsub;
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Deprem App" }} />
    </Stack>
  );
}
