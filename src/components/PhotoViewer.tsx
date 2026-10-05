import React, { useRef, useEffect } from 'react';
import {
  Modal,
  Pressable,
  Animated,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  NativeTouchEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../constants/theme';

interface Props {
  /** Photo to display; null hides the viewer. */
  uri: string | null;
  onClose: () => void;
}

const MAX_SCALE        = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS    = 280;

/**
 * Fullscreen photo viewer with pinch-to-zoom, double-tap zoom toggle and
 * one-finger pan while zoomed. Pure Animated + PanResponder — no extra deps.
 */
export function PhotoViewer({ uri, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const scale      = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Committed (post-gesture) values
  const curScale = useRef(1);
  const curTX    = useRef(0);
  const curTY    = useRef(0);

  const pinchStart = useRef(0);   // finger distance at pinch start
  const lastTapAt  = useRef(0);
  const isPinching = useRef(false);

  const distance = (touches: readonly NativeTouchEvent[]): number =>
    Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);

  const springTo = (s: number, tx: number, ty: number) => {
    curScale.current = s; curTX.current = tx; curTY.current = ty;
    Animated.parallel([
      Animated.spring(scale,      { toValue: s,  useNativeDriver: true }),
      Animated.spring(translateX, { toValue: tx, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: ty, useNativeDriver: true }),
    ]).start();
  };

  const reset = () => springTo(1, 0, 0);

  // Start from a clean state each time a new photo opens
  useEffect(() => {
    if (uri) {
      curScale.current = 1; curTX.current = 0; curTY.current = 0;
      scale.setValue(1); translateX.setValue(0); translateY.setValue(0);
    }
  }, [uri]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (e, g) =>
        e.nativeEvent.touches.length === 2 ||
        (curScale.current > 1 && (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4)),

      onPanResponderGrant: (e) => {
        const touches = e.nativeEvent.touches;
        if (touches.length === 2) {
          isPinching.current = true;
          pinchStart.current = distance(touches);
          return;
        }
        // Double-tap: toggle between fit and zoomed
        const now = Date.now();
        if (now - lastTapAt.current < DOUBLE_TAP_MS) {
          if (curScale.current > 1) reset();
          else springTo(DOUBLE_TAP_SCALE, 0, 0);
          lastTapAt.current = 0;
        } else {
          lastTapAt.current = now;
        }
      },

      onPanResponderMove: (e, g) => {
        const touches = e.nativeEvent.touches;
        if (touches.length === 2) {
          if (!isPinching.current) {
            isPinching.current = true;
            pinchStart.current = distance(touches);
            return;
          }
          const ratio = distance(touches) / (pinchStart.current || 1);
          const next  = Math.min(MAX_SCALE, Math.max(0.7, curScale.current * ratio));
          scale.setValue(next);
        } else if (!isPinching.current && curScale.current > 1) {
          translateX.setValue(curTX.current + g.dx);
          translateY.setValue(curTY.current + g.dy);
        }
      },

      onPanResponderRelease: (e, g) => {
        if (isPinching.current) {
          isPinching.current = false;
          scale.stopAnimation((s) => {
            if (s <= 1.02) reset();
            else { curScale.current = Math.min(MAX_SCALE, s); }
          });
          return;
        }
        if (curScale.current > 1) {
          curTX.current += g.dx;
          curTY.current += g.dy;
        }
      },
      onPanResponderTerminate: () => { isPinching.current = false; },
    })
  ).current;

  return (
    <Modal visible={uri !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        {uri && (
          <Animated.Image
            source={{ uri }}
            style={[
              styles.image,
              { transform: [{ translateX }, { translateY }, { scale }] },
            ]}
            resizeMode="contain"
            {...panResponder.panHandlers}
          />
        )}
        <TouchableOpacity
          style={[styles.close, { top: Math.max(insets.top, 12) + 8 }]}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Close photo"
        >
          <Ionicons name="close" size={24} color={colors.white} />
        </TouchableOpacity>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '85%' },
  close: {
    position: 'absolute',
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
