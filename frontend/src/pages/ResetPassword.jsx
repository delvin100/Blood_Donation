import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import toast from 'react-hot-toast';
import '../assets/css/reset-password.css';

// Initialize Firebase (only once)
const firebaseConfig = {
    apiKey: "AIzaSyCrD8eTxgRftMuIEl99ucCWnJJ9WC6riMk",
    authDomain: "ebloodbank-fb878.firebaseapp.com",
    projectId: "ebloodbank-fb878",
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

export default function ResetPassword() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = new URLSearchParams(location.search);
    const oobCode = params.get('oobCode');
    const mode = params.get('mode');

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const [userType, setUserType] = useState('donor');
    const [showPass, setShowPass] = useState(false);
    const isFallback = params.get('fallback') === 'true';
    const emailParam = params.get('email');
    const typeParam = params.get('type');

    useEffect(() => {
        // If we have oobCode in URL, pre-fill OTP boxes if it's 4 digits
        if (oobCode && oobCode.length === 4) {
            setOtp(oobCode.split(''));
        }

        if (isFallback) {
            if (emailParam) setEmail(emailParam);
            if (typeParam) setUserType(typeParam);
            setVerifying(false);
            return;
        }

        if (!oobCode || mode !== 'resetPassword') {
            // Instead of error, just set verifying false to show manual entry form
            setVerifying(false);
            return;
        }

        if (isFallback) {
            // Use fallback logic (MySQL custom codes)
            if (emailParam) {
                setEmail(emailParam);
                if (typeParam) setUserType(typeParam);
                setVerifying(false);
            } else {
                setError('Invalid recovery link. Missing email parameter.');
                setVerifying(false);
            }
            return;
        }

        // Standard Firebase logic
        verifyPasswordResetCode(auth, oobCode)
            .then((emailFromCode) => {
                setEmail(emailFromCode);
                setVerifying(false);
            })
            .catch((err) => {
                console.error('Firebase verify code error:', err);
                setError('This reset link has expired or already been used. Please request a new one.');
                setVerifying(false);
            });
    }, [oobCode, mode, isFallback, emailParam]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword.length < 8) {
            toast.error('Password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const enteredOtp = otp.join('');
            if (enteredOtp.length !== 4) {
                toast.error('Please enter the 4-digit security code.');
                setLoading(false);
                return;
            }

            if (isFallback || !oobCode) {
                // Custom Reset Logic (Direct to MySQL)
                const resetEndpoint = userType === 'organization'
                    ? '/api/organization/reset-password'
                    : '/api/auth/reset-password';

                await axios.post(resetEndpoint, {
                    email,
                    code: enteredOtp,
                    newPassword
                });

                toast.success('Password Updated Successfully!');
                setDone(true);
            } else {
                // Firebase Reset Logic
                await confirmPasswordReset(auth, oobCode, newPassword);
                // ... sync logic if needed, but prioritized manual flow as requested
                setDone(true);
            }
        } catch (err) {
            console.error('Final Reset Error:', err);
            const errMsg = err.response?.data?.error || 'Failed to reset password. Link may be invalid.';
            toast.error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="reset-container">
            {/* Dynamic Background */}
            <div className="reset-bg-blobs">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
            </div>

            <div className="reset-card">
                {/* Brand Identity */}
                <div className="reset-logo-box">
                    <div className="reset-heart-icon">
                        <i className="fas fa-heartbeat"></i>
                    </div>
                    <h1 className="reset-title">eBloodBank</h1>
                    <p className="reset-subtitle">Secure Access Recovery</p>
                </div>

                {verifying ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '32px', color: '#dc2626', marginBottom: '16px' }}></i>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Verifying secure token...</p>
                    </div>
                ) : error ? (
                    <div style={{ animation: 'card-appear 0.5s ease-out' }}>
                        <div className="reset-error-msg">
                            <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                            {error}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <button onClick={() => navigate('/donor/login')} className="type-btn active">Donor Portal</button>
                            <button onClick={() => navigate('/organization/login')} className="type-btn">Org Portal</button>
                        </div>
                    </div>
                ) : done ? (
                    <div style={{ textAlign: 'center', animation: 'card-appear 0.5s ease-out' }}>
                        <div className="reset-success-icon">
                            <i className="fas fa-check"></i>
                        </div>
                        <h2 style={{ color: '#fff', fontSize: '28px', fontWeight: 800, marginBottom: '12px' }}>Updated!</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: '32px' }}>
                            Your security credentials have been successfully updated. You can now use your new password to log in.
                        </p>
                        <button
                            onClick={() => navigate(userType === 'organization' ? '/organization/login' : '/donor/login')}
                            className="reset-btn"
                        >
                            Return to Portal <i className="fas fa-arrow-right"></i>
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="reset-form">
                        <div style={{ marginBottom: '20px' }}>
                            <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Reset Password</h2>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', lineHeight: 1.5 }}>
                                Enter the 4-digit code sent to your email and your new password.
                            </p>
                        </div>

                        {/* Email Input (Editable if not in URL) */}
                        <div className="reset-input-group">
                            <label className="reset-label">Registered Email</label>
                            <div className="reset-input-wrapper">
                                <i className="fas fa-envelope reset-input-icon"></i>
                                <input
                                    type="email"
                                    className="reset-input"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    disabled={!!emailParam}
                                />
                            </div>
                        </div>

                        {/* Identity Selection */}
                        <div className="reset-type-picker" style={{ marginBottom: '24px' }}>
                            <button
                                type="button"
                                onClick={() => setUserType('donor')}
                                className={`type-btn ${userType === 'donor' ? 'active' : ''}`}
                                style={{ flex: 1 }}
                            >
                                <i className="fas fa-user"></i> Donor
                            </button>
                            <button
                                type="button"
                                onClick={() => setUserType('organization')}
                                className={`type-btn ${userType === 'organization' ? 'active' : ''}`}
                                style={{ flex: 1 }}
                            >
                                <i className="fas fa-hospital"></i> Facility
                            </button>
                        </div>

                        {/* OTP Input Boxes */}
                        <div className="reset-input-group">
                            <label className="reset-label">4-Digit Security Code</label>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', margin: '15px 0 25px' }}>
                                {otp.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        type="text"
                                        maxLength="1"
                                        value={digit}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '');
                                            const newOtp = [...otp];
                                            newOtp[idx] = val;
                                            setOtp(newOtp);
                                            // Auto focus next box
                                            if (val && idx < 3) {
                                                document.getElementById(`otp-${idx + 1}`).focus();
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
                                                document.getElementById(`otp-${idx - 1}`).focus();
                                            }
                                        }}
                                        id={`otp-${idx}`}
                                        style={{
                                            width: '55px',
                                            height: '65px',
                                            textAlign: 'center',
                                            fontSize: '28px',
                                            fontWeight: '800',
                                            borderRadius: '12px',
                                            border: '2px solid rgba(255,255,255,0.1)',
                                            background: 'rgba(255,255,255,0.03)',
                                            color: '#fff',
                                            transition: 'all 0.3s ease',
                                            outline: 'none',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#dc2626'}
                                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="reset-input-group">
                            <label className="reset-label">New Password</label>
                            <div className="reset-input-wrapper">
                                <i className="fas fa-lock reset-input-icon"></i>
                                <input
                                    type={showPass ? "text" : "password"}
                                    className="reset-input"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                                >
                                    <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                        </div>

                        <div className="reset-input-group">
                            <label className="reset-label">Confirm Password</label>
                            <div className="reset-input-wrapper">
                                <i className="fas fa-shield-alt reset-input-icon"></i>
                                <input
                                    type={showPass ? "text" : "password"}
                                    className="reset-input"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="reset-btn" style={{ marginTop: '10px' }}>
                            {loading ? (
                                <><i className="fas fa-spinner fa-spin"></i> Processing...</>
                            ) : (
                                <>Update Credentials <i className="fas fa-shield-virus"></i></>
                            )}
                        </button>
                    </form>
                )}
            </div>

            {/* Premium Footer Elements */}
            <div style={{ position: 'absolute', bottom: '40px', textAlign: 'center', width: '100%', pointerEvents: 'none' }}>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                    Shielded by eBloodBank Security Protocol v2.4
                </p>
            </div>
        </div>
    );
}
