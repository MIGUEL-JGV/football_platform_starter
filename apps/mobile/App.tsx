import React from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/auth/AuthContext';
import { RootStackParamList, TabParamList } from './src/navigation/types';
import HomeScreen from './src/screens/HomeScreen';
import TournamentDetailScreen from './src/screens/TournamentDetailScreen';
import MatchDetailScreen from './src/screens/MatchDetailScreen';
import TeamProfileScreen from './src/screens/TeamProfileScreen';
import PlayerProfileScreen from './src/screens/PlayerProfileScreen';
import PlayerPhotoScreen from './src/screens/PlayerPhotoScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MyTournamentsScreen from './src/screens/MyTournamentsScreen';
import AccountScreen from './src/screens/AccountScreen';
import CreateTournamentScreen from './src/screens/CreateTournamentScreen';
import ApplyEntryScreen from './src/screens/ApplyEntryScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ icon, color }: { icon: string; color: string }) {
  return <Text style={{ fontSize: 18, color }}>{icon}</Text>;
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <TabIcon icon="🏠" color={color} />,
        }}
      />
      <Tab.Screen
        name="MyTournaments"
        component={MyTournamentsScreen}
        options={{
          title: 'Mis torneos',
          tabBarIcon: ({ color }) => <TabIcon icon="⭐" color={color} />,
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Cuenta',
          tabBarIcon: ({ color }) => <TabIcon icon="👤" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerTitleStyle: { fontWeight: '800', color: colors.ink },
              headerTintColor: colors.ink,
              headerStyle: { backgroundColor: colors.bg },
              contentStyle: { backgroundColor: colors.bg },
              statusBarTranslucent: true,
            }}
          >
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="TournamentDetail"
              component={TournamentDetailScreen}
              options={{ title: 'Torneo' }}
            />
            <Stack.Screen
              name="MatchDetail"
              component={MatchDetailScreen}
              options={{ title: 'Partido' }}
            />
            <Stack.Screen
              name="CreateTournament"
              component={CreateTournamentScreen}
              options={{ title: 'Crear torneo' }}
            />
            <Stack.Screen
              name="ApplyEntry"
              component={ApplyEntryScreen}
              options={{ title: 'Inscribir equipo' }}
            />
            <Stack.Screen
              name="TeamProfile"
              component={TeamProfileScreen}
              options={{ title: 'Equipo' }}
            />
            <Stack.Screen
              name="PlayerProfile"
              component={PlayerProfileScreen}
              options={{ title: 'Jugador' }}
            />
            <Stack.Screen
              name="PlayerPhoto"
              component={PlayerPhotoScreen}
              options={{ title: 'Fotografías' }}
            />
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ title: 'Iniciar sesión', presentation: 'modal' }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ title: 'Crear cuenta', presentation: 'modal' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}