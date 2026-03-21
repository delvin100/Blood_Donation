import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure how notifications are handled when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const requestNotificationPermissions = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return false;
  }

  // NOTE: On SDK 54+ Expo Go, remote push notifications are not supported.
  // However, Local notifications (scheduled/immediate) still work.
  
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return true;
};

export const getExpoToken = async () => {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (error) {
    console.warn("Failed to get Expo Push Token:", error);
    return null;
  }
};

export const setBadgeCount = async (count) => {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    await Notifications.setBadgeCountAsync(count);
  }
};

export const scheduleLocalNotification = async (title, body, date) => {
  const now = new Date().getTime();
  const trigger = new Date(date).getTime();
  
  if (trigger <= now) return; // Don't schedule for the past

  // Cancel existing notifications with same title to avoid duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      badge: 1,
      data: { url: 'Dashboard' },
    },
    trigger: { date: new Date(trigger) },
  });
};

export const sendImmediateNotification = async (title, body) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      badge: 1,
    },
    trigger: null,
  });
};
