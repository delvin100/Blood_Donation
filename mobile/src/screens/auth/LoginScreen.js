import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    ImageBackground,
    Dimensions,
    Alert,
    Image,
    BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import apiService from '../../api/apiService';
import { saveToken, saveUser } from '../../utils/storage';
import ForgotPasswordModal from '../../components/common/ForgotPasswordModal';
import GoogleIcon from '../../components/common/GoogleIcon';
import { parseError, logError } from '../../utils/errors';



const { width } = Dimensions.get('window');

// Native Google Auth Configuration (using environment variables with testgoogle fallbacks)
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_TEST_WEB_CLIENT_ID || '280724731299-e648k1lk5p148b61fo13qp4q3n4gbmr2.apps.googleusercontent.com';
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_TEST_ANDROID_CLIENT_ID || '280724731299-mq3okv1u9to11fcgsj0ent9ukpu8dgpu.apps.googleusercontent.com';

GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    offlineAccess: true,
    scopes: ['profile', 'email'],
});

const LoginScreen = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showErrors, setShowErrors] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);

    const handleGoogleLogin = async () => {
        try {
            setIsLoading(true);
            setError('');
            
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            
            // This shows the native Google account picker
            await GoogleSignin.signIn();
            const tokens = await GoogleSignin.getTokens();
            const idToken = tokens.idToken;

            if (!idToken) {
                setError('Failed to get ID token from Google');
                return;
            }

            // Exchange token with our backend
            await handleBackendAuth(idToken);
            
        } catch (error) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                // User cancelled — do nothing
            } else if (error.code === statusCodes.IN_PROGRESS) {
                Alert.alert('Info', 'Sign in already in progress');
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert('Error', 'Google Play Services not available');
            } else {
                logError('Google Native Login Error', error);
                setError(error.message || 'Something went wrong during Google Sign In');
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const backAction = () => {
            navigation.navigate('Selection');
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [navigation]);

    const handleBackendAuth = async (idToken) => {
        try {
            setIsLoading(true);
            setError('');
            console.log('Exchanging Google ID token with backend...');
            const res = await apiService.post('/auth/google', {
                idToken
            });

            console.log('Backend Google Auth Response:', res.data);
            const { token, user } = res.data;

            await saveToken(token);
            await saveUser(user);

            // Check if profile is complete (e.g., has blood_type)
            if (!user.blood_type || !user.dob) {
                console.log('Incomplete profile detected, redirecting to complete profile...');
                navigation.navigate('EditProfile', { user, isFirstTime: true });
            } else {
                navigation.navigate('Dashboard');
            }
        } catch (err) {
            logError('Google Backend Auth Error', err);
            setError(parseError(err));
        } finally {
            setIsLoading(false);
        }
    };




    const handleLogin = async () => {
        if (!username || !password) {
            setError('Please enter both username and password');
            setShowErrors(true);
            return;
        }
        setShowErrors(false);

        setIsLoading(true);
        setError('');
        console.log('Attempting login with username:', username);
        try {
            const loginUrl = '/auth/login';
            console.log('Post to:', loginUrl);
            const response = await apiService.post(loginUrl, {
                username,
                password,
            });

            console.log('Login Response:', response.data);
            const { token, user } = response.data;

            console.log('Saving credentials...');
            await saveToken(token);
            await saveUser(user);

            console.log('Navigating to Dashboard...');
            navigation.navigate('Dashboard');
        } catch (err) {
            logError('Login Error', err);
            setError(parseError(err));
        } finally {
            console.log('Login attempt finished.');
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.flex}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Selection')}
                        style={styles.backButtonInline}
                    >
                        <Ionicons name="arrow-back" size={28} color="#dc2626" />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <LinearGradient
                                colors={['#ef4444', '#991b1b']}
                                style={styles.logoGradient}
                            >
                                <View style={styles.dropWrapper}>
                                    <MaterialCommunityIcons name="water" size={60} color="white" />
                                    <View style={styles.plusOverlay}>
                                        <MaterialCommunityIcons name="plus-thick" size={20} color="#dc2626" />
                                    </View>
                                </View>
                            </LinearGradient>
                        </View>
                        <Text style={styles.eyebrow}>Donor Portal</Text>
                        <Text style={styles.title}>Sign in to your account</Text>
                        <Text style={styles.subtitle}>
                            Use your credentials to access your dashboard.
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Username</Text>
                            <View style={[styles.inputWrapper, showErrors && !username && styles.inputWrapperError]}>
                                <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your username"
                                    placeholderTextColor="#6b7280"
                                    value={username}
                                    onChangeText={setUsername}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <View style={[styles.inputWrapper, showErrors && !password && styles.inputWrapperError]}>
                                <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your password"
                                    placeholderTextColor="#6b7280"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                        size={20}
                                        color="#6b7280"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <TouchableOpacity
                            style={styles.forgotPassword}
                            onPress={() => setShowForgotModal(true)}
                        >
                            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLogin}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.loginButtonText}>Sign In</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.dividerContainer}>
                            <View style={styles.divider} />
                            <Text style={styles.dividerText}>OR</Text>
                            <View style={styles.divider} />
                        </View>

                        <TouchableOpacity
                            style={styles.googleButton}
                            onPress={handleGoogleLogin}
                            disabled={isLoading}
                        >
                            <GoogleIcon width={20} height={20} />
                            <Text style={styles.googleButtonText}>Sign in with Google</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>New to the platform? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                            <Text style={styles.registerLink}>Create account</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
            <ForgotPasswordModal
                visible={showForgotModal}
                onClose={() => setShowForgotModal(false)}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    backButtonInline: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    flex: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        paddingTop: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logoContainer: {
        width: 90,
        height: 90,
        borderRadius: 28,
        overflow: 'hidden',
        marginBottom: 16,
        elevation: 12,
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
    },
    logoGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dropWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
        height: 60,
    },
    plusOverlay: {
        position: 'absolute',
        top: '40%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    eyebrow: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#dc2626',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        fontWeight: '500',
    },
    form: {
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#374151',
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    inputWrapperError: {
        borderColor: '#ef4444',
        borderWidth: 2,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
        fontWeight: 'bold',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotPasswordText: {
        color: '#dc2626',
        fontSize: 14,
        fontWeight: 'bold',
    },
    loginButton: {
        height: 56,
        borderRadius: 16,
        backgroundColor: '#dc2626',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    loginButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#e5e7eb',
    },
    dividerText: {
        paddingHorizontal: 16,
        fontSize: 12,
        fontWeight: 'bold',
        color: '#9ca3af',
    },
    googleButton: {
        flexDirection: 'row',
        height: 56,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginTop: 12,
    },
    googleIcon: {
        width: 24,
        height: 24,
    },
    googleButtonText: {
        color: '#1f2937',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 12,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    footerText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    registerLink: {
        fontSize: 14,
        color: '#dc2626',
        fontWeight: 'bold',
    },
});

export default LoginScreen;
