import { useShakeDetection } from "../src/hooks/useShakeDetection";
import { Text, View } from "react-native";

export default function Home() {
  useShakeDetection({
    enabled: true,
    onShakeReported: (confirmed) => {
      if (confirmed) console.log("Deprem doğrulandı (backend).");
    },
  });

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
      <Text style={{ fontSize: 18, textAlign: "center" }}>
        Deprem App – Sarsıntı algılama aktif. Cihazı sallayın; sinyal backend'e gidecek.
      </Text>
    </View>
  );
}
