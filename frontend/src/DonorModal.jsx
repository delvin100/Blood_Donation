import React, { useState, useEffect } from 'react';
import API from './api';
import './DonorModal.css';

export default function DonorModal({ isOpen, onClose }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    blood_type: '',
    username: '',
    password: '',
    confirm_password: '',
    dob: '',
    gender: '',
    availability: 'Available',
    consent: false
  });
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [disabledFields, setDisabledFields] = useState({
    username: true,
    blood_type: true,
    dob: true,
    email: true,
    password: true,
    confirm_password: true,
    consent: true
  });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setMode('login');
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        blood_type: '',
        username: '',
        password: '',
        confirm_password: '',
        dob: '',
        gender: '',
        availability: 'Available',
        consent: false
      });
      setLoginData({ username: '', password: '' });
      setErrors({});
      setTouched({});
      setDisabledFields({
        username: true,
        blood_type: true,
        dob: true,
        email: true,
        password: true,
        confirm_password: true,
        consent: true
      });
      setProgress(0);
      setMessage('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (mode === 'register') {
      updateProgress();
    }
  }, [formData, mode]);

  const updateProgress = () => {
    const required = ['full_name', 'username', 'blood_type', 'dob', 'email', 'password', 'confirm_password', 'gender', 'phone'];
    let validCount = 0;
    
    required.forEach(field => {
      if (field === 'confirm_password') {
        if (formData.password && formData.confirm_password && formData.password === formData.confirm_password) {
          validCount++;
        }
      } else if (formData[field]) {
        validCount++;
      }
    });
    
    if (formData.consent) validCount++;
    
    const total = required.length + 1;
    const percent = validCount / total;
    setProgress(percent);
  };

  const enableNextField = (currentField) => {
    const fieldOrder = ['full_name', 'username', 'blood_type', 'dob', 'email', 'password', 'confirm_password'];
    const index = fieldOrder.indexOf(currentField);
    
    if (index >= 0 && index < fieldOrder.length - 1) {
      const nextField = fieldOrder[index + 1];
      setDisabledFields(prev => ({ ...prev, [nextField]: false }));
    }
    
    // Enable consent when confirm_password matches password
    if (currentField === 'confirm_password' && formData.password === formData.confirm_password) {
      setDisabledFields(prev => ({ ...prev, consent: false }));
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
    
    if (field === 'confirm_password' && value !== formData.password) {
      setErrors(prev => ({ ...prev, [field]: 'Passwords do not match' }));
    }
    
    if (value.trim()) {
      enableNextField(field);
    } else {
      // Disable subsequent fields if current field is cleared
      const fieldOrder = ['full_name', 'username', 'blood_type', 'dob', 'email', 'password', 'confirm_password'];
      const index = fieldOrder.indexOf(field);
      if (index >= 0) {
        const newDisabled = { ...disabledFields };
        for (let i = index + 1; i < fieldOrder.length; i++) {
          newDisabled[fieldOrder[i]] = true;
        }
        if (field === 'confirm_password') {
          newDisabled.consent = true;
          setFormData(prev => ({ ...prev, consent: false }));
        }
        setDisabledFields(newDisabled);
      }
    }
  };

  const handleFieldBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field);
  };

  const validateField = (field) => {
    const value = formData[field];
    let error = '';
    
    switch (field) {
      case 'full_name':
        if (!value.trim()) error = 'Please enter your full name';
        break;
      case 'username':
        if (!value.trim()) error = 'Please choose a username';
        else if (value.length < 3) error = 'Username must be at least 3 characters';
        break;
      case 'blood_type':
        if (!value) error = 'Please select your blood group';
        break;
      case 'dob':
        if (!value) error = 'Please enter your date of birth';
        else {
          const birthDate = new Date(value);
          const today = new Date();
          const age = today.getFullYear() - birthDate.getFullYear();
          if (age < 18 || age > 65) error = 'Age must be between 18 and 65';
        }
        break;
      case 'email':
        if (!value) error = 'Please enter a valid email';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Enter a valid email address';
        break;
      case 'password':
        if (!value) error = 'Please enter a password (min 6 chars)';
        else if (value.length < 6) error = 'Password must be at least 6 characters';
        break;
      case 'confirm_password':
        if (!value) error = 'Please confirm your password';
        else if (value !== formData.password) error = 'Passwords do not match';
        break;
      case 'phone':
        if (!value) error = 'Please enter your phone number';
        else if (!/^[0-9]{10}$/.test(value)) error = 'Phone number must be exactly 10 digits';
        break;
      case 'gender':
        if (!value) error = 'Please select your gender';
        break;
    }
    
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const validateRegister = () => {
    const fields = ['full_name', 'username', 'blood_type', 'dob', 'email', 'password', 'confirm_password', 'phone', 'gender'];
    let isValid = true;
    
    fields.forEach(field => {
      validateField(field);
      if (errors[field] || !formData[field]) {
        isValid = false;
      }
    });
    
    if (!formData.consent) {
      setErrors(prev => ({ ...prev, consent: 'You must accept the authorisation statement' }));
      isValid = false;
    }
    
    return isValid;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    
    try {
      const response = await API.post('/api/auth/login', {
        username: loginData.username,
        password: loginData.password
      });
      
      setMessage('Login successful! Redirecting...');
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    
    if (!validateRegister()) {
      setMessage('Please complete all required fields correctly.');
      return;
    }
    
    setLoading(true);
    try {
      const response = await API.post('/api/auth/register', {
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        blood_type: formData.blood_type,
        username: formData.username,
        password: formData.password,
        confirm_password: formData.confirm_password,
        dob: formData.dob,
        gender: formData.gender,
        availability: formData.availability
      });
      
      setMessage('Registration successful! Redirecting...');
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 2000);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const maxDate = new Date().toISOString().split('T')[0];
  const minDate = new Date(new Date().setFullYear(new Date().getFullYear() - 65)).toISOString().split('T')[0];

  return (
    <div className="donor-modal-overlay">
      {/* Header */}
      <header className="donor-modal-header">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">eBloodBank</h1>
                <p className="text-white/80 text-sm">Blood Donation Portal</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="donor-modal-container">
        <div className="text-center mb-8 fade-in">
          <h1 className="text-3xl font-bold text-white mb-2">Join Our Blood Donation Community</h1>
          <p className="text-white/80">Register as a donor or login to your account</p>
        </div>

        {/* Messages */}
        {message && (
          <div className={`donor-message ${message.includes('successful') ? 'success' : 'error'}`}>
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0 ${message.includes('successful') ? 'bg-green-600' : 'bg-red-600'}`}>
                {message.includes('successful') ? (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                  </svg>
                )}
              </div>
              <span className="font-semibold">{message}</span>
            </div>
          </div>
        )}

        <div className="donor-modal-card fade-in">
          {/* Tabs */}
          {mode !== 'forgot' && (
            <div className="donor-tab-container">
              <button
                onClick={() => setMode('login')}
                className={`donor-tab ${mode === 'login' ? 'active' : ''}`}
              >
                Login
              </button>
              <button
                onClick={() => setMode('register')}
                className={`donor-tab ${mode === 'register' ? 'active' : ''}`}
              >
                Register
              </button>
            </div>
          )}

          <div className="donor-modal-body">
            {/* Login Form */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="login-username" className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                    <input
                      id="login-username"
                      className="donor-input"
                      type="text"
                      value={loginData.username}
                      onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                      placeholder="Enter your username"
                      required
                      autoComplete="username"
                    />
                  </div>
                  <div>
                    <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <div className="relative">
                      <input
                        id="login-password"
                        className="donor-input pr-10"
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginData.password}
                        onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                        placeholder="Enter your password"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <i className={`fas ${showLoginPassword ? 'fa-eye-slash' : 'fa-eye'} text-gray-400 hover:text-gray-600`}></i>
                      </button>
                    </div>
                  </div>
                </div>
                <button type="submit" className="donor-btn" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                      Logging in...
                    </span>
                  ) : (
                    'Login to Account'
                  )}
                </button>
                <div className="flex items-center justify-between text-sm">
                  <p className="text-gray-600">New donor? <button type="button" className="text-red-600 hover:text-red-800 font-medium" onClick={() => setMode('register')}>Register here</button>.</p>
                  <button type="button" className="text-red-600 hover:text-red-800 font-medium">Forgot Password?</button>
                </div>
              </form>
            )}

            {/* Register Form */}
            {mode === 'register' && (
              <div className="relative">
                {/* Progress Blood Drop */}
                <div className="donor-progress-drop">
                  <svg viewBox="0 0 200 240" width="100%" height="520" preserveAspectRatio="xMidYMax meet">
                    <defs>
                      <clipPath id="dropClip">
                        <path d="M100 10 C 60 70, 20 110, 20 150 C 20 200, 55 230, 100 230 C 145 230, 180 200, 180 150 C 180 110, 140 70, 100 10 Z"/>
                      </clipPath>
                    </defs>
                    <rect
                      x="0"
                      y={240 - (240 * progress)}
                      width="200"
                      height={240 * progress}
                      fill="#dc2626"
                      clipPath="url(#dropClip)"
                      style={{ transition: 'height 0.8s ease, y 0.8s ease' }}
                    ></rect>
                    <path d="M100 10 C 60 70, 20 110, 20 150 C 20 200, 55 230, 100 230 C 145 230, 180 200, 180 150 C 180 110, 140 70, 100 10 Z" stroke="#ef4444" strokeWidth="6" fill="transparent"/>
                  </svg>
                </div>

                <form onSubmit={handleRegister} className="relative z-10 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="reg-full-name" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="reg-full-name"
                        className="donor-input"
                        type="text"
                        value={formData.full_name}
                        onChange={(e) => handleFieldChange('full_name', e.target.value)}
                        onBlur={() => handleFieldBlur('full_name')}
                        placeholder="Enter your full name"
                        required
                        autoComplete="name"
                        minLength="1"
                        maxLength="100"
                      />
                      {touched.full_name && errors.full_name && (
                        <div className="text-xs text-red-600 mt-1">{errors.full_name}</div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="reg-username" className="block text-sm font-medium text-gray-700 mb-2">
                        Username <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="reg-username"
                        className="donor-input"
                        type="text"
                        value={formData.username}
                        onChange={(e) => handleFieldChange('username', e.target.value)}
                        onBlur={() => handleFieldBlur('username')}
                        placeholder="Choose a username"
                        required
                        autoComplete="username"
                        minLength="3"
                        maxLength="20"
                        disabled={disabledFields.username}
                      />
                      {touched.username && errors.username && (
                        <div className="text-xs text-red-600 mt-1">{errors.username}</div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="reg-blood-type" className="block text-sm font-medium text-gray-700 mb-2">
                        Blood Group <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="reg-blood-type"
                        className="donor-input"
                        value={formData.blood_type}
                        onChange={(e) => handleFieldChange('blood_type', e.target.value)}
                        onBlur={() => handleFieldBlur('blood_type')}
                        required
                        disabled={disabledFields.blood_type}
                      >
                        <option value="">Select blood group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A−</option>
                        <option value="A1+">A1+</option>
                        <option value="A1-">A1−</option>
                        <option value="A1B+">A1B+</option>
                        <option value="A1B-">A1B−</option>
                        <option value="A2+">A2+</option>
                        <option value="A2-">A2−</option>
                        <option value="A2B+">A2B+</option>
                        <option value="A2B-">A2B−</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB−</option>
                        <option value="B+">B+</option>
                        <option value="B-">B−</option>
                        <option value="Bombay Blood Group">Bombay Blood Group</option>
                        <option value="INRA">INRA</option>
                        <option value="O+">O+</option>
                        <option value="O-">O−</option>
                      </select>
                      {touched.blood_type && errors.blood_type && (
                        <div className="text-xs text-red-600 mt-1">{errors.blood_type}</div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="reg-dob" className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="reg-dob"
                        className="donor-input"
                        type="date"
                        value={formData.dob}
                        onChange={(e) => handleFieldChange('dob', e.target.value)}
                        onBlur={() => handleFieldBlur('dob')}
                        required
                        max={maxDate}
                        min={minDate}
                        disabled={disabledFields.dob}
                      />
                      {touched.dob && errors.dob && (
                        <div className="text-xs text-red-600 mt-1">{errors.dob}</div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="reg-email"
                        className="donor-input"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        onBlur={() => handleFieldBlur('email')}
                        placeholder="your.email@example.com"
                        required
                        autoComplete="email"
                        disabled={disabledFields.email}
                      />
                      {touched.email && errors.email && (
                        <div className="text-xs text-red-600 mt-1">{errors.email}</div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="reg-phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="reg-phone"
                        className="donor-input"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                          handleFieldChange('phone', value);
                        }}
                        onBlur={() => handleFieldBlur('phone')}
                        placeholder="9876543210"
                        required
                        pattern="[0-9]{10}"
                        maxLength="10"
                      />
                      {touched.phone && errors.phone && (
                        <div className="text-xs text-red-600 mt-1">{errors.phone}</div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="reg-gender" className="block text-sm font-medium text-gray-700 mb-2">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="reg-gender"
                        className="donor-input"
                        value={formData.gender}
                        onChange={(e) => handleFieldChange('gender', e.target.value)}
                        onBlur={() => handleFieldBlur('gender')}
                        required
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      {touched.gender && errors.gender && (
                        <div className="text-xs text-red-600 mt-1">{errors.gender}</div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-2">
                          Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="reg-password"
                            className="donor-input pr-10"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={(e) => handleFieldChange('password', e.target.value)}
                            onBlur={() => handleFieldBlur('password')}
                            minLength="6"
                            placeholder="Min. 6 characters"
                            required
                            autoComplete="new-password"
                            disabled={disabledFields.password}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-gray-400 hover:text-gray-600`}></i>
                          </button>
                        </div>
                        {touched.password && errors.password && (
                          <div className="text-xs text-red-600 mt-1">{errors.password}</div>
                        )}
                      </div>
                      <div>
                        <label htmlFor="reg-confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            id="reg-confirm-password"
                            className="donor-input pr-10"
                            type={showPassword2 ? 'text' : 'password'}
                            value={formData.confirm_password}
                            onChange={(e) => handleFieldChange('confirm_password', e.target.value)}
                            onBlur={() => handleFieldBlur('confirm_password')}
                            minLength="6"
                            placeholder="Repeat password"
                            required
                            autoComplete="new-password"
                            disabled={disabledFields.confirm_password}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword2(!showPassword2)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            <i className={`fas ${showPassword2 ? 'fa-eye-slash' : 'fa-eye'} text-gray-400 hover:text-gray-600`}></i>
                          </button>
                        </div>
                        {touched.confirm_password && errors.confirm_password && (
                          <div className="text-xs text-red-600 mt-1">{errors.confirm_password}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <input
                        id="consent"
                        type="checkbox"
                        checked={formData.consent}
                        onChange={(e) => setFormData({...formData, consent: e.target.checked})}
                        required
                        disabled={disabledFields.consent}
                        className="mt-1"
                      />
                      <label htmlFor="consent" className="text-sm text-gray-700 leading-relaxed">
                        I authorise this website to display my name, so that the needy could contact me, as and when there is an emergency. <span className="text-red-500">*</span>
                      </label>
                    </div>
                    {touched.consent && errors.consent && (
                      <div className="text-xs text-red-600 mt-1">{errors.consent}</div>
                    )}
                  </div>

                  <button type="submit" className="donor-btn" disabled={loading}>
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        Creating account...
                      </span>
                    ) : (
                      'Create Donor Account'
                    )}
                  </button>
                  <p className="text-sm text-gray-600 text-center">After submission, you'll be redirected to your dashboard.</p>
                </form>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={onClose}
            className="inline-flex items-center text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
