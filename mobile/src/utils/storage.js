import * as SecureStore from 'expo-secure-store';
import { logError } from './errors';

const TOKEN_KEY = 'authToken';
const USER_KEY = 'userData';

export const saveToken = async (token) => {
    try {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
        logError('SecureStore Save Token', error);
    }
};

export const getToken = async () => {
    try {
        return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
        logError('SecureStore Get Token', error);
        return null;
    }
};

export const removeToken = async () => {
    try {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
        logError('SecureStore Remove Token', error);
    }
};

export const saveUser = async (user) => {
    try {
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (error) {
        logError('SecureStore Save User', error);
    }
};

export const getUser = async () => {
    try {
        const user = await SecureStore.getItemAsync(USER_KEY);
        return user ? JSON.parse(user) : null;
    } catch (error) {
        logError('SecureStore Get User', error);
        return null;
    }
};

export const removeUser = async () => {
    try {
        await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
        logError('SecureStore Remove User', error);
    }
};

export const clearAll = async () => {
    await removeToken();
    await removeUser();
};
