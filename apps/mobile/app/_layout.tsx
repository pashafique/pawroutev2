import { initSentry } from '../lib/sentry';
initSentry();

import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { appConfig } from '@pawroute/config';
import { isAuthenticated } from '../lib/auth';

// Keep splash screen until fonts + auth check are done
SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!fontsLoaded) return;

    isAuthenticated().then((authed) => {
      setAuthChecked(true);
      SplashScreen.hideAsync();
      if (!authed) {
        router.replace('/(auth)/login');
      }
    });
  }, [fontsLoaded]);

  if (!fontsLoaded || !authChecked) return null;

  return (
    <>
      <StatusBar style="light" backgroundColor={appConfig.brand.colors.primary} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: appConfig.brand.colors.primary },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 18 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: appConfig.brand.colors.background },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
