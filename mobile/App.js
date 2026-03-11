import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, BackHandler } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { getToken } from './src/utils/storage';

// Import Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import SelectionScreen from './src/screens/auth/SelectionScreen';
import SeekerScreen from './src/screens/seeker/SeekerScreen';
import DashboardScreen from './src/screens/donor/DashboardScreen';
import ChatbotScreen from './src/screens/donor/ChatbotScreen';
import EditProfileScreen from './src/screens/donor/EditProfileScreen';
import AnalysisScreen from './src/screens/donor/AnalysisScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Loading');
  const [userData, setUserData] = useState(null); // To pass to screens
  const [statsData, setStatsData] = useState(null); // To pass to screens
  const [reportsData, setReportsData] = useState([]); // To pass to screens
  const [userToken, setUserToken] = useState(null);

  useEffect(() => {
    checkAuth();

    const backAction = () => {
      if (currentScreen === 'Dashboard' || currentScreen === 'Login') {
        return false; // Exit app if on main screens
      }

      // Navigate back to Dashboard or Selection from sub-screens
      if (['EditProfile', 'Chatbot', 'Analysis', 'Register', 'Seeker'].includes(currentScreen)) {
        navigationProxy.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [currentScreen, userToken]);

  const checkAuth = async () => {
    const token = await getToken();
    setUserToken(token);
    // Only set screen if loading or if we explicitly want to redirect
    if (currentScreen === 'Loading') {
      setCurrentScreen(token ? 'Dashboard' : 'Selection');
    }
  };

  const navigate = (screenName) => {
    setCurrentScreen(screenName);
    // Special case: if we login, re-check token
    if (screenName === 'Dashboard' || screenName === 'Login') {
      checkAuth();
    }
  };

  if (currentScreen === 'Loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#dc2626" />
      </View>
    );
  }

  const navigationProxy = {
    navigate: (name, params) => {
      if (params?.user) setUserData(params.user);
      if (params?.stats) setStatsData(params.stats);
      if (params?.reports) setReportsData(params.reports);
      navigate(name);
    },
    replace: (name, params) => {
      if (params?.user) setUserData(params.user);
      if (params?.stats) setStatsData(params.stats);
      if (params?.reports) setReportsData(params.reports);
      navigate(name);
    },
    setParams: (params) => {
      if (params?.user) setUserData(params.user);
      if (params?.stats) setStatsData(params.stats);
      if (params?.reports) setReportsData(params.reports);
    },
    goBack: () => {
      if (currentScreen === 'Seeker' || currentScreen === 'Register') {
        navigate('Selection');
      } else {
        navigate(userToken ? 'Dashboard' : 'Login');
      }
    },
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        {currentScreen === 'Selection' && <SelectionScreen navigation={navigationProxy} />}
        {currentScreen === 'Seeker' && <SeekerScreen navigation={navigationProxy} />}
        {currentScreen === 'Login' && <LoginScreen navigation={navigationProxy} />}
        {currentScreen === 'Register' && <RegisterScreen navigation={navigationProxy} />}
        {currentScreen === 'Dashboard' && (
          <DashboardScreen
            navigation={navigationProxy}
            route={{ params: { user: userData, stats: statsData, reports: reportsData } }}
          />
        )}
        {currentScreen === 'Chatbot' && (
          <ChatbotScreen
            navigation={navigationProxy}
            route={{ params: { user: userData, stats: statsData } }}
          />
        )}
        {currentScreen === 'EditProfile' && (
          <EditProfileScreen
            navigation={navigationProxy}
            route={{ params: { user: userData } }}
          />
        )}
        {currentScreen === 'Analysis' && (
          <AnalysisScreen
            navigation={navigationProxy}
            route={{ params: { user: userData, stats: statsData, reports: reportsData } }}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}
