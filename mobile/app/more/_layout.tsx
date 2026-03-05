import { Stack } from "expo-router";
import { Colors } from "../../src/constants/theme";

export default function MoreLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: Colors.background.dark },
                headerTintColor: Colors.text.dark,
                headerTitleStyle: { fontWeight: "700" },
            }}
        />
    );
}
