import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Colors, Typography } from "../../src/constants/theme";

export default function AuthLayout() {
    return (
        <>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: Colors.background.dark },
                    headerTintColor: Colors.text.dark,
                    headerTitleStyle: { fontWeight: Typography.weights.bold },
                }}
            />
        </>
    );
}
