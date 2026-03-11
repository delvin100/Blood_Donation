import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../api/apiService';
import { parseError, logError } from '../../utils/errors';

const { height } = Dimensions.get('window');

const ForgotPasswordModal = ({ visible, onClose }) => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [step, setStep] = useState('REQUEST'); // 'REQUEST', 'VERIFY', 'RESET', or 'SUCCESS'
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const resetState = () => {
        setEmail('');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setStep('REQUEST');
        setError('');
        setSuccess('');
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleSendCode = async () => {
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Please enter a valid email address.');
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            await apiService.post('/auth/forgot-password', { email: email.toLowerCase() });
            setStep('VERIFY');
        } catch (err) {
            logError('Forgot Password Send Code', err);
            setError(parseError(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (!otp.trim() || otp.length !== 4) {
            setError('Please enter the 4-digit verification code.');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            await apiService.post('/auth/verify-otp', {
                email: email.toLowerCase(),
                code: otp
            });
            setStep('RESET');
        } catch (err) {
            logError('Verify OTP', err);
            setError(parseError(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            await apiService.post('/auth/reset-password', {
                email: email.toLowerCase(),
                code: otp,
                newPassword: newPassword
            });
            setStep('SUCCESS');
        } catch (err) {
            logError('Reset Password', err);
            setError(parseError(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.container}
                >
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                            <Ionicons name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>

                        <View style={styles.header}>
                            <View style={styles.iconCircle}>
                                <Ionicons
                                    name={step === 'REQUEST' ? "key-outline" : step === 'VERIFY' ? "apps-outline" : step === 'SUCCESS' ? "checkmark-circle-outline" : "shield-checkmark-outline"}
                                    size={32}
                                    color={step === 'SUCCESS' ? "#10b981" : "#dc2626"}
                                />
                            </View>
                            <Text style={styles.title}>
                                {step === 'REQUEST' ? "Reset Password" : step === 'VERIFY' ? "Verify Code" : step === 'SUCCESS' ? "Success!" : "New Password"}
                            </Text>
                            <Text style={styles.subtitle}>
                                {step === 'REQUEST'
                                    ? "Enter your email to receive a verification code."
                                    : step === 'VERIFY'
                                        ? "Enter the 4-digit code sent to your email."
                                        : step === 'SUCCESS'
                                            ? "Your password has been changed successfully!"
                                            : "Enter your secure new password."}
                            </Text>
                        </View>

                        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
                            {success ? (
                                <View style={styles.successContainer}>
                                    <Text style={styles.successText}>{success}</Text>
                                </View>
                            ) : null}

                            {error ? (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            ) : null}

                            {step === 'REQUEST' && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Registered Email</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="you@example.com"
                                            value={email}
                                            onChangeText={(val) => { setEmail(val); setError(''); setSuccess(''); }}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            editable={!isLoading}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.btn, isLoading && styles.btnDisabled]}
                                        onPress={handleSendCode}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Send Reset Code</Text>}
                                    </TouchableOpacity>
                                </View>
                            )}

                            {step === 'VERIFY' && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Four-Digit Code</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="apps-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="0 0 0 0"
                                            value={otp}
                                            onChangeText={(val) => { setOtp(val); setError(''); }}
                                            keyboardType="number-pad"
                                            maxLength={4}
                                            editable={!isLoading}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.btn, isLoading && styles.btnDisabled]}
                                        onPress={handleVerifyOTP}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Verify Code</Text>}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.resendBtn}
                                        onPress={() => { setStep('REQUEST'); setSuccess(''); }}
                                        disabled={isLoading}
                                    >
                                        <Text style={styles.resendText}>Back to Email</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {step === 'RESET' && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>New Password</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Minimum 8 characters"
                                            value={newPassword}
                                            onChangeText={(val) => { setNewPassword(val); setError(''); }}
                                            secureTextEntry={!showPassword}
                                            editable={!isLoading && !success.includes('successfully')}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowPassword(!showPassword)}
                                            style={{ padding: 10 }}
                                        >
                                            <Ionicons
                                                name={showPassword ? "eye-off-outline" : "eye-outline"}
                                                size={20}
                                                color="#6b7280"
                                            />
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={styles.label}>Confirm Password</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Repeat password"
                                            value={confirmPassword}
                                            onChangeText={(val) => { setConfirmPassword(val); setError(''); }}
                                            secureTextEntry={!showConfirmPassword}
                                            editable={!isLoading && !success.includes('successfully')}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                            style={{ padding: 10 }}
                                        >
                                            <Ionicons
                                                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                                                size={20}
                                                color="#6b7280"
                                            />
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.btn, (isLoading || success.includes('successfully')) && styles.btnDisabled]}
                                        onPress={handleResetPassword}
                                        disabled={isLoading || success.includes('successfully')}
                                    >
                                        {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Reset Password</Text>}
                                    </TouchableOpacity>
                                </View>
                            )}

                            {step === 'SUCCESS' && (
                                <View style={styles.inputGroup}>
                                    <View style={styles.successMessageCard}>
                                        <Text style={styles.successMessageText}>
                                            Your account password is now updated. You can now log in with your new credentials.
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.btn, { backgroundColor: '#10b981', shadowColor: '#10b981' }]}
                                        onPress={handleClose}
                                    >
                                        <Text style={styles.btnText}>OK, Got it</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end', // Align to bottom to avoid "shivering" center jumps
    },
    container: {
        width: '100%',
    },
    card: {
        backgroundColor: 'white',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        width: '100%',
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 32,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        maxHeight: height * 0.9,
    },
    closeBtn: {
        alignSelf: 'flex-end',
        padding: 8,
        backgroundColor: '#f8fafc',
        borderRadius: 20,
    },
    header: { alignItems: 'center', marginBottom: 20 },
    iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },
    body: { width: '100%' },
    label: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8, marginLeft: 4 },
    inputGroup: { width: '100%' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, color: '#111827', fontWeight: 'bold' },
    btn: { backgroundColor: '#dc2626', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#dc2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4, marginTop: 8 },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    resendBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 10 },
    resendText: { color: '#dc2626', fontWeight: 'bold', fontSize: 14 },
    errorContainer: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 12, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#ef4444' },
    errorText: { color: '#b91c1c', fontSize: 13, fontWeight: '600' },
    successText: { color: '#065f46', fontSize: 13, fontWeight: '600' },
    successMessageCard: {
        backgroundColor: '#f0fdf4',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#dcfce7',
        marginBottom: 24,
        alignItems: 'center',
    },
    successMessageText: {
        fontSize: 15,
        color: '#166534',
        textAlign: 'center',
        lineHeight: 22,
        fontWeight: '500',
    },
});

export default ForgotPasswordModal;
