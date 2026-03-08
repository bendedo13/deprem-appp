/**
 * QuakeSenseLogo — Marka kimliği bileşeni.
 * LinearGradient + sismik dalga çubukları ile minimalist, profesyonel logo.
 */

import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface Props {
    size?: "sm" | "md" | "lg";
    showText?: boolean;
    textColor?: string;
}

const SIZES = {
    sm: {
        box: 30,
        bars: [{ w: 2, h: 6 }, { w: 2, h: 10 }, { w: 2, h: 16 }, { w: 2, h: 10 }, { w: 2, h: 6 }],
        fontSize: 15,
        gap: 8,
        radius: 8,
    },
    md: {
        box: 40,
        bars: [{ w: 3, h: 8 }, { w: 3, h: 14 }, { w: 3, h: 22 }, { w: 3, h: 14 }, { w: 3, h: 8 }],
        fontSize: 18,
        gap: 10,
        radius: 11,
    },
    lg: {
        box: 54,
        bars: [{ w: 4, h: 11 }, { w: 4, h: 19 }, { w: 4, h: 30 }, { w: 4, h: 19 }, { w: 4, h: 11 }],
        fontSize: 24,
        gap: 12,
        radius: 15,
    },
};

export default function QuakeSenseLogo({
    size = "md",
    showText = true,
    textColor = "#F0F4FF",
}: Props) {
    const s = SIZES[size];

    return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: s.gap }}>
            <LinearGradient
                colors={["#1de99b", "#10B981", "#059669"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                    width: s.box,
                    height: s.box,
                    borderRadius: s.radius,
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#10B981",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.45,
                    shadowRadius: 8,
                    elevation: 8,
                }}
            >
                {/* Sismik dalga çubukları */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 2.5 }}>
                    {s.bars.map((bar, i) => (
                        <View
                            key={i}
                            style={{
                                width: bar.w,
                                height: bar.h,
                                backgroundColor: "rgba(255,255,255,0.92)",
                                borderRadius: bar.w,
                            }}
                        />
                    ))}
                </View>
            </LinearGradient>

            {showText && (
                <Text
                    style={{
                        fontSize: s.fontSize,
                        fontWeight: "900",
                        letterSpacing: -0.5,
                        color: textColor,
                    }}
                >
                    Quake<Text style={{ color: "#10B981" }}>Sense</Text>
                </Text>
            )}
        </View>
    );
}
