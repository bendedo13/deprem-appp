import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';

interface HeatmapLegendProps {
  visible: boolean;
  onClose: () => void;
  gradient: 'default' | 'risk' | 'density';
}

const LEGEND_DATA = {
  default: [
    { color: '#00FF00', label: 'Çok Düşük', range: '< M2.0' },
    { color: '#FFFF00',