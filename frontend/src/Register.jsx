import React, { useEffect, useState } from "react";
import { useGoogleLogin } from '@react-oauth/google';
import CompleteProfileModal from "./CompleteProfileModal";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const [signupError, setSignupError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);

  // Field validation states
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Field error states
  const [usernameError, setUsernameError] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  // Password strength
  const [passwordStrength, setPasswordStrength] = useState({ level: 0, label: "", color: "" });

  useEffect(() => {
    document.body.classList.add("register-page");
    return () => {
      document.body.classList.remove("register-page");
    };
  }, []);

  // Auto-slide images every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Password strength calculator
  const calculatePasswordStrength = (pwd) => {
    if (!pwd) {
      return { level: 0, label: "", color: "" };
    }

    // Check for spaces
    if (/\s/.test(pwd)) {
      return { level: 0, label: "Invalid (No spaces)", color: "#ef4444" };
    }



    // Refined logic based on exact prompt:
    // "if only alphabets show easy"
    // "if numbers also included show normal" -> implies Alphabets + Numbers
    // "if special symbols included show hard" -> implies Alphabets (+ Numbers) + Special OR just Special included?
    // "only show hard if there is a letter 1 number and 1 special symbol..else show normal.."

    const hasAlpha = /[a-zA-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);

    if (hasAlpha && hasNumber && hasSpecial) {
      return { level: 3, label: "Hard", color: "#10b981" };
    } else if ((hasAlpha && hasNumber) || (hasAlpha && hasSpecial) || (hasNumber && hasSpecial)) {
      // "else show normal" - interpreted as if it has at least 2 types but not all 3? 
      // Or strictly if it fails hard criteria but is better than easy?
      // Let's go with: if it's not Hard, but has mix, it's Normal.
      return { level: 2, label: "Normal", color: "#f59e0b" };
    } else {
      // Only one type or weak
      return { level: 1, label: "Easy", color: "#ef4444" };
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsSubmitting(true);
        setSignupError("");
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: tokenResponse.access_token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Google Signup failed");

        if (data.token) {
          localStorage.setItem("authToken", data.token);
          console.log("Google Auth token set.", data.token);
        }
        if (data.user && data.user.blood_type) {
          window.location.href = "/dashboard";
        } else {
          setShowCompleteProfileModal(true);
        }
      } catch (err) {
        setSignupError(err.message);
        setIsSubmitting(false);
      }
    },
    onError: () => {
      setSignupError("Google Signup Failed");
    }
  });

  // Validation functions
  const validateUsername = (value) => {
    if (!value.trim()) {
      return "Username is required.";
    }
    if (value.length < 3) {
      return "Username must be at least 3 characters.";
    }
    if (value.length > 30) {
      return "Username must not exceed 30 characters.";
    }
    // "Username must start with a letter and contain only letters, numbers or underscores."
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
      return "Username must start with a letter and contain only letters, numbers, or underscores.";
    }
    return "";
  };

  const validateName = (value) => {
    if (!value.length) { // Check raw value for empty if needed, but usually trim is better for "required". 
      // But for "leading space", we must check raw value.
      // However, initial state is empty string.
    }

    // "full name should not start with space.."
    if (value.startsWith(" ")) {
      return "Full name should not start with space.";
    }

    if (!value.trim()) {
      return "Full name is required.";
    }
    if (value.trim().length < 2) {
      return "Full name must be at least 2 characters.";
    }
    if (value.trim().length > 50) {
      return "Full name must not exceed 50 characters.";
    }
    // "Full name can only contain letters, spaces, must start with a letter."
    // The previous regex /^[a-zA-Z][a-zA-Z\s]*$/ already enforced start with letter.
    // But user explicitly asked for "should not start with space". 
    // If it starts with space, regex matches? No. /^[a-zA-Z]/
    // So actually the REGEX already handles "should not start with space".
    // But maybe they want a specific error message for it? 
    // Handled above explicitly.

    if (!/^[a-zA-Z][a-zA-Z\s]*$/.test(value.trim())) {
      return "Full name can only contain letters and spaces, and must start with a letter.";
    }
    return "";
  };

  const validateEmail = (value) => {
    if (!value.trim()) {
      return "Email is required.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "Please enter a valid email address.";
    }
    if (value.length > 100) {
      return "Email must not exceed 100 characters.";
    }
    return "";
  };

  const validatePassword = (value) => {
    if (!value) {
      return "Password is required.";
    }
    if (value.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (value.length > 128) {
      return "Password must not exceed 128 characters.";
    }
    // "password must not contains space"
    if (/\s/.test(value)) {
      return "Password must not contain spaces.";
    }
    return "";
  };

  const validateConfirmPassword = (value, originalPassword) => {
    if (!value) {
      return "Please confirm your password.";
    }
    if (value !== originalPassword) {
      return "Passwords do not match.";
    }
    return "";
  };

  // Real-time validation handlers
  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    setUsernameError(validateUsername(value));
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setName(value);
    setNameError(validateName(value));
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError(validateEmail(value));
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    // Optional: Prevent typing space immediately? User said "password must not contains space.." 
    // Usually easier to validate, but preventing input is also valid. 
    // I will validate it as per error message logic, but also if I can just prevent it, it's better UX?
    // "password must not contains space" -> sounds like validation rule.
    // I added validation in validatePassword. I will proceed with that.
    setPassword(value);
    setPasswordError(validatePassword(value));
    setPasswordStrength(calculatePasswordStrength(value));
    // Re-validate confirm password if it exists
    if (confirmPassword) {
      setConfirmPasswordError(validateConfirmPassword(confirmPassword, value));
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setConfirmPasswordError(validateConfirmPassword(value, password));
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setSignupError("");

    // Validate all fields
    const usernameVal = username.trim();
    const nameVal = name.trim();
    const emailVal = email.trim();
    const passwordVal = password;
    const confirmVal = confirmPassword;

    const usernameErr = validateUsername(usernameVal);
    const nameErr = validateName(nameVal);
    const emailErr = validateEmail(emailVal);
    const passwordErr = validatePassword(passwordVal);
    const confirmErr = validateConfirmPassword(confirmVal, passwordVal);

    setUsernameError(usernameErr);
    setNameError(nameErr);
    setEmailError(emailErr);
    setPasswordError(passwordErr);
    setConfirmPasswordError(confirmErr);

    if (usernameErr || nameErr || emailErr || passwordErr || confirmErr) {
      setSignupError("Please fix the errors in the form.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameVal,
          full_name: nameVal,
          email: emailVal,
          password: passwordVal,
          confirm_password: confirmVal,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Signup failed");
      }

      // persist token if backend returns it
      if (data.token) {
        localStorage.setItem("authToken", data.token);
        console.log("Auth token set.", data.token);
      }
      setShowCompleteProfileModal(true);
    } catch (err) {
      console.error("Signup error:", err);
      setSignupError(err.message || "Signup failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <main className="auth-page">
        <section className="auth-card register" aria-label="Sign up">
          <div className="auth-hero image-panel">
            <div className="panel-slides">
              <div
                className={`slide ${slideIdx === 0 ? "active" : ""}`}
                style={{ backgroundImage: "url('/images/b4.png')" }}
              ></div>
              <div
                className={`slide ${slideIdx === 1 ? "active" : ""}`}
                style={{ backgroundImage: "url('/images/b2.png')" }}
              ></div>
              <div
                className={`slide ${slideIdx === 2 ? "active" : ""}`}
                style={{ backgroundImage: "url('/images/b3.png')" }}
              ></div>
              <div
                className="panel-dots"
                role="tablist"
                aria-label="Slideshow dots"
              >
                <button
                  className={`dot ${slideIdx === 0 ? "active" : ""}`}
                  onClick={() => setSlideIdx(0)}
                  aria-label="Show slide 1"
                ></button>
                <button
                  className={`dot ${slideIdx === 1 ? "active" : ""}`}
                  onClick={() => setSlideIdx(1)}
                  aria-label="Show slide 2"
                ></button>
                <button
                  className={`dot ${slideIdx === 2 ? "active" : ""}`}
                  onClick={() => setSlideIdx(2)}
                  aria-label="Show slide 3"
                ></button>
              </div>
            </div>
          </div>

          <div className="auth-body">
            <div className="form-header">
              <div className="eyebrow">Donor portal</div>
              <h2>Create an account</h2>
              <p>Step into the donor community with a secure profile.</p>
            </div>


            <form
              id="signup-form"
              className="form"
              noValidate
              onSubmit={handleSignup}
            >
              <div className="input-group">
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </span>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    aria-required="true"
                    placeholder=" "
                    autoComplete="username"
                    className={`has-icon ${usernameError ? "error-input" : ""}`}
                    value={username}
                    onChange={handleUsernameChange}
                    onBlur={handleUsernameChange}
                  />
                  <label htmlFor="username">Username</label>
                </div>
                {usernameError && (
                  <div className="field-error" role="alert">{usernameError}</div>
                )}
              </div>

              <div className="input-group">
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </span>
                  <input
                    id="fullName"
                    name="name"
                    type="text"
                    required
                    aria-required="true"
                    placeholder=" "
                    autoComplete="name"
                    className={`has-icon ${nameError ? "error-input" : ""}`}
                    value={name}
                    onChange={handleNameChange}
                    onBlur={handleNameChange}
                  />
                  <label htmlFor="fullName">Full name</label>
                </div>
                {nameError && (
                  <div className="field-error" role="alert">{nameError}</div>
                )}
              </div>

              <div className="input-group">
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    aria-required="true"
                    placeholder=" "
                    autoComplete="email"
                    className={`has-icon ${emailError ? "error-input" : ""}`}
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={handleEmailChange}
                  />
                  <label htmlFor="email">Email</label>
                </div>
                {emailError && (
                  <div className="field-error" role="alert">{emailError}</div>
                )}
              </div>

              <div className="input-group has-toggle">
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    minLength={8}
                    required
                    aria-required="true"
                    placeholder=" "
                    autoComplete="new-password"
                    className={`has-icon ${passwordError ? "error-input" : ""}`}
                    value={password}
                    onChange={handlePasswordChange}
                    onBlur={handlePasswordChange}
                  />
                  <label htmlFor="password">Password (min 8 chars)</label>
                  <button
                    type="button"
                    className={`pw-toggle ${showPassword ? "active" : ""}`}
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
                {password && (
                  <div className="strength-meter" aria-live="polite">
                    <div className="strength-bars">
                      <span style={{ background: passwordStrength.level >= 1 ? passwordStrength.color : "#e5e7eb" }}></span>
                      <span style={{ background: passwordStrength.level >= 2 ? passwordStrength.color : "#e5e7eb" }}></span>
                      <span style={{ background: passwordStrength.level >= 3 ? passwordStrength.color : "#e5e7eb" }}></span>
                    </div>
                    {passwordStrength.label && (
                      <span className="strength-label" style={{ color: passwordStrength.color }}>
                        {passwordStrength.label}
                      </span>
                    )}
                  </div>
                )}
                {passwordError && (
                  <div className="field-error" role="alert">{passwordError}</div>
                )}
              </div>

              <div className="input-group has-toggle">
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </span>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    aria-required="true"
                    placeholder=" "
                    autoComplete="new-password"
                    className={`has-icon ${confirmPasswordError ? "error-input" : ""}`}
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    onBlur={handleConfirmPasswordChange}
                  />
                  <label htmlFor="confirmPassword">Confirm password</label>
                  <button
                    type="button"
                    className={`pw-toggle ${showConfirmPassword ? "active" : ""}`}
                    aria-label="Toggle password visibility"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
                {confirmPasswordError && (
                  <div className="field-error" role="alert">{confirmPasswordError}</div>
                )}
              </div>

              <div
                id="signup-error"
                className={`error ${signupError ? "show" : ""}`}
                role="alert"
              >
                {signupError}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                aria-label="Submit registration"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating account..." : "Create account"}
              </button>
            </form>

            <div className="divider">
              <span>or continue with Google</span>
            </div>

            <button
              id="google-signup"
              className="btn btn-google"
              type="button"
              data-mode="signup"
              aria-label="Sign up with Google"
              onClick={() => googleLogin()}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 533.5 544.3"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  fill="#EA4335"
                  d="M533.5 278.4c0-18.4-1.5-36.9-4.7-54.8H272v103.9h147.5c-6.4 34.6-26 63.9-55.5 83.5v69.4h89.7c52.5-48.3 79.8-119.5 79.8-201.9z"
                />
                <path
                  fill="#34A853"
                  d="M272 544.3c72.4 0 133.1-23.9 177.4-64.9l-89.7-69.4c-24.9 16.7-56.6 26.5-87.7 26.5-67.4 0-124.6-45.5-145-106.7h-92.4v67.1c44.7 88.4 136.4 147.4 237.4 147.4z"
                />
                <path
                  fill="#4A90E2"
                  d="M127 329.8c-10.4-30.9-10.4-64.3 0-95.2v-67.1H34.6c-38.6 76.8-38.6 165.6 0 242.4L127 329.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M272 107.7c36.7-.6 71.6 13 98.4 37.9l73.4-73.4C404.9 24.3 343.8-.5 272 0 170.9 0 79.3 58.9 34.6 147.5L127 234.6C147.4 173.2 204.6 127.8 272 127.8z"
                />
              </svg>
              Sign up with Google
            </button>

            <div className="footer">
              Already have an account? <a href="/login">Sign in</a>
            </div>
          </div>
        </section>
      </main>

      <a
        className="back-chip"
        href="/"
        aria-label="Back to homepage"
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
      </a>
      {console.log("showCompleteProfileModal state:", showCompleteProfileModal)}
      {showCompleteProfileModal && <CompleteProfileModal onClose={() => setShowCompleteProfileModal(false)} />}
    </div>
  );
}
