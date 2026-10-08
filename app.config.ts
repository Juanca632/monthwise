import type { ConfigContext, ExpoConfig } from 'expo/config';

type Variant = 'development' | 'preview' | 'production';

const UNUSED_TEMPLATE_PERMISSIONS = [
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
];

// Fails closed: an unset or mistyped APP_VARIANT gives the most locked-down build (plan, Key Design Notes).
function resolveVariant(raw: string | undefined): Variant {
  return raw === 'development' || raw === 'preview' ? raw : 'production';
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant(process.env.APP_VARIANT);

  return {
    ...config,
    name: 'Monthwise',
    slug: 'monthwise',
    owner: 'juanca632',
    scheme: 'monthwise',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    android: {
      package: 'io.github.juanca632.monthwise',
      allowBackup: false,
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      // Expo's template asks for these, but the app never uses them. Development keeps INTERNET
      // because Expo Go and the dev server need it.
      blockedPermissions: [
        ...UNUSED_TEMPLATE_PERMISSIONS,
        ...(variant === 'development' ? [] : ['android.permission.INTERNET']),
      ],
    },
    plugins: [
      'expo-router',
      'expo-sqlite',
      'expo-localization',
      'expo-status-bar',
      '@react-native-community/datetimepicker',
      'expo-font',
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 200,
          backgroundColor: '#F6F7F9',
          dark: { image: './assets/splash-icon.png', backgroundColor: '#0D0F13' },
        },
      ],
      './plugins/withNoDataExtraction',
    ],
    extra: { variant, eas: { projectId: 'ae92f6e2-d60d-4f92-b1cf-9bd9cffe660b' } },
  };
};
