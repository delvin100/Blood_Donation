import React, { useState, useEffect } from 'react';
import '../public/css/dashboard.css';
import CompleteProfileModal from './CompleteProfileModal';

const formatDateHyphen = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  // Modal states
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [showProfilePicModal, setShowProfilePicModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Form states
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [units, setUnits] = useState(1);
  const [notes, setNotes] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderMsg, setReminderMsg] = useState('');

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        window.location.href = '/login';
        return;
      }
      const res = await fetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      const jsonData = await res.json();
      setData(jsonData);

      // Auto-trigger complete profile if mandatory fields are missing (match PHP)
      const phoneRegex = /^[0-9]{10}$/;
      if (jsonData.user && (!jsonData.user.gender || !phoneRegex.test(jsonData.user.phone))) {
        setShowCompleteProfile(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!data?.stats?.nextEligibleDate) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(data.stats.nextEligibleDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        clearInterval(timer);
        fetchDashboardData();
      } else {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [data?.stats?.nextEligibleDate]);

  const handleAddDonation = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/dashboard/donation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ date: donationDate, units, notes })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to add donation');
      setMessage('Donation recorded successfully!');
      fetchDashboardData();
      setDonationDate(new Date().toISOString().split('T')[0]);
      setUnits(1);
      setNotes('');
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/dashboard/reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reminder_date: reminderDate, message: reminderMsg })
      });
      if (!res.ok) throw new Error('Failed to add reminder');
      setMessage('Reminder added successfully!');
      fetchDashboardData();
      setReminderDate('');
      setReminderMsg('');
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/dashboard/${type}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Failed to delete ${type}`);
      setMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted`);
      fetchDashboardData();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleRemoveProfilePic = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/dashboard/profile/picture', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to remove profile picture');
      setMessage('Profile picture removed successfully');
      setShowProfilePicModal(false);
      fetchDashboardData();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleProfilePicUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('profile_picture', selectedFile);

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/dashboard/profile-picture', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) throw new Error('Failed to upload profile picture');
      setMessage('Profile picture updated successfully!');
      setShowProfilePicModal(false);
      fetchDashboardData();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  };

  if (loading) return <div className="modern-bg flex items-center justify-center text-white text-2xl font-bold">Loading Your Dashboard...</div>;
  if (error) return <div className="modern-bg flex items-center justify-center text-red-200 text-2xl font-bold">Error: {error}</div>;

  const { user, stats, donations, reminders } = data;

  return (
    <div className="modern-bg text-gray-800">
      <div className="floating-dots"></div>
      <div className="floating-element" style={{ width: '400px', height: '400px', top: '10%', left: '20%' }}></div>
      <div className="floating-element" style={{ width: '300px', height: '300px', top: '40%', left: '40%' }}></div>
      <div className="floating-element" style={{ width: '200px', height: '200px', top: '60%', left: '70%' }}></div>

      <header className="modern-header px-6 py-2">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-red-600 shadow-lg">
              <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-none">eBloodBank</h1>
              <p className="text-white/80 text-[10px] uppercase tracking-wider font-bold">Blood Donation Website</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 pt-4 pb-10 relative z-10">
        <div className="hero-blur-circle"></div>
        <div className="text-center mb-4 relative z-10">
          <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">Donor Dashboard</h1>
          <p className="text-white/80 font-medium tracking-wide">Manage your profile and donations</p>
        </div>

        {donations.length === 0 && (
          <div className="success-message-blue fade-in">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shrink-0">
              <i className="fas fa-info text-sm"></i>
            </div>
            <span className="font-semibold">No donation history found. Please record your first donation below.</span>
          </div>
        )}

        {message && (
          <div className="success-message fade-in flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white shrink-0">
                <i className="fas fa-check text-sm"></i>
              </div>
              <span className="font-semibold">{message}</span>
            </div>
            <button onClick={() => setMessage('')} className="text-gray-500 hover:text-gray-700 text-xl font-bold">&times;</button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 space-y-6 shrink-0">

            <div className="modern-card p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Navigation</h3>
              <nav className="space-y-1">
                <a href="#" className="sidebar-link"><i className="fas fa-info-circle text-blue-500"></i> About Us</a>
                <a href="#" className="sidebar-link"><i className="fas fa-eye text-cyan-500"></i> Vision & Mission</a>
                <div className="text-red-600 font-bold text-[13px] flex items-center gap-3 px-3 py-2 mt-2">
                  <i className="fas fa-users text-lg"></i> People Behind
                </div>
                <div className="space-y-1 pb-2">
                  <a href="#" className="sidebar-link sub-link"><i className="fas fa-user-tie text-blue-400"></i> Founders</a>
                  <a href="#" className="sidebar-link sub-link"><i className="fas fa-code text-blue-400"></i> Technical Team</a>
                  <a href="#" className="sidebar-link sub-link"><i className="fas fa-hands-helping text-blue-400"></i> Field Volunteers</a>
                  <a href="#" className="sidebar-link sub-link"><i className="fas fa-bullhorn text-blue-400"></i> Campaign Team</a>
                </div>
                <a href="#" className="sidebar-link"><i className="fas fa-book-open text-orange-500"></i> Blood Donation Facts</a>
                <a href="#" className="sidebar-link"><i className="fas fa-check-circle text-green-500"></i> Who can/ Can't Donate</a>

                <div className="border-t border-gray-100 my-4 pt-4">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-3">Blood Donation Resources</h4>
                </div>

                <a href="#" className="sidebar-link"><i className="fas fa-route text-indigo-500"></i> Donation Process</a>
                <a href="#" className="sidebar-link"><i className="fas fa-tint text-red-500"></i> Blood Types Guide</a>
                <a href="#" className="sidebar-link"><i className="fas fa-heart text-pink-500"></i> Health Benefits</a>
                <a href="#" className="sidebar-link"><i className="fas fa-clipboard-list text-purple-500"></i> Preparation Tips</a>
                <a href="#" className="sidebar-link"><i className="fas fa-shield-alt text-teal-500"></i> Post-Donation Care</a>
                <a href="#" className="sidebar-link"><i className="fas fa-lightbulb text-yellow-500"></i> Myths vs Facts</a>
                <a href="#" className="sidebar-link"><i className="fas fa-ambulance text-red-600"></i> Emergency Blood Need</a>
                <a href="#" className="sidebar-link"><i className="fas fa-map-marker-alt text-green-600"></i> Nearby Centers</a>
                <a href="#" className="sidebar-link"><i className="fas fa-calendar-alt text-blue-600"></i> Blood Drives & Events</a>
                <a href="#" className="sidebar-link"><i className="fas fa-heart text-red-400"></i> Donor Success Stories</a>
                <a href="#" className="sidebar-link"><i className="fas fa-question-circle text-gray-500"></i> Frequently Asked Questions</a>
                <a href="#" className="sidebar-link"><i className="fas fa-headset text-orange-600"></i> Contact Support</a>
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 space-y-6 relative z-10">
            {/* Welcome Card */}
            <div className="modern-card p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">Welcome, {user.full_name}</h2>
                <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95">Logout</button>
              </div>
            </div>

            {/* Remove the old nested Profile card if exists, but here let's just make sure the Welcome card closes */}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="modern-card p-6 shadow-2xl text-center">
                <div className="stat-number">{donations.length}</div>
                <div className="stat-label text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Donations</div>
              </div>
              <div className="modern-card p-6 shadow-2xl text-center">
                <div className="stat-number">
                  {donations.length > 0 ? formatDateHyphen(donations[0].date).split('-').reverse().join('-') : 'None'}
                </div>
                <div className="stat-label text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Donation</div>
              </div>
              <div className="modern-card p-6 shadow-2xl text-center">
                <div className="stat-number">{reminders.length}</div>
                <div className="stat-label text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Reminders</div>
              </div>
            </div>


            {/* Middle Row Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <div className="lg:col-span-1 modern-card p-6 shadow-2xl flex flex-col items-center">
                <div className="relative mb-6">
                  <div className="profile-avatar shadow-2xl">
                    {user.profile_picture ? <img src={user.profile_picture} className="w-full h-full rounded-full object-cover" /> : user.full_name.charAt(0)}
                  </div>
                  <button onClick={() => setShowProfilePicModal(true)} className="profile-edit-btn shadow-lg" title="Edit Profile Picture">
                    <i className="fas fa-camera"></i>
                  </button>
                </div>

                <div className="w-full space-y-3">
                  <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2 mb-2">
                    <i className="fas fa-user text-red-600"></i> Profile
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p className="flex items-center gap-3 text-gray-600">
                      <i className="fas fa-user text-gray-400 w-4 text-center"></i> Name: <span className="font-bold text-gray-900">{user.full_name}</span>
                    </p>
                    <p className="flex items-center gap-3 text-gray-600">
                      <i className="fas fa-tint text-red-500 w-4 text-center"></i> Blood Group: <span className="font-bold text-gray-900">{user.blood_type || '-'}</span>
                    </p>
                    <p className="flex items-center gap-3 text-gray-600">
                      <i className="fas fa-calendar text-blue-500 w-4 text-center"></i> Date of Birth: <span className="font-bold text-gray-900">{user.dob ? formatDateHyphen(user.dob) : 'Not set'}</span>
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className={`w-full ${user.availability === 'Available' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-red-600 shadow-red-200'} text-white px-4 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 cursor-default`}>
                      {user.availability === 'Available' ? '🟢 Available' : '🔴 Unavailable'} <i className="fas fa-robot animate-pulse-slow"></i>
                    </div>
                    <div className="mt-3 text-[10px] text-gray-400 text-center font-bold">
                      <p><i className="fas fa-info-circle mr-1"></i> {donations.length === 0 ? 'No donation history' : `${user.availability === 'Available' ? 'Eligible to donate' : 'In recovery period'}`}</p>
                      <p className="uppercase tracking-widest mt-1">Auto-managed based on donations</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Complete Your Profile Card */}
              <div className="lg:col-span-1 modern-card p-6 shadow-2xl border-2 border-red-50/50 bg-gradient-to-b from-white to-red-50/20">
                <div className="h-full flex flex-col items-center justify-center text-center py-4">
                  <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center text-red-600 mb-6 shadow-xl shadow-red-500/10 rotate-3">
                    <i className="fas fa-user-plus text-3xl -rotate-3"></i>
                  </div>
                  <h3 className="text-xl font-black text-gray-800 mb-2">Complete Your Profile</h3>
                  <p className="text-sm text-gray-500 font-medium mb-8 px-4 leading-relaxed">
                    Add your location details to help us serve you better
                  </p>
                  <button
                    onClick={() => setShowCompleteProfile(true)}
                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 group"
                  >
                    <i className="fas fa-location-arrow text-sm"></i>
                    Complete Profile
                    <i className="fas fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
                  </button>
                </div>
              </div>

              {/* Eligibility Card */}
              <div className="lg:col-span-1 modern-card p-6 shadow-2xl">
                <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2 text-lg italic tracking-tight">
                  <i className="fas fa-hourglass-half text-red-600"></i> Eligibility Countdown
                </h4>
                <div className="h-full flex flex-col items-center justify-center text-center -mt-8">
                  {donations.length === 0 ? (
                    <div className="px-6 space-y-4">
                      <p className="text-red-500/20 text-6xl font-black opacity-10 uppercase -rotate-12 absolute select-none pointer-events-none">ELIGIBLE</p>
                      <p className="text-sm font-bold text-gray-500 leading-relaxed">
                        No donation history available. You are eligible to donate.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 w-full px-2">
                      {[
                        { val: timeLeft.days, label: 'Days' },
                        { val: timeLeft.hours, label: 'Hours' },
                        { val: timeLeft.minutes, label: 'Minutes' },
                        { val: timeLeft.seconds, label: 'Seconds' }
                      ].map(t => (
                        <div key={t.label} className="bg-red-50/50 p-4 rounded-2xl border border-red-100 text-center shadow-inner">
                          <div className="text-3xl font-black text-red-600 leading-none mb-1">{t.val}</div>
                          <div className="text-[10px] font-black text-red-400 uppercase tracking-widest">{t.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* History Card */}
              <div className="modern-card p-6 shadow-2xl flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-extrabold flex items-center gap-2 tracking-tight">
                    <i className="fas fa-tint text-red-600"></i> Donation History <span className="text-[10px] bg-red-50 text-red-400 px-2 py-0.5 rounded-full font-bold uppercase">{donations.length} donations</span>
                  </h3>
                </div>

                <div className="flex-1 min-h-[200px] flex flex-col items-center justify-center text-center border-b border-gray-100 pb-6 mb-6">
                  {donations.length === 0 ? (
                    <div className="space-y-3">
                      <i className="fas fa-heart text-6xl text-gray-100 opacity-50"></i>
                      <p className="text-gray-400 font-bold">No donations recorded yet.</p>
                      <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Your first donation will appear here</p>
                    </div>
                  ) : (
                    <div className="w-full space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                      {donations.map(d => (
                        <div key={d.id} className="bg-red-50/50 p-3 rounded-2xl flex items-center justify-between border border-red-100/50 group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg text-xs">
                              <i className="fas fa-tint"></i>
                            </div>
                            <div className="text-left leading-tight">
                              <p className="font-bold text-gray-800 text-sm">{formatDateHyphen(d.date)}</p>
                              <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">{Number(d.units).toFixed(2)} units</p>
                            </div>
                          </div>
                          <button onClick={() => handleDelete('donation', d.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><i className="fas fa-trash-alt text-xs"></i></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-red-50/20 p-6 rounded-3xl border border-red-50/50">
                  <h4 className="font-black text-gray-800 mb-6 flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                      <i className="fas fa-plus text-xs"></i>
                    </div>
                    Record New Donation <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse-slow"></span>
                  </h4>
                  <form onSubmit={handleAddDonation} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1"><i className="fas fa-tint text-red-500 mr-1"></i> Units Donated *</label>
                        <div className="relative">
                          <i className="fas fa-tint absolute left-4 top-1/2 -translate-y-1/2 text-red-500"></i>
                          <input type="number" value={units} onChange={e => setUnits(e.target.value)} placeholder="1" className="modern-input !py-3 !pl-10 !text-sm !h-12" required />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">units</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1"><i className="fas fa-calendar text-red-500 mr-1"></i> Donation Date *</label>
                        <div className="relative">
                          <i className="fas fa-calendar-alt absolute left-4 top-1/2 -translate-y-1/2 text-red-500"></i>
                          <input type="date" value={donationDate} onChange={e => setDonationDate(e.target.value)} className="modern-input !py-3 !pl-10 !text-sm !h-12" required />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1"><i className="fas fa-comment-alt text-red-500 mr-1"></i> Notes (Optional)</label>
                      <div className="relative">
                        <i className="fas fa-sticky-note absolute left-4 top-1/2 -translate-y-1/2 text-red-500"></i>
                        <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g., Emergency donation..." className="modern-input !py-3 !pl-10 !text-sm !h-12" />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-red-600/20 flex items-center justify-center gap-2">
                      <i className="fas fa-heart text-sm"></i> Record Donation <i className="fas fa-arrow-right text-xs"></i>
                    </button>
                  </form>
                </div>
              </div>

              {/* Reminders Card */}
              <div className="modern-card p-6 shadow-2xl flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-extrabold flex items-center gap-2 tracking-tight">
                    <i className="fas fa-bell text-yellow-500"></i> Donation Reminders <span className="text-[10px] bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full font-bold uppercase">{reminders.length} active</span>
                  </h3>
                </div>

                <div className="flex-1 min-h-[200px] flex flex-col items-center justify-center text-center border-b border-gray-100 pb-6 mb-6">
                  {reminders.length === 0 ? (
                    <div className="space-y-3">
                      <i className="fas fa-calendar-alt text-6xl text-gray-100 opacity-50"></i>
                      <p className="text-gray-400 font-bold">No reminders set.</p>
                      <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest">Set reminders to stay on track</p>
                    </div>
                  ) : (
                    <div className="w-full space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                      {reminders.map(r => (
                        <div key={r.id} className="bg-blue-50/50 p-3 rounded-2xl flex items-center justify-between border border-blue-100/50 group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg text-xs">
                              <i className="fas fa-bell"></i>
                            </div>
                            <div className="text-left leading-tight">
                              <p className="font-bold text-gray-800 text-sm">{r.message}</p>
                              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{formatDateHyphen(r.reminder_date)}</p>
                            </div>
                          </div>
                          <button onClick={() => handleDelete('reminder', r.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><i className="fas fa-trash-alt text-xs"></i></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-blue-50/20 p-6 rounded-3xl border border-blue-50/50">
                  <h4 className="font-black text-gray-800 mb-6 flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                      <i className="fas fa-plus text-xs"></i>
                    </div>
                    Set New Reminder <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse-slow"></span>
                  </h4>
                  <form onSubmit={handleAddReminder} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1"><i className="fas fa-calendar-alt text-blue-500 mr-1"></i> Reminder Date *</label>
                      <div className="relative">
                        <i className="fas fa-calendar-check absolute left-4 top-1/2 -translate-y-1/2 text-blue-500"></i>
                        <input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} className="modern-input !py-3 !pl-10 !text-sm !h-12" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1"><i className="fas fa-comment-dots text-blue-500 mr-1"></i> Reminder Message *</label>
                      <div className="relative">
                        <i className="fas fa-comment-dots absolute left-4 top-1/2 -translate-y-1/2 text-blue-500"></i>
                        <input type="text" value={reminderMsg} onChange={e => setReminderMsg(e.target.value)} placeholder="e.g., Time for next donation..." className="modern-input !py-3 !pl-10 !text-sm !h-12" required />
                      </div>
                    </div>
                    <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2">
                      <i className="fas fa-bell text-sm"></i> Set Reminder <i className="fas fa-arrow-right text-xs"></i>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Profile Pic Modal */}
      {showProfilePicModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="modern-card p-8 max-w-sm w-full bg-white text-center">
            <h3 className="text-xl font-bold mb-6 flex items-center justify-center gap-2 text-gray-800"><i className="fas fa-camera text-blue-600"></i> Update Photo</h3>
            <div className="w-24 h-24 mx-auto rounded-full bg-gray-50 mb-6 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center relative">
              {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <i className="fas fa-user text-4xl text-gray-200"></i>}
            </div>
            <input type="file" onChange={handleFileSelect} className="mb-6 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            <div className="flex gap-4">
              <button onClick={() => setShowProfilePicModal(false)} className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
              <div className="flex gap-2 flex-[2]">
                <button onClick={handleProfilePicUpload} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-sm font-bold transition-all shadow-lg shadow-blue-500/20">Upload</button>
                {user.profile_picture && (
                  <button onClick={handleRemoveProfilePic} className="px-4 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-all border border-gray-100" title="Remove current photo">
                    <i className="fas fa-trash-alt"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCompleteProfile && <CompleteProfileModal onClose={() => setShowCompleteProfile(false)} />}

      <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="scroll-top-btn"><i className="fas fa-arrow-up"></i></div>
    </div>
  );
};

export default Dashboard;
