import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Text, Platform } from 'react-native';
import MapView, { Heatmap, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Earthquake } from '../types/earthquake';

interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number;
}

interface SeismicHeatmapProps {
  visible: boolean;
  onToggle: () => void;
}

const MAGNITUDE_WEIGHT_MAP: Record<string, number> = {
  micro: 0.2,
  minor: 0.4,
  light: 0.6,
  moderate: 0.8,
  strong: 1.0,
  major: 1.0,
  great: 1.0,
};

const getMagnitudeCategory = (magnitude: number): string => {
  if (magnitude < 2.0) return 'micro';
  if (magnitude < 3.0) return 'minor';
  if (magnitude < 4.0) return 'light';
  if (magnitude < 5.0) return 'moderate';
  if (magnitude < 6.0) return 'strong';
  if (magnitude < 7.0) return 'major';
  return 'great';
};

const calculateWeight = (earthquake: Earthquake): number => {
  const category = getMagnitudeCategory(earthquake.magnitude);
  const baseWeight = MAGNITUDE_WEIGHT_MAP[category] || 0.5;
  const now = Date.now();
  const quakeTime = new Date(earthquake.date).getTime();
  const ageInDays = (now - quakeTime) / (1000 * 60 * 60 * 24);
  const recencyMultiplier = Math.max(0.1, 1 - ageInDays / 30);
  return Math.min(1.0, baseWeight * recencyMultiplier);
};

const SeismicHeatmap: React.FC<SeismicHeatmapProps> = ({ visible, onToggle }) => {
  const earthquakes = useSelector((state: RootState) => state.earthquakes.list);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [opacity, setOpacity] = useState(0.7);
  const [radius, setRadius] = useState(40);
  const [gradient, setGradient] = useState<'default' | 'risk' | 'density'>('risk');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;

  const GRADIENTS = {
    default: {
      colors: ['#00FF00', '#FFFF00', '#FF8C00', '#FF0000', '#8B0000'],
      startPoints: [0.0, 0.25, 0.5, 0.75, 1.0],
    },
    risk: {
      colors: ['#1A237E', '#283593', '#7B1FA2', '#C62828', '#B71C1C'],
      startPoints: [0.0, 0.2, 0.5, 0.8, 1.0],
    },
    density: {
      colors: ['#006064', '#00838F', '#F57F17', '#E65100', '#BF360C'],
      startPoints: [0.0, 0.3, 0.6, 0.8, 1.0],
    },
  };

  const processHeatmapData = useCallback(() => {
    if (!earthquakes || earthquakes.length === 0) return;
    const points: HeatmapPoint[] = earthquakes
      .filter((eq: Earthquake) => eq.latitude && eq.longitude && eq.magnitude)
      .map((eq: Earthquake) => ({
        latitude: parseFloat(String(eq.latitude)),
        longitude: parseFloat(String(eq.longitude)),
        weight: calculateWeight(eq),
      }))
      .filter((p: HeatmapPoint) => !isNaN(p.latitude) && !isNaN(p.longitude));
    setHeatmapPoints(points);
  }, [earthquakes]);

  useEffect(() => {
    processHeatmapData();
  }, [processHeatmapData]);

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
      pulseAnim.stopAnimation();
    }
  }, [visible]);

  useEffect(() => {
    Animated.spring(badgeAnim, {
      toValue: heatmapPoints.length > 0 ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [heatmapPoints.length]);

  const cycleGradient = () => {
    const order: Array<'default' | 'risk' | 'density'> = ['default', 'risk', 'density'];
    const currentIndex = order.indexOf(gradient);
    setGradient(order[(currentIndex + 1) % order.length]);
  };

  const currentGradient = GRADIENTS[gradient];

  if (Platform.OS === 'web') return null;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.controlPanel, { opacity: fadeAnim }]}>
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Yoğunluk</Text>
          <View style={styles.sliderRow}>
            <TouchableOpacity
              style={styles.sliderBtn}
              onPress={() => setOpacity(Math.max(0.2, opacity - 0.1))}
            >
              <Text style={styles.sliderBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderFill, { width: `${opacity * 100}%` }]} />
            </View>
            <TouchableOpacity
              style={styles.sliderBtn}
              onPress={() => setOpacity(Math.min(1.0, opacity + 0.1))}
            >
              <Text style={styles.sliderBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Yarıçap</Text>
          <View style={styles.sliderRow}>
            <TouchableOpacity
              style={styles.sliderBtn}
              onPress={() => setRadius(Math.max(20, radius - 5))}
            >
              <Text style={styles.sliderBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderFill, { width: `${((radius - 20) / 80) * 100}%` }]} />
            </View>
            <TouchableOpacity
              style={styles.sliderBtn}
              onPress={() => setRadius(Math.min(100, radius + 5))}
            >
              <Text style={styles.sliderBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.gradientBtn} onPress={cycleGradient}>
          <View style={styles.gradientPreview}>
            {currentGradient.colors.map((color, i) => (
              <View key={i} style={[styles.gradientSwatch, { backgroundColor: color }]} />
            ))}
          </View>
          <Text style={styles.gradientLabel}>
            {gradient === 'default' ? 'Standart' : gradient === 'risk' ? 'Risk' : 'Yoğunluk'}
          </Text>
        </TouchableOpacity>
        <Animated.View style={[styles.badge, { transform: [{ scale: badgeAnim }] }]}>
          <Text style={styles.badgeText}>{heatmapPoints.length} nokta</Text>
        </Animated.View>
      </Animated.View>

      {visible && heatmapPoints.length > 0 && (
        <Heatmap
          points={heatmapPoints}
          opacity={opacity}
          radius={radius}
          gradient={currentGradient}
        />
      )}

      <TouchableOpacity
        style={[styles.toggleBtn, visible && styles.toggleBtnActive]}
        onPress={onToggle}
        activeOpacity={0.85}
      >
        <Animated.View style={{ transform: [{ scale: visible ? pulseAnim : new Animated.Value(1) }] }}>
          <Text style={styles.toggleIcon}>🔥</Text>
        </Animated.View>
        <Text style={[styles.toggleLabel, visible && styles.toggleLabelActive]}>
          {visible ? 'Isı Haritası Açık' : 'Isı Haritası'}
        </Text>
        {visible && (
          <View style={styles.proChip}>
            <Text style={styles.proChipText}>PRO</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    zIndex: 999,
    alignItems: 'flex-end',
  },
  controlPanel: {
    backgroundColor: 'rgba(10,10,30,0.92)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    minWidth: 220,
    borderWidth: 1,
    borderColor: 'rgba(100,100,255,0.3)',
    shadowColor: '#5C6BC0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  controlRow: {
    marginBottom: 10,
  },
  controlLabel: {
    color: '#90CAF9',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sliderBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(92,107,192,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100,130,255,0.4)',
  },
  sliderBtnText: {
    color: '#E3F2FD',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#5C6BC0',
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 8,
    marginTop: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gradientPreview: {
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 8,
  },
  gradientSwatch: {
    width: 16,
    height: 16,
  },
  gradientLabel: {
    color: '#B0BEC5',
    fontSize: 12,
    fontWeight: '500',
  },
  badge: {
    marginTop: 8,
    backgroundColor: 'rgba(92,107,192,0.3)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(100,130,255,0.4)',
  },
  badgeText: {
    color: '#90CAF9',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,30,0.88)',
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(100,100,200,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 8,
  },
  toggleBtnActive: {
    borderColor: '#EF5350',
    backgroundColor: 'rgba(30,10,10,0.92)',
    shadowColor: '#EF5350',
    shadowOpacity: 0.5,
  },
  toggleIcon: {
    fontSize: 18,
  },
  toggleLabel: {
    color: '#90A4AE',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  toggleLabelActive: {
    color: '#EF9A9A',
  },
  proChip: {
    backgroundColor: '#EF5350',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  proChipText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

export default SeismicHeatmap;