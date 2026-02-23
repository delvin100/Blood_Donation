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
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const [userType, setUserType] = useState(params.get('type') || 'donor');
    const [showPass, setShowPass] = useState(false);

    useEffect(() => {
        if (!oobCode || mode !== 'resetPassword') {
            setError('Invalid or expired reset link. Please request a new one from the login page.');
            setVerifying(false);
            return;
        }
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
    }, [oobCode, mode]);

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
            await confirmPasswordReset(auth, oobCode, newPassword);

            const endpoint = userType === 'organization'
                ? '/api/organization/sync-password'
                : '/api/auth/sync-password';

            try {
                await axios.post(endpoint, { email, newPassword });
                toast.success('Security Update Successful!');
                setDone(true);
            } catch (syncErr) {
                console.error('MySQL sync error:', syncErr);
                const msg = syncErr.response?.data?.error || 'Database synchronization failed.';
                toast.error(`Firebase updated, but DB sync failed.`);
                setError(`Security update partially successful. Password changed in Firebase, but database sync failed: ${msg}. Please contact support if you face login issues.`);
                setDone(false);
            }
        } catch (err) {
            console.error('Final Reset Error:', err);
            toast.error('Failed to reset password. Link may be invalid.');
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
                        <div style={{ marginBottom: '8px' }}>
                            <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Reset Password</h2>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 600 }}>
                                <i className="fas fa-user-shield" style={{ marginRight: '6px' }}></i>
                                {email}
                            </p>
                        </div>

                        {/* Identity Selection */}
                        <div className="reset-type-picker">
                            <button
                                type="button"
                                onClick={() => setUserType('donor')}
                                className={`type-btn ${userType === 'donor' ? 'active' : ''}`}
                            >
                                <i className="fas fa-user" style={{ marginRight: '8px' }}></i> Donor
                            </button>
                            <button
                                type="button"
                                onClick={() => setUserType('organization')}
                                className={`type-btn ${userType === 'organization' ? 'active' : ''}`}
                            >
                                <i className="fas fa-hospital" style={{ marginRight: '8px' }}></i> Facility
                            </button>
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

                        <button type="submit" disabled={loading} className="reset-btn">
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
