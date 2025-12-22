import React, { useState, useRef } from 'react';

export default function CompleteProfileModal({ onClose }) {
  const [bloodGroup, setBloodGroup] = useState('');
  const [gender, setGender] = useState('');
  const [dob, setDob] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  // Refs for scrolling to errors
  const bloodRef = useRef(null);
  const dobRef = useRef(null);
  const genderRef = useRef(null);
  const phoneRef = useRef(null);
  const errorRef = useRef(null);

  const scrollToElement = (ref) => {
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const month = today.getMonth() - birth.getMonth();
    if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleCompleteRegistration = async () => {
    setError('');
    setFieldErrors({});

    const newFieldErrors = {};
    if (!bloodGroup) newFieldErrors.bloodGroup = 'Please select your blood group.';
    if (!dob) newFieldErrors.dob = 'Please select your date of birth.';
    if (!gender) newFieldErrors.gender = 'Please select your gender identity.';
    if (!phoneNumber) newFieldErrors.phoneNumber = 'Please enter your phone number.';

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      if (!bloodGroup) scrollToElement(bloodRef);
      else if (!dob) scrollToElement(dobRef);
      else if (!gender) scrollToElement(genderRef);
      else if (!phoneNumber) scrollToElement(phoneRef);
      return;
    }

    const age = calculateAge(dob);
    if (age < 18 || age > 65) {
      setFieldErrors({ dob: 'Age must be between 18 and 65 years.' });
      scrollToElement(dobRef);
      return;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      setFieldErrors({ phoneNumber: 'Phone number must be exactly 10 digits.' });
      scrollToElement(phoneRef);
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setIsSubmitting(false);
        return;
      }

      const res = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ bloodGroup, gender, phoneNumber, dob }),
      });

      const data = await res.json();

      setShowSuccessOverlay(true);

      // Delay to show animation before redirect
      setTimeout(() => {
        onClose();
        window.location.href = "/dashboard";
      }, 2000);

    } catch (err) {
      setError(err.message);
      setTimeout(() => scrollToElement(errorRef), 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div className="profile-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <h2>Complete Your Profile</h2>
          <p>Just few more details to unlock your donor journey</p>
          <div className="progress-dots">
            <span className="dot completed"></span>
            <span className="dot current"></span>
            <span className="dot"></span>
          </div>
          <span className="step-text">STEP 2 OF 3</span>
        </div>

        <div className="modal-body">
          {error && <div className="error-message top-banner" ref={errorRef}>{error}</div>}
          <div className="field-group" ref={bloodRef}>
            <div className="field-label">
              <svg viewBox="0 0 24 24" fill="currentColor" className="blood-icon">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              Blood Group <span className="required">*</span>
            </div>
            <select
              className="blood-group-select"
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Select Blood Group</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="A1+">A1+</option>
              <option value="A1-">A-</option>
              <option value="A1B+">A1B+</option>
              <option value="A1B-">A1B-</option>
              <option value="A2+">A2+</option>
              <option value="A2-">A2-</option>
              <option value="A2B+">A2B+</option>
              <option value="A2B-">A2B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="Bombay Blood Group">Bombay Blood Group</option>
              <option value="INRA">INRA</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
            {fieldErrors.bloodGroup && <div className="error-message field-banner">{fieldErrors.bloodGroup}</div>}
          </div>

          <div className="field-group" ref={dobRef}>
            <div className="field-label">
              <svg viewBox="0 0 24 24" fill="currentColor" className="dob-icon">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z" />
              </svg>
              Date of Birth <span className="required">*</span>
            </div>
            <input
              type="date"
              className="dob-input"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              disabled={isSubmitting}
            />
            {fieldErrors.dob && <div className="error-message field-banner">{fieldErrors.dob}</div>}
          </div>

          <div className="field-group" ref={genderRef}>
            <div className="field-label gender-label">
              <svg viewBox="0 0 24 24" fill="currentColor" className="gender-icon">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
              Gender Identity <span className="required">*</span>
            </div>
            <div className="gender-options">
              <button
                className={`gender-option ${gender === 'Male' ? 'selected' : ''}`}
                onClick={() => setGender('Male')}
                disabled={isSubmitting}
              >
                <div className="icon-wrapper male">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="10" cy="14" r="5"></circle>
                    <path d="M15 9l4-4"></path>
                    <path d="M14 5h5v5"></path>
                  </svg>
                </div>
                <span>Male</span>
                {gender === 'Male' && <div className="selection-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>}
              </button>
              <button
                className={`gender-option ${gender === 'Female' ? 'selected' : ''}`}
                onClick={() => setGender('Female')}
                disabled={isSubmitting}
              >
                <div className="icon-wrapper female">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="5"></circle>
                    <path d="M12 13v7"></path>
                    <path d="M9 17h6"></path>
                  </svg>
                </div>
                <span>Female</span>
                {gender === 'Female' && <div className="selection-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>}
              </button>
              <button
                className={`gender-option ${gender === 'Other' ? 'selected' : ''}`}
                onClick={() => setGender('Other')}
                disabled={isSubmitting}
              >
                <div className="icon-wrapper other">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 8l0 8"></path>
                    <path d="M8 12l8 0"></path>
                  </svg>
                </div>
                <span>Other</span>
                {gender === 'Other' && <div className="selection-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>}
              </button>
            </div>
            {fieldErrors.gender && <div className="error-message field-banner">{fieldErrors.gender}</div>}
          </div>

          <div className="field-group" ref={phoneRef}>
            <div className="field-label">
              <svg viewBox="0 0 24 24" fill="currentColor" className="phone-icon">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
              Phone Number <span className="required">*</span>
            </div>
            <div className="phone-input-group">
              <span className="country-code">IN +91</span>
              <input
                type="tel"
                className="phone-input"
                placeholder="9876543210"
                value={phoneNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                  setPhoneNumber(val);
                }}
                disabled={isSubmitting}
              />
            </div>
            <p className="info-text">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="info-icon">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
              Enter your 10-digit mobile number for emergency contact
            </p>
            {fieldErrors.phoneNumber && <div className="error-message field-banner">{fieldErrors.phoneNumber}</div>}
          </div >
        </div >

        <div className="modal-footer">
          <button
            className="btn btn-primary complete-registration-btn"
            onClick={handleCompleteRegistration}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Completing Profile..." : "Complete Registration"}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="arrow-icon">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
          <p className="security-text">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="security-icon">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 6h2v2h-2V7zm0 4h2v6h-2v-6z" />
            </svg>
            Your information is secure and encrypted
          </p>
        </div>
      </div >

      {showSuccessOverlay && (
        <div className="success-overlay">
          <div className="success-anim-box">
            <div className="confetti-container">
              {/* Confetti pieces will be animated via CSS */}
              {[...Array(12)].map((_, i) => <div key={i} className="confetti" />)}
            </div>
            <div className="success-icon-main">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3>Perfect!</h3>
            <p>Welcome to the community. Entering dashboard...</p>
            <div className="loading-bar-success">
              <div className="progress-fill"></div>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}
