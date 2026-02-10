import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../api/apiService';
import { saveToken, saveUser } from '../../utils/storage';
import ForgotPasswordModal from '../../components/common/ForgotPasswordModal';
import GoogleIcon from '../../components/common/GoogleIcon';
import { parseError, logError } from '../../utils/errors';



const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showErrors, setShowErrors] = useState(false);
    const [showForgotModal, setShowForgotModal] = useState(false);


    const handleGoogleLogin = () => {
        Alert.alert('Notice', 'Google Sign-In is currently unavailable in the mobile app.');
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
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <LinearGradient
                                colors={['#dc2626', '#991b1b']}
                                style={styles.logoGradient}
                            >
                                <Ionicons name="water" size={40} color="white" />
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
    flex: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 16,
        elevation: 8,
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    logoGradient: {
        flex: 1,
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
