import React, { useState, useEffect } from 'react';
import '../public/css/dashboard.css';
import CompleteProfileModal from './CompleteProfileModal';
import InfoModal from './InfoModal';

const formatDateHyphen = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

const getProfilePicUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return url;
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [showProfilePicModal, setShowProfilePicModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [activeInfo, setActiveInfo] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

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
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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

  const handleProfilePicUpload = async () => {
    if (!selectedFile) return;
    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('profile_picture', selectedFile);

      const res = await fetch('/api/dashboard/profile-picture', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to upload picture');
      setMessage('Profile picture updated successfully!');
      fetchDashboardData();
      setShowProfilePicModal(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  };

  if (loading) return <div className="modern-bg flex items-center justify-center text-white text-2xl font-black">Loading...</div>;
  if (error) return <div className="modern-bg flex items-center justify-center text-red-200 text-2xl font-black">Error: {error}</div>;

  const { user, donations, reminders } = data;

  const navigationContent = {
    'about-us': { title: 'About eBloodBank', content: <div className="space-y-4 text-gray-600"><p>eBloodBank.org is the world's largest voluntary blood donors organization. Our mission is to ensure that every life counts by providing a platform that connects blood donors with those in need, especially in critical times.</p><p>Since our inception, we have helped thousands of people find the right blood donor at the right time, completely free of cost.</p></div> },
    'vision-mission': { title: 'Vision & Mission', content: <div className="space-y-4"><p><strong className="text-red-600">Vision:</strong> To become the world's most trusted and reliable voluntary blood donation platform, where no life is lost due to a lack of blood.</p><p><strong className="text-red-600">Mission:</strong> To build a massive network of voluntary blood donors across the globe and simplify the process of blood donation through technology and community participation.</p></div> },
    'founders': { title: 'Founders', content: <div className="space-y-3"><p>eBloodBank was founded by a group of passionate individuals driven by a common goal: saving lives through voluntary blood donation.</p><p>Their vision and leadership have shaped this platform into a global movement that continues to grow and serve humanity every day.</p></div> },
    'technical-team': { title: 'Technical Team', content: <div className="space-y-3"><p>Our platform is built and maintained by a dedicated team of software engineers and designers who volunteer their skills to ensure the portal remains accessible, secure, and user-friendly.</p><p>We use modern technologies to provide real-time location tracking and donor matching.</p></div> },
    'field-volunteers': { title: 'Field Volunteers', content: <div className="space-y-3"><p>Our field volunteers are the backbone of our operations. They work on the ground to organize blood drives, verify donor details, and provide immediate assistance during emergencies.</p><p>We have thousands of volunteers working across various districts to bridge the gap between donors and recipients.</p></div> },
    'campaign-team': { title: 'Campaign Team', content: <div className="space-y-3"><p>The campaign team works tirelessly to spread awareness about the importance of voluntary blood donation through social media, workshops, and community events.</p><p>They aim to debunk myths and encourage young people to become lifelong donors.</p></div> },
    'donation-facts': { title: 'Blood Donation Facts', content: <ul className="list-disc pl-5 space-y-2"><li>A single donation can save up to three lives.</li><li>The body replaces plasma within 24 hours.</li><li>Red cells are replaced in about 4-6 weeks.</li><li>Only 7% of people have O-Negative blood, the universal donor type.</li></ul> },
    'who-can-donate': { title: 'Who Can Donate', content: <div className="space-y-4"><p><strong>General Requirements:</strong></p><ul className="list-disc pl-5 space-y-2"><li>Weight: At least 45 - 50 kg.</li><li>Age: 18 - 65 years.</li><li>Hemoglobin: Minimum 12.5 g/dL.</li><li>Health: You should be feeling well and healthy.</li></ul></div> },
    'donation-process': { title: 'Donation Process', content: <ol className="list-decimal pl-5 space-y-2"><li><strong>Registration:</strong> Fill out a basic health form.</li><li><strong>Medical Check:</strong> A mini health screening (BP, pulse, Hb).</li><li><strong>Donation:</strong> Takes only about 10-15 minutes.</li><li><strong>Refreshment:</strong> Rest and have a light snack.</li></ol> },
    'blood-types': { title: 'Blood Types Guide', content: <div className="space-y-2"><p><strong>Compatibility Chart:</strong></p><ul className="list-disc pl-5 space-y-1"><li><strong>O-</strong>: Universal donor.</li><li><strong>AB+</strong>: Universal recipient.</li><li><strong>A+/A-</strong>: Common groups.</li><li><strong>B+/B-</strong>: Vital for specific needs.</li></ul></div> },
    'health-benefits': { title: 'Health Benefits', content: <ul className="list-disc pl-5 space-y-2"><li>Reduces the risk of heart disease and cancer.</li><li>Balances iron levels in the body.</li><li>Burns calories (approx 650 per donation).</li><li>Psychological satisfaction of saving lives.</li></ul> },
    'preparation-tips': { title: 'Preparation Tips', content: <ul className="list-disc pl-5 space-y-2"><li>Drink plenty of water before donation.</li><li>Eat a healthy, low-fat meal.</li><li>Get a good night's sleep.</li><li>Avoid alcohol for 24 hours before donating.</li></ul> },
    'aftercare': { title: 'Post-Donation Care', content: <ul className="list-disc pl-5 space-y-2"><li>Drink extra fluids for the next 48 hours.</li><li>Avoid strenuous physical activity.</li><li>Keep the bandage on for a few hours.</li><li>If you feel dizzy, lay down with feet elevated.</li></ul> },
    'myths-facts': { title: 'Myths vs Facts', content: <div className="space-y-3"><p><strong>Myth:</strong> Donation is painful. <br /><strong>Fact:</strong> It's just a quick prick, no more painful than a regular test.</p><p><strong>Myth:</strong> I will become weak. <br /><strong>Fact:</strong> Most people recover their energy very quickly.</p></div> },
    'emergency-blood': { title: 'Emergency Blood Need', content: <p>In case of emergencies, please use our 'Search Donor' feature to find immediate results near the patient's hospital. For critical support, contact our district volunteer lead.</p> },
    'nearby-centers': { title: 'Nearby Centers', content: <p>We are currently integrating with local blood banks to provide real-time availability. Please check the 'Centers' map on our main portal.</p> },
    'blood-drives': { title: 'Blood Drives & Events', content: <p>Stay updated with our upcoming blood drives by following our social media handles or checking the 'Events' section on the homepage.</p> },
    'success-stories': { title: 'Donor Success Stories', content: <p>Read how a single call through eBloodBank helped a family in crisis. [Coming soon: Full story library].</p> },
    'faq': { title: 'FAQ', content: <p>Find answers to common questions about donation intervals, medications, and medical conditions on our FAQ page.</p> },
    'contact-support': { title: 'Contact Support', content: <p>Need help? Reach out to us at support@eBloodBank.org or call our 24/7 helpline for urgent inquiries.</p> }
  };

  const openInfo = (key) => { setActiveInfo(navigationContent[key]); };

  return (
    <div className="modern-bg min-h-screen">
      {/* PHP Sync Header */}
      <header className="modern-header">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
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

      <div className="container mx-auto px-6 py-10 min-h-screen">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="sidebar-container shrink-0 lg:w-72 lg:sticky lg:top-8 self-start transition-all duration-300">
            <div className="modern-card p-6 shadow-xl border-0">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-3 border-b pb-4">
                <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                  <i className="fas fa-compass text-red-500 text-sm"></i>
                </div>
                Navigation
              </h3>
              <nav className="space-y-2">
                <button onClick={() => openInfo('about-us')} className="sidebar-link w-full text-left group">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-[10px] group-hover:bg-blue-200 transition-colors">
                    <i className="fas fa-info"></i>
                  </div>
                  <span className="group-hover:translate-x-1 transition-transform">About Us</span>
                </button>
                <button onClick={() => openInfo('vision-mission')} className="sidebar-link w-full text-left group">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-[10px] group-hover:bg-blue-200 transition-colors">
                    <i className="fas fa-eye"></i>
                  </div>
                  <span className="group-hover:translate-x-1 transition-transform">Vision & Mission</span>
                </button>

                <div className="py-2 border-t border-dashed mt-2">
                  <div className="sidebar-link w-full text-left cursor-default opacity-100 font-black text-gray-400 text-xs uppercase tracking-wider pl-1 mb-2">
                    Organization
                  </div>
                  <div className="space-y-1 pl-2">
                    <button onClick={() => openInfo('founders')} className="sidebar-link sub-link w-full text-left !ml-0 text-sm !font-medium">
                      Founders
                    </button>
                    <button onClick={() => openInfo('technical-team')} className="sidebar-link sub-link w-full text-left !ml-0 text-sm !font-medium">
                      Technical Team
                    </button>
                    <button onClick={() => openInfo('field-volunteers')} className="sidebar-link sub-link w-full text-left !ml-0 text-sm !font-medium">
                      Field Volunteers
                    </button>
                    <button onClick={() => openInfo('campaign-team')} className="sidebar-link sub-link w-full text-left !ml-0 text-sm !font-medium">
                      Campaign Team
                    </button>
                  </div>
                </div>

                <h4 className="sidebar-resource-title mt-4 mb-3 text-red-400">Resources</h4>

                {[
                  { key: 'donation-process', icon: 'fa-route', label: 'Donation Process' },
                  { key: 'blood-types', icon: 'fa-tint', label: 'Blood Types Guide' },
                  { key: 'health-benefits', icon: 'fa-heart', label: 'Health Benefits' },
                  { key: 'preparation-tips', icon: 'fa-clipboard-list', label: 'Preparation Tips' },
                  { key: 'aftercare', icon: 'fa-shield-alt', label: 'Post-Donation Care' },
                  { key: 'myths-facts', icon: 'fa-lightbulb', label: 'Myths vs Facts' },
                  { key: 'emergency-blood', icon: 'fa-ambulance', label: 'Emergency Blood Need' },
                  { key: 'nearby-centers', icon: 'fa-map-marker-alt', label: 'Nearby Centers' },
                  { key: 'blood-drives', icon: 'fa-calendar-alt', label: 'Blood Drives & Events' },
                  { key: 'success-stories', icon: 'fa-heart', label: 'Donor Success Stories' },
                  { key: 'faq', icon: 'fa-question-circle', label: 'FAQ' },
                  { key: 'contact-support', icon: 'fa-headset', label: 'Contact Support' },
                ].map(item => (
                  <button key={item.key} onClick={() => openInfo(item.key)} className="sidebar-link w-full text-left text-gray-600 hover:text-red-600 font-medium text-sm flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-all group">
                    <i className={`fas ${item.icon} text-gray-400 group-hover:text-red-500 w-5 text-center transition-colors`}></i>
                    <span className="group-hover:translate-x-1 transition-transform">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 space-y-6">
            {/* Header Title */}
            <div className="flex items-end justify-between mb-2">
              <div>
                <h1 className="text-4xl font-black text-white mb-2 drop-shadow-md">Donor Dashboard</h1>
                <p className="text-blue-100 font-medium text-lg">Manage your profile and donations</p>
              </div>
            </div>

            {/* Alerts Area */}
            {message && (
              <div className="alert-blue-glass !bg-green-100/90 !text-green-800 !border-green-200 flex justify-between fade-in shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white shadow">
                    <i className="fas fa-check text-xs"></i>
                  </div>
                  <span className="font-semibold">{message}</span>
                </div>
                <button onClick={() => setMessage('')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors">&times;</button>
              </div>
            )}

            {donations.length === 0 && (
              <div className="bg-white/90 backdrop-blur-sm border-l-4 border-blue-600 p-6 rounded-r-xl shadow-lg fade-in flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                  <i className="fas fa-info-circle text-xl"></i>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-lg mb-1">Welcome to your dashboard!</h4>
                  <p className="text-gray-600">No donation history found yet. Please record your first donation below to start tracking your journey.</p>
                </div>
              </div>
            )}

            {/* Dashboard Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="stat-card transform hover:scale-105 transition-transform duration-300">
                <div className="stat-number drop-shadow-sm">{donations.length}</div>
                <div className="stat-label">Total Donations</div>
              </div>
              <div className="stat-card transform hover:scale-105 transition-transform duration-300">
                <div className="stat-number drop-shadow-sm">{donations.length > 0 ? formatDateHyphen(donations[0].date) : 'None'}</div>
                <div className="stat-label">Last Donation</div>
              </div>
              <div className="stat-card transform hover:scale-105 transition-transform duration-300">
                <div className="stat-number drop-shadow-sm">{reminders.length}</div>
                <div className="stat-label">Active Reminders</div>
              </div>
            </div>

            <div className="modern-card p-6 bg-gradient-to-r from-white to-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Hello, {user.full_name}</h1>
                  <p className="text-gray-500 text-sm mt-1">Great to have you here saving lives!</p>
                </div>
                <button onClick={handleLogout} className="btn-logout-pill shadow-lg hover:shadow-red-200">
                  <i className="fas fa-sign-out-alt mr-2"></i> Logout
                </button>
              </div>
            </div>

            {/* Profile & Recovery Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <div className="modern-card p-5 flex flex-col items-center">
                <div className="relative mb-6">
                  <div className="profile-avatar-large overflow-hidden">
                    {user.profile_picture ? (
                      <img src={getProfilePicUrl(user.profile_picture)} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                      user.full_name.charAt(0)
                    )}
                  </div>
                  <button onClick={() => setShowProfilePicModal(true)} className="absolute bottom-[-4px] right-[-4px] w-7 h-7 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] shadow-lg hover:bg-blue-700 transition-colors">
                    <i className="fas fa-camera"></i>
                  </button>
                </div>

                <div className="w-full">
                  <h4 className="flex items-center gap-2 font-bold text-sm text-gray-800 mb-4">
                    <i className="fas fa-user text-red-500"></i> Profile
                  </h4>
                  <div className="space-y-2">
                    <div className="profile-info-row">
                      <i className="fas fa-user text-gray-500"></i>
                      <span className="label">Name:</span> <span className="value">{user.full_name}</span>
                    </div>
                    <div className="profile-info-row">
                      <i className="fas fa-tint text-red-600"></i>
                      <span className="label">Blood Group:</span> <span className="value font-medium text-gray-900">{user.blood_type || '-'}</span>
                    </div>
                    <div className="profile-info-row">
                      <i className="fas fa-calendar text-blue-600"></i>
                      <span className="label">Date of Birth:</span> <span className="value font-medium text-gray-900">{user.dob ? formatDateHyphen(user.dob) : 'Not set'}</span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className={`status-pill !px-6 !py-2.5 ${user.availability === 'Available' ? '!bg-emerald-600' : '!bg-red-600'}`}>
                      <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                      {user.availability === 'Available' ? 'Available' : 'Not Available'}
                      <i className="fas fa-robot text-sm ml-2 opacity-60" title="Automatically managed"></i>
                    </div>
                  </div>

                  <div className="text-center mt-4">
                    <div className="text-xs text-gray-600">
                      {donations.length > 0 && timeLeft.days > 0 ? (
                        <>
                          <p><i className="fas fa-calendar-alt mr-1"></i> Available again on: {formatDateHyphen(data?.stats?.nextEligibleDate)}</p>
                          <p><i className="fas fa-clock mr-1"></i> Days remaining: {Math.max(0, timeLeft.days)}</p>
                        </>
                      ) : (donations.length > 0 && timeLeft.days === 0) ? (
                        <p><i className="fas fa-check-circle mr-1 text-emerald-600"></i> Ready to donate again</p>
                      ) : (
                        <p><i className="fas fa-info-circle mr-1"></i> No donation history</p>
                      )}
                      <p className="mt-1 text-gray-500 text-[10px]"><i className="fas fa-cog mr-1"></i> Status managed automatically</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Management Section */}
              <div className="modern-card p-5 flex flex-col items-center justify-center text-center">
                {user.city && user.district && user.state ? (
                  <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-6 border border-green-200 w-full h-full flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                        <i className="fas fa-user-edit text-white text-2xl"></i>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Profile Complete!</h3>
                    <div className="text-sm text-gray-600 mb-4 space-y-1">
                      <p><i className="fas fa-map-marker-alt text-green-600 mr-2"></i> {user.city}, {user.district}</p>
                      <p><i className="fas fa-flag text-green-600 mr-2"></i> {user.state}, {user.country}</p>
                    </div>
                    <button onClick={() => setShowCompleteProfile(true)} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-3">
                      <i className="fas fa-edit text-lg"></i>
                      <span>Edit Your Profile</span>
                      <i className="fas fa-arrow-right text-sm"></i>
                    </button>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-2xl p-6 border border-red-200 w-full h-full flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                        <i className="fas fa-user-plus text-white text-2xl"></i>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Complete Your Profile</h3>
                    <p className="text-xs font-bold text-gray-500 leading-relaxed mb-6">
                      Add your location details to help us serve you better
                    </p>
                    <button onClick={() => setShowCompleteProfile(true)} className="btn-vibrant-red">
                      <i className="fas fa-map-marker-alt text-lg"></i>
                      <span>Complete Profile</span>
                      <i className="fas fa-arrow-right text-sm"></i>
                    </button>
                  </div>
                )}
              </div>

              {/* Eligibility Countdown Card */}
              <div className="modern-card p-5 fade-in">
                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <i className="fas fa-hourglass-half text-red-600 text-xl"></i>
                  Eligibility Countdown
                </h2>
                <div id="eligibility-message" className="text-gray-700 text-lg font-medium">
                  {donations.length > 0 ? (
                    timeLeft.days > 0 ? `Next eligible donation in ${timeLeft.days} day${timeLeft.days > 1 ? 's' : ''}.` : 'You are eligible to donate now!'
                  ) : (
                    'No donation history available. You are eligible to donate.'
                  )}
                </div>
                {donations.length > 0 && timeLeft.days > 0 && (
                  <div id="countdown-display" className="grid grid-cols-2 gap-2 mt-4">
                    <div className="text-center">
                      <div className="bg-red-100 text-red-800 rounded-lg p-2">
                        <div className="text-xl font-bold">{timeLeft.days}</div>
                        <div className="text-xs font-semibold">Days</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="bg-red-100 text-red-800 rounded-lg p-2">
                        <div className="text-xl font-bold">{timeLeft.hours}</div>
                        <div className="text-xs font-semibold">Hours</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="bg-red-100 text-red-800 rounded-lg p-2">
                        <div className="text-xl font-bold">{timeLeft.minutes}</div>
                        <div className="text-xs font-semibold">Minutes</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="bg-red-100 text-red-800 rounded-lg p-2">
                        <div className="text-xl font-bold">{timeLeft.seconds}</div>
                        <div className="text-xs font-semibold">Seconds</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Donation & Reminders Integrated Section */}
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              {/* Donation History Card */}
              <div className="modern-card p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-tint text-red-600 text-xl"></i>
                    <h2 className="font-bold text-gray-800">Donation History</h2>
                  </div>
                  <span className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1 rounded-full">{donations.length} donations</span>
                </div>

                <div className="flex-1 min-h-[150px] mb-6">
                  {donations.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                      <i className="fas fa-heart text-4xl mb-3"></i>
                      <p className="text-sm font-medium">No donations recorded yet.</p>
                      <p className="text-[10px]">Your first donation will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {donations.map((h) => (
                        <div key={h.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3 hover:bg-white hover:shadow-sm transition-all group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                <i className="fas fa-tint text-xs"></i>
                              </div>
                              <div>
                                <p className="font-bold text-gray-800 text-xs">{formatDateHyphen(h.date)}</p>
                                <p className="text-[10px] text-gray-500 line-clamp-1">{h.notes || 'No notes added'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-gray-800">{h.units} <span className="text-[10px] text-gray-400 font-normal ml-0.5">units</span></span>
                              <button onClick={() => handleDelete('donation', h.id)} className="w-6 h-6 rounded-md flex items-center justify-center text-gray-300 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                                <i className="fas fa-trash-alt text-[10px]"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Record New Donation Form Area */}
                <div className="form-area-pink relative overflow-hidden">
                  <div className="form-title-badge">
                    <i className="fas fa-plus bg-red-500 shadow-red-200"></i>
                    <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                      Record New Donation <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></span>
                    </h3>
                  </div>

                  <form onSubmit={handleAddDonation} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="input-group-refined">
                        <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
                          <i className="fas fa-tint text-red-500 text-[10px]"></i> Units Donated *
                        </label>
                        <div className="input-wrapper-inner">
                          <i className="fas fa-tint text-red-500 input-icon-inner"></i>
                          <input className="refined-input-with-icon" type="number" value={units} onChange={e => setUnits(e.target.value)} step="0.01" min="0.1" max="10" placeholder="1" required />
                          <span className="absolute right-3 text-[10px] text-gray-400 font-medium">units</span>
                        </div>
                      </div>
                      <div className="input-group-refined">
                        <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
                          <i className="fas fa-calendar-alt text-red-500 text-[10px]"></i> Donation Date *
                        </label>
                        <div className="input-wrapper-inner">
                          <i className="fas fa-calendar-alt text-red-500 input-icon-inner"></i>
                          <input className="refined-input-with-icon" type="date" value={donationDate} onChange={e => setDonationDate(e.target.value)} required />
                        </div>
                      </div>
                    </div>

                    <div className="input-group-refined">
                      <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
                        <i className="fas fa-sticky-note text-red-500 text-[10px]"></i> Notes (Optional)
                      </label>
                      <div className="input-wrapper-inner">
                        <i className="fas fa-comment-alt text-red-500 input-icon-inner"></i>
                        <input className="refined-input-with-icon" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g., Emergency donation, Regular checkup" />
                      </div>
                    </div>

                    <button type="submit" className="btn-vibrant-red w-full flex items-center justify-center gap-3 py-4 shadow-lg shadow-red-100 hover:shadow-red-200">
                      <i className="fas fa-heart text-xl"></i>
                      <span className="text-sm font-black">Record Donation</span>
                      <i className="fas fa-arrow-right text-sm"></i>
                    </button>
                  </form>
                </div>
              </div>

              {/* Donation Reminders Card */}
              <div className="modern-card p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-bell text-yellow-500 text-xl"></i>
                    <h2 className="font-bold text-gray-800">Donation Reminders</h2>
                  </div>
                  <span className="bg-yellow-50 text-yellow-600 text-xs font-bold px-3 py-1 rounded-full">{reminders.length} active</span>
                </div>

                <div className="flex-1 min-h-[150px] mb-6">
                  {reminders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                      <i className="fas fa-calendar-alt text-4xl mb-3"></i>
                      <p className="text-sm font-medium">No reminders set.</p>
                      <p className="text-[10px]">Set reminders to stay on track</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {reminders.map((r) => (
                        <div key={r.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3 hover:bg-white hover:shadow-sm transition-all group">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <i className="fas fa-calendar-check text-xs"></i>
                              </div>
                              <div>
                                <p className="font-bold text-gray-800 text-xs">{r.message}</p>
                                <p className="text-[10px] text-gray-500 font-medium">{formatDateHyphen(r.reminder_date)}</p>
                              </div>
                            </div>
                            <button onClick={() => handleDelete('reminder', r.id)} className="w-6 h-6 rounded-md flex items-center justify-center text-gray-300 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                              <i className="fas fa-trash-alt text-[10px]"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Set New Reminder Form Area */}
                <div className="form-area-blue relative overflow-hidden">
                  <div className="form-title-badge">
                    <i className="fas fa-plus bg-blue-500 shadow-blue-200"></i>
                    <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                      Set New Reminder <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                    </h3>
                  </div>

                  <form onSubmit={handleAddReminder} className="space-y-4">
                    <div className="input-group-refined">
                      <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
                        <i className="fas fa-calendar-alt text-blue-500 text-[10px]"></i> Reminder Date *
                      </label>
                      <div className="input-wrapper-inner">
                        <i className="fas fa-calendar-alt text-blue-500 input-icon-inner"></i>
                        <input className="refined-input-with-icon" type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)} required />
                      </div>
                    </div>

                    <div className="input-group-refined">
                      <label className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
                        <i className="fas fa-comment-dots text-blue-500 text-[10px]"></i> Reminder Message *
                      </label>
                      <div className="input-wrapper-inner">
                        <i className="fas fa-comment-dots text-blue-500 input-icon-inner"></i>
                        <input className="refined-input-with-icon" value={reminderMsg} onChange={e => setReminderMsg(e.target.value)} placeholder="e.g., Time for your next donation" required />
                      </div>
                    </div>

                    <button type="submit" className="btn-vibrant-blue w-full flex items-center justify-center gap-3 py-4 shadow-lg shadow-blue-100 hover:shadow-blue-200 mt-6">
                      <i className="fas fa-bell text-xl"></i>
                      <span className="text-sm font-black">Set Reminder</span>
                      <i className="fas fa-arrow-right text-sm"></i>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="btn-scroll-top fade-in"
          title="Scroll to Top"
        >
          <i className="fas fa-arrow-up text-xl"></i>
        </button>
      )}

      {showCompleteProfile && <CompleteProfileModal onClose={() => setShowCompleteProfile(false)} onSuccess={fetchDashboardData} user={user} />}
      {activeInfo && <InfoModal isOpen={!!activeInfo} onClose={() => setActiveInfo(null)} title={activeInfo.title} content={activeInfo.content} />}

      {showProfilePicModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-6 fade-in">
          <div className="bg-white rounded-[40px] p-12 w-full max-w-md shadow-2xl relative border-t-8 border-red-500">
            <button onClick={() => setShowProfilePicModal(false)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-800 text-3xl font-bold">&times;</button>
            <h3 className="text-3xl font-black text-gray-800 mb-8 tracking-tight">Update Picture</h3>
            <div className="flex flex-col items-center gap-8">
              <div className="w-52 h-52 bg-gray-50 rounded-full overflow-hidden border-8 border-white shadow-2xl relative group">
                {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : user.profile_picture ? <img src={getProfilePicUrl(user.profile_picture)} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-6xl text-gray-200"><i className="fas fa-user"></i></div>}
              </div>
              <div className="w-full space-y-4">
                <input type="file" onChange={(e) => { const f = e.target.files[0]; if (f) { setSelectedFile(f); setPreviewUrl(URL.createObjectURL(f)); } }} id="pfile" className="hidden" />
                <label htmlFor="pfile" className="w-full py-4 bg-gray-50 text-gray-600 rounded-2xl font-black text-sm flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-all">Change Photo</label>
                <button onClick={handleProfilePicUpload} disabled={!selectedFile} className={`w-full py-4 rounded-2xl font-black text-sm transition-all shadow-xl ${selectedFile ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-400'}`}>Upload Now</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
