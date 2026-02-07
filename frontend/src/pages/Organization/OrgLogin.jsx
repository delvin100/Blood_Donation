import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function OrgLogin() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isCheckingSession, setIsCheckingSession] = useState(true);

    // Forgot Password States
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [fpStep, setFpStep] = useState(1);
    const [fpEmail, setFpEmail] = useState("");
    const [fpCode, setFpCode] = useState("");
    const [fpNewPassword, setFpNewPassword] = useState("");
    const [fpLoading, setFpLoading] = useState(false);

    // Check for existing session on mount
    useEffect(() => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
            window.location.href = '/organization/dashboard';
        } else {
            setIsCheckingSession(false);
        }
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await axios.post('/api/organization/login', { email, password });

            if (response.data.token) {
                // Clear existing tokens
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');

                if (rememberMe) {
                    localStorage.setItem('token', response.data.token);
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                } else {
                    sessionStorage.setItem('token', response.data.token);
                    sessionStorage.setItem('user', JSON.stringify(response.data.user));
                }
            }

            window.location.href = '/organization/dashboard';
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.error || "Login failed. Please verify your credentials.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        if (fpStep === 1) {
            if (!fpEmail) return toast.error("Email is required");
            setFpLoading(true);
            try {
                await axios.post('/api/organization/forgot-password', { email: fpEmail });
                toast.success("Reset code sent to your email.");
                setFpStep(2);
            } catch (err) {
                toast.error(err.response?.data?.error || "Failed to send code.");
            } finally {
                setFpLoading(false);
            }
        } else if (fpStep === 2) {
            if (!fpCode) return toast.error("Code is required");
            setFpLoading(true);
            try {
                await axios.post('/api/organization/verify-reset-code', { email: fpEmail, code: fpCode });
                toast.success("Code verified. Enter new password.");
                setFpStep(3);
            } catch (err) {
                toast.error(err.response?.data?.error || "Invalid code.");
            } finally {
                setFpLoading(false);
            }
        } else if (fpStep === 3) {
            if (fpNewPassword.length < 8) return toast.error("Password must be 8+ characters");
            setFpLoading(true);
            try {
                await axios.post('/api/organization/reset-password', { email: fpEmail, code: fpCode, newPassword: fpNewPassword });
                toast.success("Password reset successfully! You can login now.");
                setTimeout(() => {
                    setShowForgotModal(false);
                    setFpStep(1);
                    setFormData(prev => ({ ...prev, email: fpEmail }));
                }, 2000);
            } catch (err) {
                toast.error(err.response?.data?.error || "Failed to reset password.");
            } finally {
                setFpLoading(false);
            }
        }
    };

    if (isCheckingSession) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Validating Session...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/30 flex items-center justify-center p-6 font-sans selection:bg-red-100">

            {/* Background Decorative Elements */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-600/5 blur-[120px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full"></div>
            </div>

            <div className="max-w-5xl w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_32px_80px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col md:flex-row border border-white/50 relative">

                {/* Left Side: Professional Illustration/Content */}
                <div className="md:w-[45%] bg-gradient-to-b from-gray-50 to-white p-12 flex flex-col justify-between border-r border-gray-100/50">
                    <div className="w-full">
                        <div className="flex items-center gap-3 mb-12">
                            <div className="w-12 h-12 bg-gradient-to-tr from-red-600 to-red-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-200 ring-4 ring-red-50">
                                <i className="fas fa-heartbeat text-white text-xl"></i>
                            </div>
                            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">eBloodBank</span>
                        </div>

                        <h1 className="text-5xl font-black text-gray-900 mb-8 leading-[1.1] tracking-tight">
                            Healthcare <br />
                            <span className="bg-gradient-to-r from-red-600 to-rose-500 bg-clip-text text-transparent">Excellence</span> <br />
                            at Scale.
                        </h1>
                        <p className="text-gray-500 text-lg mb-10 leading-relaxed font-medium">
                            The definitive platform for professional enterprise-level blood supply management.
                        </p>
                    </div>

                    <div className="w-full space-y-5">
                        <div className="group flex items-center gap-5 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300">
                            <div className="w-14 h-14 bg-blue-50 group-hover:bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 transition-colors">
                                <i className="fas fa-shield-halved text-2xl"></i>
                            </div>
                            <div>
                                <h3 className="font-extrabold text-gray-900">Elite Security</h3>
                                <p className="text-sm text-gray-500 font-medium">Bank-grade encryption protocols</p>
                            </div>
                        </div>
                        <div className="group flex items-center gap-5 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
                            <div className="w-14 h-14 bg-amber-50 group-hover:bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 transition-colors">
                                <i className="fas fa-bolt-lightning text-2xl"></i>
                            </div>
                            <div>
                                <h3 className="font-extrabold text-gray-900">Live Inventory</h3>
                                <p className="text-sm text-gray-500 font-medium">Millisecond synchronization</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Clean Login Form */}
                <div className="md:w-[55%] p-12 md:p-20 flex flex-col justify-center bg-white">
                    <div className="mb-12">
                        <div className="inline-block px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                            Official Access
                        </div>
                        <h2 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">Portal Login</h2>
                        <p className="text-gray-500 font-medium text-lg">Secure entry for registered facilities.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="block text-sm font-black text-gray-800 ml-1">Corporate Email</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-red-500 transition-colors">
                                        <i className="fas fa-envelope-open-text"></i>
                                    </div>
                                    <input
                                        type="email"
                                        name="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@medical-center.org"
                                        className="w-full pl-12 pr-6 py-5 bg-gray-50 border border-gray-100 rounded-3xl focus:bg-white focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 outline-none transition-all placeholder:text-gray-400 font-semibold text-gray-900 group-hover:border-gray-200"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-black text-gray-800 ml-1">Authorization Key</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-red-500 transition-colors">
                                        <i className="fas fa-fingerprint text-lg"></i>
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-12 pr-12 py-5 bg-gray-50 border border-gray-100 rounded-3xl focus:bg-white focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 outline-none transition-all placeholder:text-gray-400 font-semibold text-gray-900 group-hover:border-gray-200"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                                    >
                                        {showPassword ? (
                                            <i className="fas fa-eye-slash"></i>
                                        ) : (
                                            <i className="fas fa-eye"></i>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-2 px-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        className="peer hidden"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                    />
                                    <div className="w-5 h-5 border-2 border-gray-300 rounded-md transition-all group-hover:border-red-500 peer-checked:bg-red-500 peer-checked:border-red-500 flex items-center justify-center">
                                        <svg className={`w-3 h-3 text-white transition-opacity ${rememberMe ? 'opacity-100' : 'opacity-0'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                </div>
                                <span className="text-sm font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowForgotModal(true)}
                                className="text-xs font-black text-red-600 hover:text-red-700 hover:underline transition-all bg-transparent border-none cursor-pointer"
                            >
                                Recover Key?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white font-black py-5 rounded-3xl hover:from-red-600 hover:to-rose-600 transition-all duration-500 shadow-2xl shadow-gray-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-lg overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-3">
                                {loading ? (
                                    <>
                                        <i className="fas fa-circle-notch fa-spin"></i> Authenticating...
                                    </>
                                ) : (
                                    <>
                                        Establish Connection <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                                    </>
                                )}
                            </span>
                        </button>

                        <div className="text-center pt-8 border-t border-gray-50">
                            <p className="text-gray-500 font-bold">
                                Initializing a new facility? {' '}
                                <Link to="/organization/register" className="text-red-600 font-black hover:text-red-700 transition-colors ml-1 uppercase text-sm tracking-wider">
                                    Register Now
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            {/* Back to Home Button */}
            <Link
                to="/#action-cards"
                className="back-chip"
                aria-label="Back to Get Started section"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                        d="M15 5 8 12l7 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </Link>

            {/* Recovery Modal */}
            {showForgotModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-gray-100">
                        <button
                            onClick={() => { setShowForgotModal(false); setFpStep(1); }}
                            className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors"
                        >
                            <i className="fas fa-times text-xl"></i>
                        </button>

                        <div className="p-10">
                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 text-2xl mb-6 mx-auto">
                                <i className="fas fa-key"></i>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 text-center mb-2">Recover Access Key</h3>
                            <p className="text-gray-500 text-center font-medium mb-8">
                                {fpStep === 1 && "Enter your facility email to receive a reset code."}
                                {fpStep === 2 && "Enter the 4-digit security code sent to your inbox."}
                                {fpStep === 3 && "Set a new secure access key for your facility."}
                            </p>

                            <form onSubmit={handleForgotSubmit} className="space-y-6">
                                {fpStep === 1 && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Facility Email</label>
                                        <input
                                            type="email"
                                            value={fpEmail}
                                            onChange={(e) => setFpEmail(e.target.value)}
                                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 outline-none transition-all font-bold text-gray-900"
                                            placeholder="admin@hospital.com"
                                            required
                                        />
                                    </div>
                                )}

                                {fpStep === 2 && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Verification Code</label>
                                        <input
                                            type="text"
                                            maxLength="4"
                                            value={fpCode}
                                            onChange={(e) => setFpCode(e.target.value.replace(/\D/g, ''))}
                                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 outline-none transition-all font-black text-center text-3xl tracking-[1rem] text-red-600"
                                            placeholder="••••"
                                            required
                                        />
                                    </div>
                                )}

                                {fpStep === 3 && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">New Access Key</label>
                                        <input
                                            type="password"
                                            value={fpNewPassword}
                                            onChange={(e) => setFpNewPassword(e.target.value)}
                                            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 outline-none transition-all font-bold text-gray-900"
                                            placeholder="••••••••"
                                            required
                                            minLength={8}
                                        />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={fpLoading}
                                    className="w-full bg-gray-900 hover:bg-red-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-gray-200 active:scale-[0.98] disabled:opacity-50"
                                >
                                    {fpLoading ? (
                                        <i className="fas fa-spinner fa-spin"></i>
                                    ) : (
                                        fpStep === 1 ? "Send Reset Code" : (fpStep === 2 ? "Verify Code" : "Update Access Key")
                                    )}
                                </button>

                                {fpStep > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setFpStep(fpStep - 1)}
                                        className="w-full text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        Go Back
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
