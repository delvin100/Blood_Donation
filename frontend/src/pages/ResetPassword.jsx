import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import toast from 'react-hot-toast';

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
    const [userType, setUserType] = useState('donor'); // 'donor' or 'organization'

    useEffect(() => {
        if (!oobCode || mode !== 'resetPassword') {
            setError('Invalid or expired reset link. Please request a new one.');
            setVerifying(false);
            return;
        }
        // Verify the code and get the email
        verifyPasswordResetCode(auth, oobCode)
            .then((emailFromCode) => {
                setEmail(emailFromCode);
                setVerifying(false);
            })
            .catch(() => {
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
            // Step 1: Confirm the Firebase reset
            await confirmPasswordReset(auth, oobCode, newPassword);

            // Step 2: Sync the new password to MySQL via our backend
            const endpoint = userType === 'organization'
                ? '/api/organization/sync-password'
                : '/api/auth/sync-password';

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, newPassword }),
            });

            if (res.ok) {
                toast.success('Password reset successfully!');
                setDone(true);
            } else {
                // Firebase reset worked but MySQL sync failed — not critical
                toast.success('Password reset in Firebase. Please contact support if login fails.');
                setDone(true);
            }
        } catch (err) {
            toast.error('Failed to reset password. The link may have expired.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: "'Segoe UI', sans-serif"
        }}>
            <div style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: '20px',
                padding: '48px 40px',
                maxWidth: '440px',
                width: '100%',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
                textAlign: 'center',
            }}>
                {/* Logo */}
                <div style={{ marginBottom: '24px' }}>
                    <span style={{ fontSize: '36px' }}>🩸</span>
                    <h1 style={{ color: '#dc2626', margin: '8px 0 4px', fontSize: '24px', fontWeight: 700 }}>
                        eBloodBank
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: 0 }}>
                        Gift of Life, Shared by You
                    </p>
                </div>

                {verifying ? (
                    <p style={{ color: 'rgba(255,255,255,0.7)' }}>Verifying reset link...</p>
                ) : error ? (
                    <div>
                        <p style={{ color: '#f87171', marginBottom: '24px' }}>{error}</p>
                        <button
                            onClick={() => navigate('/donor/login')}
                            style={{
                                background: '#dc2626', color: '#fff', border: 'none',
                                borderRadius: '10px', padding: '12px 24px', cursor: 'pointer',
                                fontWeight: 600, marginRight: '10px'
                            }}
                        >
                            Donor Login
                        </button>
                        <button
                            onClick={() => navigate('/organization/login')}
                            style={{
                                background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none',
                                borderRadius: '10px', padding: '12px 24px', cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            Org Login
                        </button>
                    </div>
                ) : done ? (
                    <div>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                        <h2 style={{ color: '#fff', marginBottom: '8px' }}>Password Reset!</h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>
                            Your password has been updated. You can now log in with your new password.
                        </p>
                        <button
                            onClick={() => navigate(userType === 'organization' ? '/organization/login' : '/donor/login')}
                            style={{
                                background: '#dc2626', color: '#fff', border: 'none',
                                borderRadius: '10px', padding: '14px 32px', cursor: 'pointer',
                                fontWeight: 700, fontSize: '16px'
                            }}
                        >
                            Go to Login →
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <h2 style={{ color: '#fff', marginBottom: '6px', fontSize: '22px' }}>
                            Set New Password
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginBottom: '28px' }}>
                            {email}
                        </p>

                        {/* Account Type Selection */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                            {['donor', 'organization'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setUserType(type)}
                                    style={{
                                        flex: 1, padding: '10px', border: 'none', borderRadius: '10px',
                                        cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                                        background: userType === type ? '#dc2626' : 'rgba(255,255,255,0.1)',
                                        color: '#fff', transition: 'all 0.2s',
                                    }}
                                >
                                    {type === 'donor' ? '🩸 Donor' : '🏥 Organization'}
                                </button>
                            ))}
                        </div>

                        <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                            <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                                New Password
                            </label>
                            <input
                                type="password"
                                placeholder="Minimum 8 characters"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%', padding: '12px 14px', borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                                    color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px', textAlign: 'left' }}>
                            <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                placeholder="Re-enter new password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%', padding: '12px 14px', borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                                    color: '#fff', fontSize: '15px', outline: 'none', boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '14px', background: loading ? '#991b1b' : '#dc2626',
                                color: '#fff', border: 'none', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer',
                                fontWeight: 700, fontSize: '16px', transition: 'all 0.2s'
                            }}
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
