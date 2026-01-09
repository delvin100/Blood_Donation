import React from 'react';
import Home from './Home';
import DonorDashboard from './modules/donor/DonorDashboard';
import DonorLogin from './modules/donor/DonorLogin';
import DonorRegister from './modules/donor/DonorRegister';

export default function App() {
  const path = window.location.pathname;

  if (path === '/dashboard') {
    return <DonorDashboard />;
  }

  // Updated routes for Donor module
  if (path === '/donor/login') {
    return <DonorLogin />;
  }

  if (path === '/donor/register') {
    return <DonorRegister />;
  }

  // Legacy redirects (optional, or just handle fallbacks)
  if (path === '/login') {
    window.location.href = '/donor/login';
    return null;
  }
  if (path === '/register') {
    window.location.href = '/donor/register';
    return null;
  }

  return <Home />;
}
