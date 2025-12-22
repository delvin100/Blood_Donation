import React from 'react';
import Home from './Home';
import Dashboard from './Dashboard';
import Login from './Login';
import Register from './Register';

export default function App() {
  const path = window.location.pathname;

  if (path === '/dashboard') {
    return <Dashboard />;
  }

  if (path === '/login') {
    return <Login />;
  }

  if (path === '/register') {
    return <Register />;
  }

  return <Home />;
}
