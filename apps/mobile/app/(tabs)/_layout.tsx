import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { appConfig } from '@pawroute/config';

const c = appConfig.brand.colors;

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textSecondary,
        tabBarStyle: {
          backgroundColor: c.background,
          borderTopColor: c.lavenderDark,
          paddingBottom: 8, paddingTop: 4, height: 64,
        },
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 11 },
        headerStyle: { backgroundColor: c.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
      }}
    >
      <Tabs.Screen name="index"
        options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="pets"
        options={{ title: 'My Pets', tabBarIcon: ({ focused }) => <TabIcon emoji="🐾" focused={focused} /> }} />
      <Tabs.Screen name="services"
        options={{ title: 'Services', tabBarIcon: ({ focused }) => <TabIcon emoji="✂️" focused={focused} /> }} />
      <Tabs.Screen name="appointments"
        options={{ title: 'Bookings', tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} /> }} />
      <Tabs.Screen name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }} />
    </Tabs>
  );
}
