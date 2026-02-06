import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home/Home';
import DonorDashboard from './pages/Donor/DonorDashboard';
import DonorLogin from './pages/Donor/DonorLogin';
import DonorRegister from './pages/Donor/DonorRegister';
import OrgLogin from './pages/Organization/OrgLogin';
import OrgRegister from './pages/Organization/OrgRegister';
import OrgDashboard from './pages/Organization/OrgDashboard';
import AdminLogin from './pages/Admin/AdminLogin';
import AdminDashboard from './pages/Admin/AdminDashboard';
import Seeker from './pages/Seeker/Seeker';

// Global Scroll to Top on Route Change
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  React.useEffect(() => {
    // If there's a hash, we'll let the specific component handle it or try a delay
    if (!hash) {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return null;
}

export default function App() {
  const navigate = useNavigate();

  // Admin Shortcut: Ctrl + Shift + A
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      // Check for Ctrl + Shift + A
      if (event.ctrlKey && event.shiftKey && (event.key === 'a' || event.key === 'A')) {
        event.preventDefault();
        navigate('/admin/login');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup listener
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);

  return (
    <>
      <Toaster position="top-right" />
      <ScrollToTop />
      <Routes>
        {/* Home Route */}
        <Route path="/" element={<Home />} />
        <Route path="/seeker" element={<Seeker />} />

        {/* Donor Routes */}
        <Route path="/dashboard" element={<DonorDashboard />} />
        <Route path="/donor/login" element={<DonorLogin />} />
        <Route path="/donor/register" element={<DonorRegister />} />

        {/* Organization Routes */}
        <Route path="/organization/login" element={<OrgLogin />} />
        <Route path="/organization/register" element={<OrgRegister />} />
        <Route path="/organization/dashboard" element={<OrgDashboard />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* Legacy Redirects */}
        <Route path="/login" element={<Navigate to="/donor/login" replace />} />
        <Route path="/register" element={<Navigate to="/donor/register" replace />} />

        {/* Fallback */}
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}
