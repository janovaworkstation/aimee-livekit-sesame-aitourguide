import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AimeeHomeScreen from '../screens/AimeeHomeScreen';
import AimeeConversationScreen from '../screens/AimeeConversationScreen';
import VoiceScreen from '../screens/VoiceScreen';
import TourScreen from '../screens/TourScreen';

export type RootStackParamList = {
  AimeeHome: undefined;
  AimeeConversation: undefined;
  Voice: undefined;
  Tour: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="AimeeHome"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="AimeeHome"
          component={AimeeHomeScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AimeeConversation"
          component={AimeeConversationScreen}
          options={{
            title: 'AImee Conversation',
            headerStyle: {
              backgroundColor: '#CD7F32',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 18,
            },
          }}
        />
        <Stack.Screen
          name="Voice"
          component={VoiceScreen}
          options={{
            title: 'LiveKit Audio Test',
            headerStyle: {
              backgroundColor: '#2196F3',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 18,
            },
          }}
        />
        <Stack.Screen
          name="Tour"
          component={TourScreen}
          options={{
            title: 'AImee Tour Guide',
            headerStyle: {
              backgroundColor: '#4CAF50',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 18,
            },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}