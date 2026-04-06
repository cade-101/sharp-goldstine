import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { getTheme } from '../themes';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const TAGLINES: Record<string, string> = {
  spartan:    'The wall holds.',
  centurion:  'Built to last a thousand years.',
  viking:     'The sea is just distance.',
  shogun:     'The field is yours to command.',
  dynasty:    'Built one day at a time.',
  pharaoh:    'Your work outlasts you.',
  oasis:      'Water finds a way.',
  wraith:     'Unseen does not mean absent.',
  solstice:   'The longest day. You made it.',
  druid:      'The stones remember.',
  grove:      'The grove grows what it needs.',
  kraken:     'The deep has no limits.',
  leviathan:  'Ancient. Patient. Inevitable.',
  nebula:     'You are made of this.',
  aurora:     'The light always comes back.',
  wendigo:    'The forest is listening.',
  phoenix:    'You came back. Again.',
};

export interface ThemeUnlockChoiceProps {
  themeKey: string;
  pairKey: string | null;
  onChoose: (theme: string) => void;
  onDismiss: () => void;
}

export const ThemeUnlockChoice: React.FC<ThemeUnlockChoiceProps> = ({
  themeKey,
  pairKey,
  onChoose,
  onDismiss,
}) => {
  const mainTheme   = getTheme(themeKey);
  const pairedTheme = pairKey ? getTheme(pairKey) : null;

  const leftX  = useRef(new Animated.Value(-SCREEN_W / 2)).current;
  const rightX = useRef(new Animated.Value(SCREEN_W / 2)).current;
  const badgeY = useRef(new Animated.Value(-60)).current;
  const badgeO = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    StatusBar.setHidden(true, 'fade');

    Animated.parallel([
      Animated.spring(leftX,  { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
      Animated.spring(rightX, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => {
      Animated.parallel([
        Animated.spring(badgeY, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
        Animated.timing(badgeO, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 300);

    return () => {
      clearTimeout(t);
      StatusBar.setHidden(false, 'fade');
    };
  }, []);

  const handleRight = () => {
    if (pairedTheme && pairKey) {
      onChoose(pairKey);
    } else {
      onDismiss();
    }
  };

  return (
    <View style={styles.root}>
      {/* LEFT HALF — main unlocked theme */}
      <Animated.View style={[styles.half, { transform: [{ translateX: leftX }] }]}>
        <TouchableOpacity
          style={[styles.halfInner, { backgroundColor: mainTheme.bg }]}
          onPress={() => onChoose(themeKey)}
          activeOpacity={0.85}
        >
          <View style={[styles.pill, { backgroundColor: mainTheme.accent }]}>
            <Text style={[styles.pillText, { color: mainTheme.bg }]}>DARK</Text>
          </View>
          <Text style={[styles.themeName, { color: mainTheme.accent }]}>
            {themeKey.toUpperCase()}
          </Text>
          {TAGLINES[themeKey] ? (
            <Text style={[styles.tagline, { color: mainTheme.text }]}>
              {TAGLINES[themeKey]}
            </Text>
          ) : null}
        </TouchableOpacity>
      </Animated.View>

      {/* RIGHT HALF — paired theme or keep current */}
      <Animated.View style={[styles.half, { transform: [{ translateX: rightX }] }]}>
        <TouchableOpacity
          style={[
            styles.halfInner,
            { backgroundColor: pairedTheme ? pairedTheme.bg : mainTheme.bg },
          ]}
          onPress={handleRight}
          activeOpacity={0.85}
        >
          {pairedTheme && pairKey ? (
            <>
              <View style={[styles.pill, { backgroundColor: pairedTheme.accent }]}>
                <Text style={[styles.pillText, { color: pairedTheme.bg }]}>WARM</Text>
              </View>
              <Text style={[styles.themeName, { color: pairedTheme.accent }]}>
                {pairKey.toUpperCase()}
              </Text>
              {TAGLINES[pairKey] ? (
                <Text style={[styles.tagline, { color: pairedTheme.text }]}>
                  {TAGLINES[pairKey]}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <View style={[styles.pill, { backgroundColor: mainTheme.border }]}>
                <Text style={[styles.pillText, { color: mainTheme.muted }]}>CURRENT</Text>
              </View>
              <Text style={[styles.themeName, { color: mainTheme.muted }]}>
                {'KEEP\nCURRENT'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* CENTER DIVIDER */}
      <View style={styles.divider} />

      {/* TOP BADGE */}
      <Animated.View
        style={[
          styles.badgeWrapper,
          { opacity: badgeO, transform: [{ translateY: badgeY }] },
        ]}
      >
        <View style={[styles.badge, { backgroundColor: mainTheme.accent }]}>
          <Text style={[styles.badgeText, { color: mainTheme.bg }]}>
            {themeKey.toUpperCase()} UNLOCKED
          </Text>
        </View>
      </Animated.View>

      {/* BOTTOM HINT */}
      <View style={styles.bottomHint}>
        <Text style={styles.bottomHintText}>TAP A SIDE TO APPLY</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  half: {
    flex: 1,
    height: SCREEN_H,
  },
  halfInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 14,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 4,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
  },
  themeName: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 13,
    opacity: 0.7,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 20,
  },
  divider: {
    position: 'absolute',
    top: 0,
    left: SCREEN_W / 2 - 0.5,
    width: 1,
    height: SCREEN_H,
    backgroundColor: '#ffffff',
    opacity: 0.08,
    zIndex: 5,
  },
  badgeWrapper: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  badge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
  },
  bottomHint: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  bottomHintText: {
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: '600',
    color: '#ffffff',
    opacity: 0.3,
  },
});

export default ThemeUnlockChoice;
