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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../api/apiService';
import { parseError, logError } from '../../utils/errors';

const ForgotPasswordModal = ({ visible, onClose }) => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const resetState = () => {
        setStep(1);
        setEmail('');
        setCode('');
        setNewPassword('');
        setError('');
        setSuccess('');
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
            await apiService.post('/auth/forgot-password', { email });
            setStep(2);
            setSuccess('Verification code sent to your email.');
        } catch (err) {
            logError('Forgot Password Send Code', err);
            setError(parseError(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (code.length !== 4) {
            setError('Please enter the 4-digit code.');
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            await apiService.post('/auth/verify-reset-code', { email, code });
            setStep(3);
            setSuccess('Code verified. Set your new password.');
        } catch (err) {
            logError('Forgot Password Verify Code', err);
            setError(parseError(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            await apiService.post('/auth/reset-password', { email, code, newPassword });
            setSuccess('Password reset successfully! You can now login.');
            setTimeout(() => {
                handleClose();
            }, 2000);
        } catch (err) {
            logError('Forgot Password Reset', err);
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
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.container}
                >
                    <View style={styles.card}>
                        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                            <Ionicons name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>

                        <View style={styles.header}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="key-outline" size={32} color="#dc2626" />
                            </View>
                            <Text style={styles.title}>Reset Your Password</Text>
                            <Text style={styles.subtitle}>
                                {step === 1 && "Enter your registered email to receive a verification code."}
                                {step === 2 && "Enter the 4-digit code sent to your email."}
                                {step === 3 && "Create a new password for your account."}
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

                            {step === 1 && (
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
                                            disabled={isLoading}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.btn, isLoading && styles.btnDisabled]}
                                        onPress={handleSendCode}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Send Verification Code</Text>}
                                    </TouchableOpacity>
                                </View>
                            )}

                            {step === 2 && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>4-Digit Code</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="finger-print-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="1234"
                                            value={code}
                                            onChangeText={(val) => { setCode(val.replace(/[^0-9]/g, '')); setError(''); setSuccess(''); }}
                                            keyboardType="numeric"
                                            maxLength={4}
                                            disabled={isLoading}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.btn, isLoading && styles.btnDisabled]}
                                        onPress={handleVerifyCode}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Verify Code</Text>}
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.resendBtn} onPress={() => setStep(1)}>
                                        <Text style={styles.resendText}>Resend Code</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {step === 3 && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>New Password</Text>
                                    <View style={styles.inputWrapper}>
                                        <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Minimum 8 characters"
                                            value={newPassword}
                                            onChangeText={(val) => { setNewPassword(val); setError(''); setSuccess(''); }}
                                            secureTextEntry
                                            disabled={isLoading}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.btn, isLoading && styles.btnDisabled]}
                                        onPress={handleResetPassword}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Reset Password</Text>}
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
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    container: { width: '100%', alignItems: 'center' },
    card: { backgroundColor: 'white', borderRadius: 24, width: '100%', padding: 24, paddingBottom: 32, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    closeBtn: { alignSelf: 'flex-end', padding: 4 },
    header: { alignItems: 'center', marginBottom: 24 },
    iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
    body: { width: '100%' },
    label: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8, marginLeft: 4 },
    inputGroup: { width: '100%' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 16, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 20 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, color: '#111827', fontWeight: 'bold' },
    btn: { backgroundColor: '#dc2626', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#dc2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 4 },
    btnDisabled: { opacity: 0.7 },
    btnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    resendBtn: { marginTop: 16, alignItems: 'center' },
    resendText: { color: '#dc2626', fontWeight: 'bold', fontSize: 14 },
    errorContainer: { backgroundColor: '#fee2e2', padding: 12, borderRadius: 12, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#ef4444' },
    errorText: { color: '#b91c1c', fontSize: 14, fontWeight: '600' },
    successContainer: { backgroundColor: '#d1fae5', padding: 12, borderRadius: 12, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#10b981' },
    successText: { color: '#065f46', fontSize: 14, fontWeight: '600' },
});

export default ForgotPasswordModal;
