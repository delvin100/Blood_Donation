import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function AdminLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await axios.post('/api/admin/login', {
                username,
                password
            });

            localStorage.setItem('adminToken', response.data.token);
            toast.success('Access Granted');
            navigate('/admin/dashboard');

        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.error || 'Access Denied');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-red-50 to-white">
            {/* Background Animations */}
            <div className="absolute inset-0 z-0">
                <style>
                    {`
                        @keyframes waveMove { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
                        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
                        .glass-card {
                            background: rgba(255, 255, 255, 0.9);
                            backdrop-filter: blur(20px);
                            border: 1px solid rgba(255, 255, 255, 0.5);
                            box-shadow: 0 25px 45px rgba(220, 38, 38, 0.1);
                        }
                    `}
                </style>
                <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-200 via-transparent to-transparent"></div>
                <div className="absolute bottom-0 right-0 w-full h-full opacity-30 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-red-200 via-transparent to-transparent"></div>
            </div>

            {/* Main Content */}
            <div className="w-full max-w-md z-10 p-4">
                <div className="glass-card rounded-3xl p-8 transform transition-all hover:scale-[1.01] duration-500">

                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-gradient-to-tr from-red-500 to-red-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-6">
                            <i className="fas fa-shield-alt text-3xl text-white"></i>
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-2 font-sans tracking-tight">Admin Portal</h2>
                        <p className="text-gray-500 text-sm">Secure Access Management</p>
                    </div>

                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div className="space-y-4">
                            {/* Username Input */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <i className="fas fa-user text-gray-400 group-focus-within:text-red-500 transition-colors"></i>
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="block w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-200"
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>

                            {/* Password Input */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <i className="fas fa-lock text-gray-400 group-focus-within:text-red-500 transition-colors"></i>
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="block w-full pl-11 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-200"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                                >
                                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full relative overflow-hidden bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed group"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading && (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {loading ? 'Authenticating...' : 'Access Dashboard'}
                            </span>
                            <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-red-500 transition-colors duration-200 gap-2 group">
                            <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform"></i>
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
