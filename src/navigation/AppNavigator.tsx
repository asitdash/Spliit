import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../types';
import { colors } from '../theme';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import HomeScreen from '../screens/HomeScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import AddMemberScreen from '../screens/AddMemberScreen';
import GroupMembersScreen from '../screens/GroupMembersScreen';
import SettleUpScreen from '../screens/SettleUpScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import EditGroupScreen from '../screens/EditGroupScreen';
import EditExpenseScreen from '../screens/EditExpenseScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { user, appUser, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        {!user || !appUser ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Reset Password' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'SPLIIT', headerBackVisible: false }} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} options={{ title: 'New Group' }} />
            <Stack.Screen
              name="GroupDetail"
              component={GroupDetailScreen}
              options={({ route }) => ({ title: route.params.groupName })}
            />
            <Stack.Screen name="AddExpense" component={AddExpenseScreen} options={{ title: 'Add Expense' }} />
            <Stack.Screen name="AddMember" component={AddMemberScreen} options={{ title: 'Add Member' }} />
            <Stack.Screen
              name="Members"
              component={GroupMembersScreen}
              options={({ route }) => ({ title: `${route.params.groupName} — Members` })}
            />
            <Stack.Screen name="EditGroup" component={EditGroupScreen} options={{ title: 'Edit Group' }} />
            <Stack.Screen name="EditExpense" component={EditExpenseScreen} options={{ title: 'Edit Expense' }} />
            <Stack.Screen name="SettleUp" component={SettleUpScreen} options={{ title: 'Settle Up' }} />
            <Stack.Screen
              name="Analytics"
              component={AnalyticsScreen}
              options={({ route }) => ({ title: `${route.params.groupName} — Analytics` })}
            />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
