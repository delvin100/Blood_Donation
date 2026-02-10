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
    Alert,
    Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../api/apiService';
import { saveToken, saveUser } from '../../utils/storage';
import GoogleIcon from '../../components/common/GoogleIcon';
import { parseError, logError } from '../../utils/errors';



const RegisterScreen = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordStrength, setPasswordStrength] = useState({ level: 0, label: '', color: '#e5e7eb' });
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showErrors, setShowErrors] = useState(false);


    // Field-specific error states
    const [errors, setErrors] = useState({
        username: '',
        fullName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const handleGoogleLogin = () => {
        Alert.alert('Notice', 'Google Sign-Up is currently unavailable in the mobile app.');
    };

    const calculatePasswordStrength = (pwd) => {
        if (!pwd) return { level: 0, label: '', color: '#e5e7eb' };
        if (/\s/.test(pwd)) return { level: 0, label: 'No spaces allowed', color: '#ef4444' };

        const hasAlpha = /[a-zA-Z]/.test(pwd);
        const hasNumber = /[0-9]/.test(pwd);
        const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);

        if (hasAlpha && hasNumber && hasSpecial) {
            return { level: 3, label: 'Hard', color: '#10b981' };
        } else if ((hasAlpha && hasNumber) || (hasAlpha && hasSpecial) || (hasNumber && hasSpecial)) {
            return { level: 2, label: 'Normal', color: '#f59e0b' };
        } else {
            return { level: 1, label: 'Easy', color: '#ef4444' };
        }
    };

    const handlePasswordChange = (val) => {
        setPassword(val);
        setPasswordStrength(calculatePasswordStrength(val));
    };

    const validateUsername = (val) => {
        if (!val.trim()) return 'Username is required.';
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(val)) return 'Must start with a letter and use only letters/numbers/underscores.';
        if (val.length < 3 || val.length > 30) return 'Must be between 3 and 30 characters.';
        return '';
    };

    const validateFullName = (val) => {
        if (!val.trim()) return 'Full name is required.';
        if (val.startsWith(' ')) return 'Should not start with a space.';
        if (!/^[a-zA-Z][a-zA-Z\s]*$/.test(val.trim())) return 'Can only contain letters and spaces.';
        return '';
    };

    const validateEmail = (val) => {
        if (!val.trim()) return 'Email is required.';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val.trim())) return 'Please enter a valid email address.';
        return '';
    };

    const validatePassword = (val) => {
        if (!val) return 'Password is required.';
        if (val.length < 8) return 'Must be at least 8 characters.';
        if (/\s/.test(val)) return 'Must not contain spaces.';
        return '';
    };

    const validateConfirmPassword = (val, pass) => {
        if (!val) return 'Please confirm your password.';
        if (val !== pass) return 'Passwords do not match.';
        return '';
    };

    const handleRegister = async () => {
        const uErr = validateUsername(username);
        const fErr = validateFullName(fullName);
        const eErr = validateEmail(email);
        const pErr = validatePassword(password);
        const cErr = validateConfirmPassword(confirmPassword, password);

        const newErrors = {
            username: uErr,
            fullName: fErr,
            email: eErr,
            password: pErr,
            confirmPassword: cErr,
        };

        setErrors(newErrors);

        if (uErr || fErr || eErr || pErr || cErr) {
            setError('Please fix the errors highlighted in red');
            setShowErrors(true);
            return;
        }
        setShowErrors(false);

        setIsLoading(true);
        setError('');
        // ... rest stays same

        try {
            const response = await apiService.post('/auth/register', {
                username,
                full_name: fullName.trim(),
                email: email.trim(),
                password,
                confirm_password: confirmPassword,
            });

            const { token, user } = response.data;
            await saveToken(token);
            await saveUser(user);

            // Our custom router in App.js will detect the token and switch screens
            navigation.navigate('Dashboard');
        } catch (err) {
            logError('Register Error', err);
            setError(parseError(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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
                        <Text style={styles.title}>Create an account</Text>
                        <Text style={styles.subtitle}>
                            Step into the donor community with a secure profile.
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Username</Text>
                            <View style={[styles.inputWrapper, (showErrors && errors.username) && styles.inputWrapperError]}>
                                <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Choose a username"
                                    value={username}
                                    onChangeText={(val) => {
                                        setUsername(val);
                                        setErrors(prev => ({ ...prev, username: validateUsername(val) }));
                                    }}
                                    autoCapitalize="none"
                                />
                            </View>
                            {errors.username ? <Text style={styles.fieldError}>{errors.username}</Text> : null}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <View style={[styles.inputWrapper, (showErrors && errors.fullName) && styles.inputWrapperError]}>
                                <Ionicons name="card-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your full name"
                                    value={fullName}
                                    onChangeText={(val) => {
                                        setFullName(val);
                                        setErrors(prev => ({ ...prev, fullName: validateFullName(val) }));
                                    }}
                                />
                            </View>
                            {errors.fullName ? <Text style={styles.fieldError}>{errors.fullName}</Text> : null}
                        </View>


                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Address</Text>
                            <View style={[styles.inputWrapper, (showErrors && errors.email) && styles.inputWrapperError]}>
                                <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email"
                                    value={email}
                                    onChangeText={(val) => {
                                        setEmail(val);
                                        setErrors(prev => ({ ...prev, email: validateEmail(val) }));
                                    }}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                            {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
                        </View>



                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <View style={[styles.inputWrapper, (showErrors && errors.password) && styles.inputWrapperError]}>
                                <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Minimum 8 characters"
                                    value={password}
                                    onChangeText={(val) => {
                                        handlePasswordChange(val);
                                        setErrors(prev => ({
                                            ...prev,
                                            password: validatePassword(val),
                                            confirmPassword: validateConfirmPassword(confirmPassword, val)
                                        }));
                                    }}
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
                            {password.length > 0 && (
                                <View style={styles.strengthMeter}>
                                    <View style={styles.strengthBars}>
                                        <View style={[styles.strengthBar, { backgroundColor: passwordStrength.level >= 1 ? passwordStrength.color : '#e5e7eb' }]} />
                                        <View style={[styles.strengthBar, { backgroundColor: passwordStrength.level >= 2 ? passwordStrength.color : '#e5e7eb' }]} />
                                        <View style={[styles.strengthBar, { backgroundColor: passwordStrength.level >= 3 ? passwordStrength.color : '#e5e7eb' }]} />
                                    </View>
                                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>{passwordStrength.label}</Text>
                                </View>
                            )}
                            {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={[styles.inputWrapper, (showErrors && errors.confirmPassword) && styles.inputWrapperError]}>
                                <Ionicons name="checkmark-circle-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Repeat your password"
                                    value={confirmPassword}
                                    onChangeText={(val) => {
                                        setConfirmPassword(val);
                                        setErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(val, password) }));
                                    }}
                                    secureTextEntry={!showPassword}
                                />
                            </View>
                            {errors.confirmPassword ? <Text style={styles.fieldError}>{errors.confirmPassword}</Text> : null}
                        </View>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <TouchableOpacity
                            style={styles.registerButton}
                            onPress={handleRegister}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.registerButtonText}>Create Account</Text>
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
                            <Text style={styles.googleButtonText}>Sign up with Google</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Login')}
                            style={styles.loginLink}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.loginLinkText}>
                                Sign in
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView >
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
        paddingTop: 40,
        paddingBottom: 100,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoContainer: {
        width: 70,
        height: 70,
        borderRadius: 20,
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
        marginBottom: 16,
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
        height: 54,
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
    calendarBtn: {
        padding: 5,
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
    registerButton: {
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
        marginTop: 8,
    },
    registerButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    footerText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '500',
    },
    loginLinkText: {
        fontSize: 14,
        color: '#dc2626',
        fontWeight: 'bold',
    },
    strengthMeter: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    strengthBars: {
        flexDirection: 'row',
        gap: 4,
        marginRight: 8,
    },
    strengthBar: {
        width: 30,
        height: 4,
        borderRadius: 2,
    },
    strengthLabel: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    fieldError: {
        color: '#ef4444',
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 4,
        marginLeft: 4,
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
});

export default RegisterScreen;
