import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = window.FIREBASE_CONFIG || {
  apiKey: "FIREBASE_API_KEY",
  authDomain: "FIREBASE_AUTH_DOMAIN",
  projectId: "FIREBASE_PROJECT_ID",
  appId: "FIREBASE_APP_ID",
};

let firebaseApp;
let auth;

function $(id) {
  return document.getElementById(id);
}

function show(el) {
  if (el) el.classList.add("show");
}

function hide(el) {
  if (el) el.classList.remove("show");
}

function shake(el) {
  if (!el) return;
  el.classList.remove("shake");
  void el.offsetWidth; // restart animation
  el.classList.add("shake");
}

function setStrength(value, meterEl) {
  if (!meterEl) return;
  const bars = Array.from(meterEl.querySelectorAll("span"));
  const score = Math.min(4, Math.floor((value.length || 0) / 2) + (/[A-Z]/.test(value) ? 1 : 0) + (/[0-9]/.test(value) ? 1 : 0));
  bars.forEach((bar, idx) => {
    bar.style.background = idx < score ? "var(--primary)" : "#e5e7eb";
  });
}

function persistToken(token) {
  localStorage.setItem("authToken", token);
}

function redirect(path = "/dashboard") {
  setTimeout(() => {
    window.location.href = path;
  }, 850);
}

async function initFirebaseAuth() {
  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    auth.useDeviceLanguage();
  }
  return auth;
}

async function handleGoogle(mode = "login") {
  const googleBtn = mode === "signup" ? $("google-signup") : $("google-login");
  try {
    const authInstance = await initFirebaseAuth();
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(authInstance, provider);
    const user = result.user;
    const idToken = await user.getIdToken();

    const requiresProfile = !user.displayName;
    const appToken = idToken;

    persistToken(appToken);
    if (requiresProfile) {
      sessionStorage.setItem("profileToken", appToken);
      window.location.href = "/complete-profile.html";
      return;
    }
    const successEl = mode === "signup" ? $("signup-success") : $("login-success");
    show(successEl);
    redirect("/dashboard");
  } catch (err) {
    const targetError = mode === "signup" ? $("signup-error") : $("login-error");
    if (targetError) {
      targetError.textContent = err.message || "Google sign-in failed. Try again.";
      show(targetError);
      shake(targetError);
    }
  } finally {
    if (googleBtn) googleBtn.disabled = false;
  }
}

async function checkUsernameAvailability(value) {
  if (!value) return;
  const statusEl = $("username-status");
  if (!statusEl) return;
  statusEl.textContent = "Checking availability…";
  statusEl.className = "availability";
  try {
    const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(value)}`);
    const data = await res.json();
    const available = data.available ?? true;
    statusEl.textContent = available ? "Available" : "Taken";
    statusEl.classList.add(available ? "ok" : "busy");
  } catch (err) {
    statusEl.textContent = "Unable to check";
    statusEl.classList.remove("ok", "busy");
  }
}

async function submitSignup(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const errorEl = $("signup-error");
  hide(errorEl);

  const username = form.username.value.trim();
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  const confirm = form.confirmPassword.value;

  if (!username || !name || !email || !password || !confirm) {
    errorEl.textContent = "All fields are required.";
    show(errorEl);
    shake(errorEl);
    return;
  }

  if (password.length < 8) {
    errorEl.textContent = "Password must be at least 8 characters.";
    show(errorEl);
    shake(errorEl);
    return;
  }

  if (password !== confirm) {
    errorEl.textContent = "Passwords do not match.";
    show(errorEl);
    shake(errorEl);
    return;
  }

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        full_name: name,
        email,
        password,
        confirm_password: confirm,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Signup failed");
    }
    persistToken(data.token || "");
    show($("signup-success"));
    redirect("/dashboard");
  } catch (err) {
    errorEl.textContent = err.message || "Signup failed. Please try again.";
    show(errorEl);
    shake(errorEl);
  }
}

async function submitLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const errorEl = $("login-error");
  hide(errorEl);

  const username = form.username.value.trim();
  const password = form.password.value;

  if (!username || !password) {
    errorEl.textContent = "Username and password are required.";
    show(errorEl);
    shake(errorEl);
    return;
  }

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Invalid credentials");
    }
    persistToken(data.token || "");
    show($("login-success"));
    // Redirect to dashboard - React Router will handle this
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 850);
  } catch (err) {
    errorEl.textContent = err.message || "Invalid credentials. Please try again.";
    show(errorEl);
    shake(errorEl);
  }
}

async function submitCompleteProfile(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const errorEl = $("complete-error");
  hide(errorEl);

  const username = form.username.value.trim();
  const name = form.name.value.trim();
  const token = sessionStorage.getItem("profileToken") || new URLSearchParams(window.location.search).get("token");

  if (!username || !name) {
    errorEl.textContent = "Both fields are required.";
    show(errorEl);
    shake(errorEl);
    return;
  }

  try {
    const res = await fetch("/api/complete-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, name, token }),
    });

    if (!res.ok) throw new Error("Could not complete profile");
    const data = await res.json();
    if (data.token) persistToken(data.token);
    show($("complete-success"));
    redirect("/dashboard");
  } catch (err) {
    errorEl.textContent = err.message || "Something went wrong. Try again.";
    show(errorEl);
    shake(errorEl);
  }
}

function attachEvents() {
  const googleSignup = $("google-signup");
  if (googleSignup) googleSignup.addEventListener("click", () => handleGoogle("signup"));

  const googleLogin = $("google-login");
  if (googleLogin) googleLogin.addEventListener("click", () => handleGoogle("login"));

  const signupForm = $("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", submitSignup);
    signupForm.username?.addEventListener("input", (e) => {
      const value = e.target.value.trim();
      clearTimeout(signupForm._usernameTimer);
      signupForm._usernameTimer = setTimeout(() => checkUsernameAvailability(value), 280);
    });
    signupForm.password?.addEventListener("input", (e) => {
      const meter = signupForm.querySelector(".strength");
      setStrength(e.target.value, meter);
    });
  }

  const loginForm = $("login-form");
  if (loginForm) loginForm.addEventListener("submit", submitLogin);

  const completeForm = $("complete-form");
  if (completeForm) completeForm.addEventListener("submit", submitCompleteProfile);
}

attachEvents();
