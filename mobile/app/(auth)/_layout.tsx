import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function AuthLayout() {
    return (
        <>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: "#0f172a" },
                    headerTintColor: "#f8fafc",
                    headerTitleStyle: { fontWeight: "700" },
                }}
            />
        </>
    );
}
