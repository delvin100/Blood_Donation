import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './Home';
import DonorDashboard from './modules/donor/DonorDashboard';
import DonorLogin from './modules/donor/DonorLogin';
import DonorRegister from './modules/donor/DonorRegister';
import OrgLogin from './modules/organization/OrgLogin';
import OrgRegister from './modules/organization/OrgRegister';
import OrgDashboard from './modules/organization/OrgDashboard';
import AdminLogin from './modules/admin/AdminLogin';
import AdminDashboard from './modules/admin/AdminDashboard';

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
      <Routes>
        {/* Home Route */}
        <Route path="/" element={<Home />} />

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
