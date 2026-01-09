import React, { useEffect, useState } from "react";
import { useGoogleLogin } from '@react-oauth/google';
import CompleteProfileModal from "./CompleteProfileModal";

export default function DonorLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Forgot Password States
  const [fpStep, setFpStep] = useState(1);
  const [fpEmail, setFpEmail] = useState("");
  const [fpCode, setFpCode] = useState("");
  const [fpNewPassword, setFpNewPassword] = useState("");
  const [fpError, setFpError] = useState("");
  const [fpSuccess, setFpSuccess] = useState("");
  const [fpLoading, setFpLoading] = useState(false);

  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);

  // Field states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Field error states
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

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

  // Disable body scroll when modal is open
  useEffect(() => {
    if (showForgotModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showForgotModal]);

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const openForgotModal = (e) => {
    e.preventDefault();
    setFpStep(1);
    setFpEmail("");
    setFpCode("");
    setFpNewPassword("");
    setFpError("");
    setFpSuccess("");
    setShowForgotModal(true);
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
  };

  // Validation functions
  const validateUsername = (value) => {
    if (!value.trim()) {
      return "Username is required.";
    }
    if (value.trim().length < 3) {
      return "Username must be at least 3 characters.";
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
    return "";
  };

  // Real-time validation handlers
  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    setUsernameError(validateUsername(value));
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordError(validatePassword(value));
  };

  // --- Forgot Password Handlers ---

  const handleFpSendCode = async () => {
    console.log("Handle FP Send Code Clicked", fpEmail); // DEBUG
    const emailErr = validateEmail(fpEmail);
    if (emailErr) {
      setFpError(emailErr);
      return;
    }
    setFpError("");
    setFpLoading(true);

    try {
      console.log("Sending request to /api/auth/forgot-password"); // DEBUG
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail }),
      });
      const data = await res.json();
      console.log("Response:", data); // DEBUG
      if (!res.ok) throw new Error(data.error || "Failed to send code.");

      setFpStep(2); // Move to Step 2
      setFpSuccess("Verification code sent to your email.");
    } catch (err) {
      console.error("Error in FP flow:", err); // DEBUG
      setFpError(err.message);
    } finally {
      setFpLoading(false);
    }
  };

  const handleFpVerifyCode = async () => {
    if (!fpCode || fpCode.length !== 4) {
      setFpError("Please enter the 4-digit code.");
      return;
    }
    setFpError("");
    setFpSuccess("");
    setFpLoading(true);

    try {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail, code: fpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code.");

      setFpStep(3); // Move to Step 3
      setFpSuccess("Code verified. Set your new password.");
    } catch (err) {
      setFpError(err.message);
    } finally {
      setFpLoading(false);
    }
  };

  const handleFpResetComplete = async () => {
    const passErr = validatePassword(fpNewPassword);
    if (passErr) {
      setFpError(passErr);
      return;
    }
    setFpError("");
    setFpSuccess("");
    setFpLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fpEmail, code: fpCode, newPassword: fpNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password.");

      setFpSuccess("Password reset successfully! Redirecting...");
      setTimeout(() => {
        closeForgotModal();
      }, 2000);
    } catch (err) {
      setFpError(err.message);
    } finally {
      setFpLoading(false);
    }
  };

  // --- End Forgot Password Handlers ---

  // Google user state for completion modal
  const [googleUser, setGoogleUser] = useState(null);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsSubmitting(true);
        setLoginError("");
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: tokenResponse.access_token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Google Login failed");

        if (data.token) {
          localStorage.setItem("authToken", data.token);
        }

        if (data.user && data.user.blood_type) {
          window.location.href = "/dashboard";
        } else {
          setGoogleUser(data.user);
          setShowCompleteProfileModal(true);
        }
      } catch (err) {
        setLoginError(err.message);
        setIsSubmitting(false);
      }
    },
    onError: () => {
      setLoginError("Google Login Failed");
    }
  });

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError("");

    // Validate all fields
    const usernameVal = username.trim();
    const passwordVal = password;

    const usernameErr = validateUsername(usernameVal);
    const passwordErr = validatePassword(passwordVal);

    setUsernameError(usernameErr);
    setPasswordError(passwordErr);

    if (usernameErr || passwordErr) {
      setLoginError("Please fix the errors in the form.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameVal, password: passwordVal }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Invalid credentials");
      }

      if (data.token) {
        localStorage.setItem("authToken", data.token);
      }
      window.location.href = "/dashboard";
    } catch (err) {
      setLoginError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <main className="auth-page">
        <section className="auth-card register" aria-label="Sign in">
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
              <h2>Sign in to your account</h2>
              <p>Use your credentials or Google to access your dashboard.</p>
            </div>


            <form
              id="login-form"
              className="form"
              noValidate
              onSubmit={handleLogin}
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
                    id="loginUsername"
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
                  <label htmlFor="loginUsername">Username</label>
                </div>
                {usernameError && (
                  <div className="field-error" role="alert">{usernameError}</div>
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
                    id="loginPassword"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    aria-required="true"
                    minLength={8}
                    placeholder=" "
                    autoComplete="current-password"
                    className={`has-icon ${passwordError ? "error-input" : ""}`}
                    value={password}
                    onChange={handlePasswordChange}
                    onBlur={handlePasswordChange}
                  />
                  <label htmlFor="loginPassword">Password</label>
                  <button
                    type="button"
                    className={`pw-toggle ${showPassword ? "active" : ""}`}
                    aria-label="Toggle password visibility"
                    onClick={togglePassword}
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
                {passwordError && (
                  <div className="field-error" role="alert">{passwordError}</div>
                )}
              </div>

              <div
                id="login-error"
                className={`error ${loginError ? "show" : ""}`}
                role="alert"
              >
                {loginError}
              </div>

              <div className="forgot">
                <a href="#" onClick={openForgotModal} aria-label="Forgot password link">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                aria-label="Submit login"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="divider">
              <span>or continue with Google</span>
            </div>

            <button
              id="google-login"
              className="btn btn-google"
              type="button"
              data-mode="login"
              aria-label="Sign in with Google"
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
              Sign in with Google
            </button>

            <div className="footer">
              New to the platform? <a href="/donor/register">Create account</a>
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

      {/* Forgot Password Modal */}
      <div
        className={`fp-layer ${showForgotModal ? "" : "hidden"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Forgot password"
        onClick={(e) => e.target === e.currentTarget && closeForgotModal()}
      >
        <div className="fp-card">
          <button className="fp-close" aria-label="Close" onClick={closeForgotModal}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="fp-hero">
            <div className="fp-icon-circle">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" stroke="#ef4444" fill="none" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3>Reset Your Password</h3>
            <p>
              {fpStep === 1 && "Enter your registered email to receive a verification code."}
              {fpStep === 2 && "Enter the 4-digit code sent to your email."}
              {fpStep === 3 && "Create a new password for your account."}
            </p>
          </div>

          <div className="fp-body">
            {/* Success Message Banner */}
            <div className={`fp-success ${fpSuccess ? "show" : ""}`} role="status">
              {fpSuccess}
            </div>

            {/* Step 1: Email */}
            {fpStep === 1 && (
              <>
                <label className="fp-label" htmlFor="fp-email">Registered Email</label>
                <input
                  id="fp-email"
                  className={`fp-input ${fpError ? "error-input" : ""}`}
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={fpEmail}
                  onChange={(e) => {
                    setFpEmail(e.target.value);
                    setFpError("");
                  }}
                  disabled={fpLoading}
                />
                <button
                  className="fp-btn"
                  type="button"
                  onClick={handleFpSendCode}
                  disabled={fpLoading}
                >
                  {fpLoading ? "Sending Code..." : "Send Verification Code"}
                </button>
              </>
            )}

            {/* Step 2: Code */}
            {fpStep === 2 && (
              <>
                <label className="fp-label" htmlFor="fp-code">4-Digit Code</label>
                <input
                  id="fp-code"
                  className={`fp-input ${fpError ? "error-input" : ""}`}
                  type="text"
                  maxLength="4"
                  placeholder="1234"
                  value={fpCode}
                  onChange={(e) => {
                    setFpCode(e.target.value.replace(/[^0-9]/g, ""));
                    setFpError("");
                  }}
                  disabled={fpLoading}
                />
                <button
                  className="fp-btn"
                  type="button"
                  onClick={handleFpVerifyCode}
                  disabled={fpLoading}
                >
                  {fpLoading ? "Verifying..." : "Verify Code"}
                </button>
                <div className="fp-resend">
                  <button type="button" className="text-btn" onClick={() => setFpStep(1)}>Resend Code</button>
                </div>
              </>
            )}

            {/* Step 3: New Password */}
            {fpStep === 3 && (
              <>
                <label className="fp-label" htmlFor="fp-new-pass">New Password</label>
                <input
                  id="fp-new-pass"
                  className={`fp-input ${fpError ? "error-input" : ""}`}
                  type="password"
                  placeholder="At least 8 characters"
                  minLength="8"
                  value={fpNewPassword}
                  onChange={(e) => {
                    setFpNewPassword(e.target.value);
                    setFpError("");
                  }}
                  disabled={fpLoading}
                />
                <button
                  className="fp-btn"
                  type="button"
                  onClick={handleFpResetComplete}
                  disabled={fpLoading}
                >
                  {fpLoading ? "Resetting..." : "Reset Password"}
                </button>
              </>
            )}

            <div className={`fp-error ${fpError ? "" : "hidden"}`} role="alert">{fpError}</div>
          </div>
        </div>
      </div>
      {showCompleteProfileModal && (
        <CompleteProfileModal onClose={() => setShowCompleteProfileModal(false)} user={googleUser} />
      )}
    </div>
  );
}
