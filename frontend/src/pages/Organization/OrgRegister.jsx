import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function OrgRegister() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirm_password: '',
        license_number: '',
        type: '',
        address: '',
        state: '',
        district: '',
        city: ''
    });
    const [errors, setErrors] = useState({});
    const [fetchingLocation, setFetchingLocation] = useState(false);

    // Password Visibility States
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;

        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }

        // Specialized logic for phone field: only allow 10 numerical digits
        if (name === 'phone') {
            const onlyDigits = value.replace(/\D/g, '').slice(0, 10);
            setFormData({ ...formData, [name]: onlyDigits });
            return;
        }

        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = {};

        // --- Advanced Validations ---

        // 1. Facility Type
        if (!formData.type) {
            newErrors.type = "Please select a valid Facility Type.";
        }

        // 2. Official Legal Name
        if (formData.name.trim().length < 3) {
            newErrors.name = "Legal Name must be at least 3 characters long.";
        }

        // 3. License ID
        if (formData.license_number.trim().length < 5) {
            newErrors.license_number = "License ID must be at least 5 characters.";
        }

        // 4. Communication Email
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(formData.email)) {
            newErrors.email = "Please provide a valid corporate email address.";
        }

        // 5. Contact Hotline
        if (formData.phone.length !== 10) {
            newErrors.phone = "Contact Hotline must contain exactly 10 digits.";
        }

        // 6. Security Key Complexity
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/;
        if (!passwordRegex.test(formData.password)) {
            newErrors.password = "Key must be 8+ chars with Uppercase, Number, and Special Character.";
        }

        if (formData.password !== formData.confirm_password) {
            newErrors.confirm_password = "Re-typed Access Key does not match.";
        }

        // 7. Geographic completeness
        if (!formData.state) newErrors.state = "Required";
        if (!formData.district) newErrors.district = "Required";
        if (!formData.city) newErrors.city = "Required";
        if (!formData.address) newErrors.address = "Address details are required.";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error("Please correct the highlighted errors.");

            // Scroll to the first error field
            const firstErrorField = Object.keys(newErrors)[0];
            const element = document.getElementsByName(firstErrorField)[0];
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.focus();
            }
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post('/api/organization/register', formData);
            toast.success("Welcome aboard! Your enterprise account has been established.");

            // Save authentication data to localStorage
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('role', 'organization');
            localStorage.setItem('user', JSON.stringify(response.data.user));

            setTimeout(() => navigate('/organization/dashboard'), 1500);
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.error || "Registration process failed. Please check your signal or inputs.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleAutoFetchLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser.");
            return;
        }

        const toastId = toast.loading("Accessing satellite data...");
        setFetchingLocation(true);

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const { address } = response.data;

                setFormData(prev => ({
                    ...prev,
                    state: address.state || '',
                    district: address.county || address.state_district || '',
                    city: address.city || address.town || address.village || address.suburb || ''
                }));
                toast.success("Location synchronized successfully.", { id: toastId });
            } catch (error) {
                console.error(error);
                toast.error("Failed to resolve address signatures.", { id: toastId });
            } finally {
                setFetchingLocation(false);
            }
        }, (error) => {
            toast.error("Position access denied by user.", { id: toastId });
            setFetchingLocation(false);
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/30 flex items-center justify-center p-6 py-10 font-sans selection:bg-red-100">

            {/* Background Decorative Elements */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-[-5%] left-[-5%] w-[35%] h-[35%] bg-red-600/5 blur-[100px] rounded-full animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-blue-600/5 blur-[130px] rounded-full"></div>
            </div>

            <div className="max-w-6xl w-full bg-white/90 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col md:flex-row border border-white/50 relative">

                {/* Left Side: Onboarding Content */}
                <div className="md:w-[32%] bg-gradient-to-b from-gray-50/50 to-white/50 p-12 flex flex-col justify-between border-r border-gray-100/50">
                    <div>
                        <div className="flex items-center gap-3 mb-10">
                            <div className="w-12 h-12 bg-gradient-to-tr from-red-600 to-red-500 rounded-2xl flex items-center justify-center shadow-xl shadow-red-200 ring-4 ring-red-50">
                                <i className="fas fa-hand-holding-medical text-white text-xl"></i>
                            </div>
                            <span className="text-2xl font-black text-gray-900 tracking-tight">eBloodBank</span>
                        </div>

                        <h2 className="text-4xl font-black text-gray-900 mb-8 leading-[1.15] tracking-tight">
                            Digitalize Your <br />
                            <span className="bg-gradient-to-r from-red-600 to-rose-500 bg-clip-text text-transparent">Healthcare</span> <br />
                            Network.
                        </h2>
                        <p className="text-gray-500 text-lg leading-relaxed mb-10 font-medium">
                            Join the leading ecosystem connecting medical facilities with life-saving donor networks instantly.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="group p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex items-start gap-4 hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300">
                            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shrink-0 group-hover:bg-red-600 group-hover:text-white transition-all shadow-sm">
                                <i className="fas fa-tower-broadcast text-lg"></i>
                            </div>
                            <div>
                                <h4 className="font-black text-gray-900 text-sm mb-1">Live Tracking</h4>
                                <p className="text-xs font-bold text-gray-500 leading-relaxed">Real-time sync with local donor availability</p>
                            </div>
                        </div>
                        <div className="group p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex items-start gap-4 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                <i className="fas fa-file-shield text-lg"></i>
                            </div>
                            <div>
                                <h4 className="font-black text-gray-900 text-sm mb-1">High Security</h4>
                                <p className="text-xs font-bold text-gray-500 leading-relaxed">Encrypted medical record management</p>
                            </div>
                        </div>
                        <div className="group p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex items-start gap-4 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm">
                                <i className="fas fa-bolt-lightning text-lg"></i>
                            </div>
                            <div>
                                <h4 className="font-black text-gray-900 text-sm mb-1">Quick Alerts</h4>
                                <p className="text-xs font-bold text-gray-500 leading-relaxed">Broadcast emergency blood requests instantly</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 mt-6">
                        <p className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-[0.2em]">Medical Desk Support</p>
                        <p className="text-gray-900 font-extrabold text-xl tracking-tight">+91 91234 56789</p>
                    </div>
                </div>

                {/* Right Side: Structured Registration Form */}
                <div className="md:w-[68%] p-8 md:p-14 bg-white">
                    <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="inline-block px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                                Corporate Onboarding
                            </div>
                            <h1 className="text-3xl font-black text-gray-900 mb-1 tracking-tight">Facility Registration</h1>
                            <p className="text-gray-500 font-medium text-sm italic-none">Initialize your official enterprise account.</p>
                        </div>
                        <Link to="/organization/login" className="flex items-center gap-2 text-sm font-black text-red-600 hover:text-white transition-all duration-300 bg-red-50 hover:bg-red-600 px-8 py-4 rounded-2xl shadow-sm border border-red-100 hover:shadow-xl hover:shadow-red-500/10 group">
                            Login Instead <i className="fas fa-sign-in-alt group-hover:translate-x-1 transition-transform"></i>
                        </Link>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-10" noValidate>

                        {/* Section 1: Facility Identity */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">
                                <span className="w-8 h-[3px] bg-red-600 rounded-full"></span>
                                Primary Identity
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-black text-gray-800 ml-1">Facility Type</label>
                                    <div className="relative group/select">
                                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-400 group-focus-within/select:text-red-500 transition-colors">
                                            <i className="fas fa-building-circle-check"></i>
                                        </div>
                                        <select
                                            name="type"
                                            value={formData.type}
                                            onChange={handleChange}
                                            className={`w-full pl-14 pr-6 py-5 bg-gray-50 border ${errors.type ? 'border-red-500 ring-2 ring-red-500/10' : 'border-gray-100'} rounded-[1.5rem] focus:bg-white focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 outline-none transition-all cursor-pointer font-bold text-gray-900 appearance-none shadow-sm hover:border-gray-200`}
                                        >
                                            <option value="" disabled>Select Facility Type</option>
                                            <option value="Hospital">Multi-Specialty Hospital</option>
                                            <option value="Blood Bank">Blood Bank</option>
                                            <option value="Clinic">Specialized Clinic</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none text-gray-400">
                                            <i className="fas fa-chevron-down text-xs"></i>
                                        </div>
                                    </div>
                                    {errors.type && <p className="text-red-500 text-xs font-bold ml-2 mt-1">{errors.type}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-black text-gray-800 ml-1">Registration/License ID</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-400 group-focus-within:text-red-500 transition-colors">
                                            <i className="fas fa-id-card-clip"></i>
                                        </div>
                                        <input
                                            type="text"
                                            name="license_number"
                                            value={formData.license_number}
                                            onChange={handleChange}
                                            placeholder="e.g. LIC-2024-8890"
                                            className={`w-full pl-14 pr-6 py-5 bg-gray-50 border ${errors.license_number ? 'border-red-500 ring-2 ring-red-500/10' : 'border-gray-100'} rounded-[1.5rem] focus:bg-white focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 outline-none transition-all placeholder:text-gray-300 font-bold text-gray-900 shadow-sm hover:border-gray-200`}
                                        />
                                    </div>
                                    {errors.license_number && <p className="text-red-500 text-xs font-bold ml-2 mt-1">{errors.license_number}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-black text-gray-800 ml-1">Official Legal Name</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-400 group-focus-within:text-red-500 transition-colors">
                                            <i className="fas fa-hospital"></i>
                                        </div>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="Full legal facility name"
                                            className={`w-full pl-14 pr-6 py-5 bg-gray-50 border ${errors.name ? 'border-red-500 ring-2 ring-red-500/10' : 'border-gray-100'} rounded-[1.5rem] focus:bg-white focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 outline-none transition-all placeholder:text-gray-300 font-bold text-gray-900 shadow-sm hover:border-gray-200`}
                                        />
                                    </div>
                                    {errors.name && <p className="text-red-500 text-xs font-bold ml-2 mt-1">{errors.name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-black text-gray-800 ml-1">Communication Email</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-400 group-focus-within:text-red-500 transition-colors">
                                            <i className="fas fa-envelope-circle-check"></i>
                                        </div>
                                        <input
                                            type="text"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="corporate@facility.com"
                                            className={`w-full pl-14 pr-6 py-5 bg-gray-50 border ${errors.email ? 'border-red-500 ring-2 ring-red-500/10' : 'border-gray-100'} rounded-[1.5rem] focus:bg-white focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 outline-none transition-all placeholder:text-gray-300 font-bold text-gray-900 shadow-sm hover:border-gray-200`}
                                        />
                                    </div>
                                    {errors.email && <p className="text-red-500 text-xs font-bold ml-2 mt-1">{errors.email}</p>}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-black text-gray-800 ml-1">Contact Hotline</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-red-600 font-black text-sm group-focus-within:text-red-700 transition-colors">
                                            <span>+91</span>
                                            <span className="ml-3 w-[1px] h-6 bg-gray-200"></span>
                                        </div>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="XXXXX XXXXX"
                                            className={`w-full pl-20 pr-6 py-5 bg-gray-50 border ${errors.phone ? 'border-red-500 ring-2 ring-red-500/10' : 'border-gray-100'} rounded-[1.5rem] focus:bg-white focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 outline-none transition-all placeholder:text-gray-300 font-bold text-gray-900 shadow-sm hover:border-gray-200`}
                                        />
                                        <div className="absolute inset-y-0 right-6 flex items-center pointer-events-none">
                                            <i className="fas fa-square-phone text-gray-400 group-focus-within:text-red-500 transition-colors"></i>
                                        </div>
                                    </div>
                                    {errors.phone && <p className="text-red-500 text-xs font-bold ml-2 mt-1">{errors.phone}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Regional Details */}
                        <div className="space-y-4 pt-6 border-t border-gray-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">
                                    <span className="w-8 h-[3px] bg-red-600 rounded-full"></span>
                                    Geographic Location
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAutoFetchLocation}
                                    disabled={fetchingLocation}
                                    className={`text-[10px] font-black uppercase tracking-wider ${fetchingLocation ? 'text-gray-400 bg-gray-50' : 'text-red-600 hover:text-red-700 bg-red-50'} px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 border ${fetchingLocation ? 'border-gray-100' : 'border-red-100 hover:shadow-sm'}`}
                                >
                                    {fetchingLocation ? (
                                        <><i className="fas fa-spinner fa-spin"></i> Fetching...</>
                                    ) : (
                                        <><i className="fas fa-location-crosshairs"></i> Auto-fetch</>
                                    )}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <div className="relative group/field">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within/field:text-red-500 transition-colors">
                                            <i className="fas fa-map-location-dot"></i>
                                        </div>
                                        <input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="State" className={`w-full pl-12 px-6 py-4 bg-gray-50 border ${errors.state ? 'border-red-500 ring-2 ring-red-500/10' : 'border-gray-100'} rounded-[1.5rem] focus:bg-white focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 outline-none transition-all placeholder:text-gray-400 font-bold text-gray-900 shadow-sm`} />
                                    </div>
                                    {errors.state && <p className="text-red-500 text-xs font-bold ml-2">{errors.state}</p>}
                                </div>
                                <div className="space-y-2">
                                    <div className="relative group/field">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within/field:text-red-500 transition-colors">
                                            <i className="fas fa-map-pin"></i>
                                        </div>
                                        <input type="text" name="district" value={formData.district} onChange={handleChange} placeholder="District" className={`w-full pl-12 px-6 py-4 bg-gray-50 border ${errors.district ? 'border-red-500 ring-2 ring-red-500/10' : 'border-gray-100'} rounded-[1.5rem] focus:bg-white focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 outline-none transition-all placeholder:text-gray-400 font-bold text-gray-900 shadow-sm`} />
                                    </div>
                                    {errors.district && <p className="text-red-500 text-xs font-bold ml-2">{errors.district}</p>}
                                </div>
                                <div className="space-y-2">
                                    <div className="relative group/field">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within/field:text-red-500 transition-colors">
                                            <i className="fas fa-city"></i>
                                        </div>
                                        <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="City / Area" className={`w-full pl-12 px-6 py-4 bg-gray-50 border ${errors.city ? 'border-red-500 ring-2 ring-red-500/10' : 'border-gray-100'} rounded-[1.5rem] focus:bg-white focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 outline-none transition-all placeholder:text-gray-400 font-bold text-gray-900 shadow-sm`} />
                                    </div>
                                    {errors.city && <p className="text-red-500 text-xs font-bold ml-2">{errors.city}</p>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-black text-gray-800 ml-1">Certified Physical Address</label>
                                <div className="relative group">
                                    <div className="absolute top-5 left-6 text-gray-400 group-focus-within:text-red-500 transition-colors">
                                        <i className="fas fa-location-arrow"></i>
                                    </div>
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Enter full physical location details..."
                                        rows="3"
                                        className={`w-full pl-14 pr-6 py-5 bg-gray-50 border ${errors.address ? 'border-red-500 ring-2 ring-red-500/10' : 'border-gray-100'} rounded-[1.5rem] focus:bg-white focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 outline-none transition-all placeholder:text-gray-300 font-bold text-gray-900 shadow-sm resize-none`}
                                    ></textarea>
                                </div>
                                {errors.address && <p className="text-red-500 text-xs font-bold ml-2 mt-1">{errors.address}</p>}
                            </div>
                        </div>

                        {/* Section 3: Credentials */}
                        <div className="space-y-4 pt-6 border-t border-gray-50">
                            <div className="flex items-center gap-3 text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">
                                <span className="w-8 h-[3px] bg-red-600 rounded-full"></span>
                                Security Authorization
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center italic-none">
                                <div className="space-y-2">
                                    <label className="text-sm font-black text-gray-800 ml-1 text-left block">Access Key</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-400 group-focus-within:text-red-500 transition-colors">
                                            <i className="fas fa-key"></i>
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="••••••••"
                                            className={`w-full pl-14 pr-12 py-5 bg-gray-50 border ${errors.password ? 'border-red-500 ring-2 ring-red-500/10' : 'border-gray-100'} rounded-[1.5rem] focus:bg-white focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 outline-none transition-all placeholder:text-gray-300 font-bold shadow-sm hover:border-gray-200`}
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
                                    {errors.password && <p className="text-red-500 text-xs font-bold ml-2 mt-1">{errors.password}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-black text-gray-800 ml-1 text-left block">Re-type Access Key</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-400 group-focus-within:text-red-500 transition-colors">
                                            <i className="fas fa-lock"></i>
                                        </div>
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="confirm_password"
                                            value={formData.confirm_password}
                                            onChange={handleChange}
                                            placeholder="••••••••"
                                            className={`w-full pl-14 pr-12 py-5 bg-gray-50 border ${errors.confirm_password ? 'border-red-500 ring-2 ring-red-500/10' : 'border-gray-100'} rounded-[1.5rem] focus:bg-white focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 outline-none transition-all placeholder:text-gray-300 font-bold shadow-sm hover:border-gray-200`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                                        >
                                            {showConfirmPassword ? (
                                                <i className="fas fa-eye-slash"></i>
                                            ) : (
                                                <i className="fas fa-eye"></i>
                                            )}
                                        </button>
                                    </div>
                                    {errors.confirm_password && <p className="text-red-500 text-xs font-bold ml-2 mt-1">{errors.confirm_password}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white font-black py-6 rounded-[2rem] hover:from-red-600 hover:to-rose-600 transition-all duration-500 shadow-2xl shadow-gray-200 active:scale-[0.98] disabled:opacity-50 text-xl tracking-[0.05em] uppercase overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-4">
                                    {loading ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i> Processing Request...
                                        </>
                                    ) : (
                                        <>
                                            Establish Enterprise Access <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                                        </>
                                    )}
                                </span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Back to Home Button */}
            <Link
                to="/#organization-section"
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
        </div>
    );
}
