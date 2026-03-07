/**
 * ProgressRing — Dairesel ilerleme göstergesi.
 * SVG bağımlılığı olmadan, Animated View half-circle tekniği ile çalışır.
 */

import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Colors, Typography } from "../constants/theme";

interface ProgressRingProps {
    progress: number; // 0–100
    size?: number;
    strokeWidth?: number;
    color?: string;
    bgColor?: string;
    textColor?: string;
    showLabel?: boolean;
    label?: string;
}

export default function ProgressRing({
    progress,
    size = 120,
    strokeWidth = 10,
    color = Colors.primary,
    bgColor = Colors.background.elevated,
    textColor = Colors.text.dark,
    showLabel = true,
    label,
}: ProgressRingProps) {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const clampedProgress = Math.max(0, Math.min(100, progress));

    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: clampedProgress,
            duration: 800,
            useNativeDriver: false,
        }).start();
    }, [clampedProgress]);

    const halfSize = size / 2;
    const innerSize = size - strokeWidth * 2;

    // Right half rotation (0-180°)
    const rightRotation = animatedValue.interpolate({
        inputRange: [0, 50, 100],
        outputRange: ["0deg", "180deg", "180deg"],
        extrapolate: "clamp",
    });

    // Left half rotation (0-180°), only after 50%
    const leftRotation = animatedValue.interpolate({
        inputRange: [0, 50, 100],
        outputRange: ["0deg", "0deg", "180deg"],
        extrapolate: "clamp",
    });

    // Left half opacity (hidden until 50%)
    const leftOpacity = animatedValue.interpolate({
        inputRange: [0, 49.9, 50],
        outputRange: [0, 0, 1],
        extrapolate: "clamp",
    });

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* Background circle */}
            <View
                style={[
                    styles.circle,
                    {
                        width: size,
                        height: size,
                        borderRadius: halfSize,
                        backgroundColor: bgColor,
                    },
                ]}
            />

            {/* Right half */}
            <View
                style={[
                    styles.halfCircleContainer,
                    {
                        width: halfSize,
                        height: size,
                        left: halfSize,
                    },
                ]}
            >
                <Animated.View
                    style={[
                        styles.halfCircle,
                        {
                            width: halfSize,
                            height: size,
                            borderTopRightRadius: halfSize,
                            borderBottomRightRadius: halfSize,
                            backgroundColor: color,
                            left: -halfSize,
                            transform: [
                                { translateX: halfSize / 2 },
                                { rotate: rightRotation },
                                { translateX: -halfSize / 2 },
                            ],
                        },
                    ]}
                />
            </View>

            {/* Left half */}
            <Animated.View
                style={[
                    styles.halfCircleContainer,
                    {
                        width: halfSize,
                        height: size,
                        left: 0,
                        opacity: leftOpacity,
                    },
                ]}
            >
                <Animated.View
                    style={[
                        styles.halfCircle,
                        {
                            width: halfSize,
                            height: size,
                            borderTopLeftRadius: halfSize,
                            borderBottomLeftRadius: halfSize,
                            backgroundColor: color,
                            left: halfSize,
                            transform: [
                                { translateX: -halfSize / 2 },
                                { rotate: leftRotation },
                                { translateX: halfSize / 2 },
                            ],
                        },
                    ]}
                />
            </Animated.View>

            {/* Inner circle (center cutout) */}
            <View
                style={[
                    styles.inner,
                    {
                        width: innerSize,
                        height: innerSize,
                        borderRadius: innerSize / 2,
                        backgroundColor: Colors.background.dark,
                    },
                ]}
            >
                {showLabel && (
                    <View style={styles.labelContainer}>
                        <Text style={[styles.percentage, { color: textColor, fontSize: size * 0.22 }]}>
                            %{Math.round(clampedProgress)}
                        </Text>
                        {label && (
                            <Text style={[styles.label, { color: Colors.text.muted, fontSize: size * 0.08 }]}>
                                {label}
                            </Text>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "relative",
        justifyContent: "center",
        alignItems: "center",
    },
    circle: {
        position: "absolute",
    },
    halfCircleContainer: {
        position: "absolute",
        top: 0,
        overflow: "hidden",
    },
    halfCircle: {
        position: "absolute",
        top: 0,
    },
    inner: {
        position: "absolute",
        justifyContent: "center",
        alignItems: "center",
    },
    labelContainer: {
        alignItems: "center",
    },
    percentage: {
        fontWeight: "900",
        letterSpacing: -1,
    },
    label: {
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginTop: 2,
    },
});
