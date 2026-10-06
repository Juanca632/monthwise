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
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DatabaseProvider } from '@/data/DatabaseProvider';
import { logTiming } from '@/lib/devLog';
import { msSinceStartup } from '@/lib/sinceStartup';
import { SelectedMonthProvider } from '@/state/SelectedMonthContext';
import { SheetTransitionProvider } from '@/state/SheetTransitionContext';
import { ToastProvider } from '@/state/ToastContext';
import { SummaryNoticeProvider } from '@/state/SummaryNoticeContext';
import { ShapePressable } from '@/ui/glass';
import { Toast } from '@/ui/Toast';
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

/** SC-004 startup lines; skipped when the platform does not report the runtime start. */
function logSinceStartup(name: string) {
  const ms = msSinceStartup();
  if (ms !== null) logTiming(name, ms);
}

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
      <ShapePressable
        accessibilityRole="button"
        accessibilityLabel="Try again"
        onPress={onRetry}
        style={[
          styles.retryButton,
          { backgroundColor: colors.fieldFill, borderColor: colors.fieldBorder },
        ]}
      >
        <Text style={[type.bodyStrong, { color: colors.text }]}>Try again</Text>
      </ShapePressable>
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
  const { colors, scheme } = useTheme();

  // The navigator paints its own background during transitions; its default theme is light, so
  // without this a dark app flashes white when a screen closes.
  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: colors.background, card: colors.background } };
  }, [scheme, colors.background]);

  // The native root view sits under every screen and shows through while one closes. Its default
  // is white, so it follows the palette, including when the system switches light/dark.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  useEffect(() => {
    logSinceStartup('bundle-ready');
    setFatalListener(() => setFatal(true));
    return () => setFatalListener(null);
  }, []);

  useEffect(() => {
    if (!fontsSettled) return;
    // On a font error the app goes on with the system font (theme.ts falls back).
    logSinceStartup('fonts-ready');
    SplashScreen.hideAsync().catch(() => {});
  }, [fontsSettled]);

  // Gestures (the sheet's drag to close) only work inside this view, so it wraps everything; its
  // background shows for a frame before the first screen paints.
  const rootStyle = [styles.root, { backgroundColor: colors.background }];

  if (fatal) {
    return (
      <GestureHandlerRootView style={rootStyle}>
        <GenericErrorScreen onRetry={() => setFatal(false)} />
      </GestureHandlerRootView>
    );
  }

  // The providers mount right away, so the database opens while the fonts load; only the
  // screens wait for the fonts.
  return (
    <GestureHandlerRootView style={rootStyle}>
      <DatabaseProvider>
        <SelectedMonthProvider>
          <SummaryNoticeProvider>
            <SheetTransitionProvider>
              <ToastProvider>
                {fontsSettled && (
                  <ThemeProvider value={navigationTheme}>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: colors.background },
                      }}
                    >
                      <Stack.Screen name="index" />
                      <Stack.Screen name="transaction/new" options={FORM_SHEET} />
                      <Stack.Screen name="transaction/[id]" options={FORM_SHEET} />
                    </Stack>
                  </ThemeProvider>
                )}
                {/* Above the navigator, so it shows over the summary while the sheet closes. */}
                {fontsSettled && <Toast />}
              </ToastProvider>
            </SheetTransitionProvider>
            <StatusBar style="auto" />
          </SummaryNoticeProvider>
        </SelectedMonthProvider>
      </DatabaseProvider>
    </GestureHandlerRootView>
  );
}

// The forms draw their own sheet over the summary, which stays drawn behind; the app animates it,
// so the native modal animation would only double it (design.md, Motion, "Sheet").
const FORM_SHEET = {
  presentation: 'transparentModal',
  animation: 'none',
  contentStyle: { backgroundColor: 'transparent' },
} as const;

const styles = StyleSheet.create({
  root: { flex: 1 },
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
