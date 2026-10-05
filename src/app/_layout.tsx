// Must stay the first import: it silences console output before any other module can log.
import { setFatalListener } from '@/lib/silenceLogs';

import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { Feather } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DatabaseProvider } from '@/data/DatabaseProvider';
import { logTiming } from '@/lib/devLog';
import { SelectedMonthProvider } from '@/state/SelectedMonthContext';
import { SummaryNoticeProvider } from '@/state/SummaryNoticeContext';
import { minTouch, radii, spacing, useTheme } from '@/ui/theme';

// Keeps the splash up until the fonts settle, so text never flashes in the wrong font. The promise
// rejects if the splash is already gone (fast refresh); nothing to do then.
SplashScreen.preventAutoHideAsync().catch(() => {});

const FONTS = {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  // Loaded with the text fonts so icons do not pop in after the first frame.
  ...Feather.font,
};

/** Shown for render errors and fatal JS errors. Never shows error text: it could contain data. */
function GenericErrorScreen({ onRetry }: { onRetry: () => void }) {
  const { colors, type } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.errorScreen,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left + spacing.xl,
          paddingRight: insets.right + spacing.xl,
        },
      ]}
    >
      <Text style={[type.body, { color: colors.text, textAlign: 'center' }]}>
        Something went wrong.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        android_ripple={{ color: colors.ripple }}
        style={[styles.retryButton, { backgroundColor: colors.surfaceMuted }]}
      >
        <Text style={[type.bodyStrong, { color: colors.text }]}>Try again</Text>
      </Pressable>
    </View>
  );
}

/** Expo Router renders this when a screen throws while rendering. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <GenericErrorScreen onRetry={() => void retry()} />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONTS);
  const fontsSettled = fontsLoaded || fontError !== null;
  const [fatal, setFatal] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    // performance.now() counts from the JS runtime start, so this is the bundle load time.
    logTiming('bundle-ready', performance.now());
    setFatalListener(() => setFatal(true));
    return () => setFatalListener(null);
  }, []);

  useEffect(() => {
    if (!fontsSettled) return;
    // On a font error the app goes on with the system font (theme.ts falls back).
    logTiming('fonts-ready', performance.now());
    SplashScreen.hideAsync().catch(() => {});
  }, [fontsSettled]);

  if (fatal) return <GenericErrorScreen onRetry={() => setFatal(false)} />;

  // The providers mount right away, so the database opens while the fonts load; only the
  // screens wait for the fonts.
  return (
    <DatabaseProvider>
      <SelectedMonthProvider>
        <SummaryNoticeProvider>
          {fontsSettled && (
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="transaction/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal' }} />
            </Stack>
          )}
          <StatusBar style="auto" />
        </SummaryNoticeProvider>
      </SelectedMonthProvider>
    </DatabaseProvider>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  retryButton: {
    minHeight: minTouch,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    // Clips the ripple to the rounded shape (design.md, Touch feedback).
    overflow: 'hidden',
  },
});
