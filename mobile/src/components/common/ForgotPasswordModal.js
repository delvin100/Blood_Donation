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
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const resetState = () => {
        setEmail('');
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
            setSuccess('A password reset link has been sent to your email! Please check your inbox to proceed.');
        } catch (err) {
            logError('Forgot Password Send Code', err);
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
                                {success ? "Check your email inbox for the reset link." : "Enter your registered email to receive a secure reset link."}
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

                            {!success && (
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
                                        {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Send Reset Link</Text>}
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
