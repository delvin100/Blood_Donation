import React, { useState, useEffect } from 'react';
import '../public/css/dashboard.css';
import CompleteProfileModal from './CompleteProfileModal';
import InfoModal from './InfoModal';
import EditProfileModal from './EditProfileModal';
import ProfilePicModal from './ProfilePicModal';
import BackToTop from './BackToTop';

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
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [activeInfo, setActiveInfo] = useState(null);

  // Edit modals state
  const [editingDonation, setEditingDonation] = useState(null);
  const [editingReminder, setEditingReminder] = useState(null);

  // Form states
  const [newDonation, setNewDonation] = useState({
    date: new Date().toISOString().split('T')[0],
    units: 1,
    notes: ''
  });
  const [newReminder, setNewReminder] = useState({ date: '', text: '' });

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
      const isProfileIncomplete = jsonData.user && (
        !jsonData.user.gender ||
        !phoneRegex.test(jsonData.user.phone) ||
        !jsonData.user.state ||
        !jsonData.user.district ||
        !jsonData.user.city
      );

      if (isProfileIncomplete) {
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
    const target = new Date(data.stats.nextEligibleDate).getTime();
    const now = new Date().getTime();

    if (target <= now) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const timer = setInterval(() => {
      const currentTime = new Date().getTime();
      const diff = target - currentTime;
      if (diff <= 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
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
        body: JSON.stringify(newDonation)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to add donation');
      setMessage('Donation recorded successfully!');
      fetchDashboardData();
      setNewDonation({ date: new Date().toISOString().split('T')[0], units: 1, notes: '' });
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleEditDonation = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/dashboard/donation/${editingDonation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          date: editingDonation.date,
          units: editingDonation.units,
          notes: editingDonation.notes
        })
      });
      if (!res.ok) throw new Error('Failed to update donation');
      setMessage('Donation updated successfully!');
      fetchDashboardData();
      setEditingDonation(null);
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
        body: JSON.stringify({ reminder_date: newReminder.date, message: newReminder.text })
      });
      if (!res.ok) throw new Error('Failed to add reminder');
      setMessage('Reminder added successfully!');
      fetchDashboardData();
      setNewReminder({ date: '', text: '' });
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleEditReminder = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/dashboard/reminder/${editingReminder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ reminder_date: editingReminder.reminder_date, message: editingReminder.message })
      });
      if (!res.ok) throw new Error('Failed to update reminder');
      setMessage('Reminder updated successfully!');
      fetchDashboardData();
      setEditingReminder(null);
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



  const handleLogout = () => {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  };

  if (loading) return <div className="modern-bg flex items-center justify-center text-white text-2xl font-black">Loading...</div>;
  if (error) return <div className="modern-bg flex items-center justify-center text-red-200 text-2xl font-black">Error: {error}</div>;

  const { user, donations, reminders, stats } = data;

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
      <header className="modern-header py-5">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg transform transition-transform hover:scale-105">
                <i className="fas fa-heart text-red-600 text-2xl"></i>
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight leading-none mb-1">eBloodBank</h1>
                <p className="text-white/90 text-[10.5px] uppercase font-black tracking-[0.3em]">Blood Donation Portal</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-10 min-h-screen">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="sidebar-container shrink-0 lg:w-64 lg:sticky lg:top-6 self-start transition-all duration-300">
            <div className="modern-card p-5 shadow-xl border-0">
              <h3 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-3 border-b pb-3">
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
                  <div className="sidebar-link w-full text-left cursor-default opacity-100 font-bold text-red-500 text-xs uppercase tracking-wider pl-1 mb-2">
                    <i className="fas fa-users-cog mr-2"></i> People Behind
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

                <button onClick={() => openInfo('donation-facts')} className="sidebar-link w-full text-left group mt-2">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-[10px] group-hover:bg-blue-200 transition-colors">
                    <i className="fas fa-book"></i>
                  </div>
                  <span className="group-hover:translate-x-1 transition-transform">Blood Donation Facts</span>
                </button>
                <button onClick={() => openInfo('who-can-donate')} className="sidebar-link w-full text-left group">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center text-[10px] group-hover:bg-emerald-200 transition-colors">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <span className="group-hover:translate-x-1 transition-transform font-bold text-red-600">Who can/ Can't Donate</span>
                </button>

                <h4 className="sidebar-resource-title mt-6 mb-3 text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">Blood Donation Resources</h4>

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
                  <button key={item.key} onClick={() => openInfo(item.key)} className="sidebar-link w-full text-left text-gray-600 hover:text-red-600 font-medium text-base flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-red-50 transition-all group">
                    <i className={`fas ${item.icon} text-gray-400 group-hover:text-red-500 w-6 text-center transition-colors`}></i>
                    <span className="group-hover:translate-x-1 transition-transform">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 space-y-5">
            {/* Centered Header */}
            <div className="text-center mb-8 fade-in">
              <h1 className="text-5xl font-black text-white mb-2 drop-shadow-lg tracking-tight">Donor Dashboard</h1>
              <p className="text-white/80 text-xl font-medium">Manage your profile and donations</p>
            </div>

            {/* Top Status Alert */}
            {donations.length === 0 && (
              <div className="bg-blue-100 border-2 border-blue-400 rounded-[24px] p-5 flex items-center gap-4 text-blue-900 shadow-xl shadow-blue-500/10 animate-in fade-in slide-in-from-top-4">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                  <i className="fas fa-info text-sm"></i>
                </div>
                <p className="font-bold text-base">No donation history found. Please record your first donation below to start tracking your journey.</p>
              </div>
            )}

            {/* Dashboard Stats Overview - 3 Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="modern-card p-8 flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-all">
                <span className="text-6xl font-black text-red-600 mb-2">{donations.length}</span>
                <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Donations</span>
              </div>
              <div className="modern-card p-8 flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-all">
                <span className="text-5xl font-black text-red-600 mb-2">
                  {donations.length > 0 ? formatDateHyphen(donations[0].date) : 'None'}
                </span>
                <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Last Donation</span>
              </div>
              <div className="modern-card p-8 flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-all">
                <span className="text-6xl font-black text-red-600 mb-2">{reminders.length}</span>
                <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Active Reminders</span>
              </div>
            </div>

            {/* Hello User Section */}
            <div className="modern-card p-8 bg-white overflow-hidden relative">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <h1 className="text-3xl font-black text-gray-800 uppercase">Hello, {user.full_name}</h1>
                  <p className="text-gray-500 font-bold mt-2 text-base tracking-wide">Great to have you here saving lives!</p>
                </div>
                <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-full font-black text-sm transition-all shadow-xl hover:shadow-red-200 transform hover:-translate-y-1 flex items-center gap-2">
                  <i className="fas fa-power-off"></i>
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* Profile & Recovery Row */}
            <div className="grid lg:grid-cols-3 gap-5">
              {/* Profile Info Card */}
              <div className="modern-card p-7 flex flex-col items-center">
                <div className="flex justify-center mb-5">
                  <div className="relative group">
                    {user.profile_picture ? (
                      <img src={getProfilePicUrl(user.profile_picture)} className="w-24 h-24 rounded-full object-cover shadow-2xl border-4 border-white" alt="Profile" />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <button onClick={() => setShowProfilePicModal(true)} className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                      <i className="fas fa-camera text-[10px]"></i>
                    </button>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-2 self-start">
                  <i className="fas fa-user-circle text-red-600"></i> Profile
                </h3>

                <div className="w-full space-y-5 font-bold text-gray-600 mb-8">
                  <div className="flex items-center gap-3 text-base">
                    <i className="fas fa-user text-red-500 w-5"></i>
                    <span>Name: <span className="text-gray-900">{user.full_name}</span></span>
                  </div>
                  <div className="flex items-center gap-3 text-base">
                    <i className="fas fa-tint text-red-500 w-5"></i>
                    <span>Blood Group: <span className="text-gray-900">{user.blood_type}</span></span>
                  </div>
                  <div className="flex items-center gap-3 text-base">
                    <i className="fas fa-calendar-alt text-blue-500 w-5"></i>
                    <span>Date of Birth: <span className="text-gray-900">{user.dob ? formatDateHyphen(user.dob) : 'Not set'}</span></span>
                  </div>
                </div>

                <div className="w-full">
                  <div className={`flex items-center justify-center gap-3 py-3 rounded-2xl text-white font-black text-base shadow-lg ${user.availability === 'Available' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    <div className="w-2 h-2 bg-white rounded-full shadow-sm"></div>
                    {user.availability === 'Available' ? 'Available' : 'Unavailable'}
                    <i className="fas fa-cloud text-sm opacity-60"></i>
                  </div>
                  <div className="text-center mt-4 space-y-2">
                    {stats.isEligible ? (
                      <p className="text-xs font-bold text-emerald-600">
                        <i className="fas fa-check-circle mr-1"></i> You are eligible to donate!
                      </p>
                    ) : (
                      <p className="text-xs font-bold text-red-600">
                        <i className="fas fa-history mr-1"></i> Next eligibility: {formatDateHyphen(stats.nextEligibleDate)}
                      </p>
                    )}
                    <p className="text-[11px] font-medium text-gray-400 italic">
                      Availability status is updated automatically based on your last donation (90-day rule).
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Card Section */}
              <div className="modern-card !p-0">
                <div className="text-center h-full">
                  {data.user.state && data.user.district && data.user.city ? (
                    /* Edit Profile Card */
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-10 border border-green-200 h-full flex flex-col justify-center min-h-[350px]">
                      <div className="flex items-center justify-center mb-6">
                        <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                          <i className="fas fa-user-edit text-white text-3xl pl-1"></i>
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-gray-800 mb-3 tracking-tight">Profile Complete!</h3>
                      <div className="text-base text-gray-600 mb-8 space-y-2 font-medium">
                        <p><i className="fas fa-map-marker-alt text-green-600 mr-2"></i> {data.user.city}, {data.user.district}</p>
                        <p><i className="fas fa-flag text-green-600 mr-2"></i> {data.user.state}, India</p>
                      </div>
                      <button
                        onClick={() => setShowEditProfile(true)}
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-bold text-base transition-all duration-300 shadow-lg hover:shadow-green-200 transform hover:-translate-y-1 flex items-center justify-center gap-2 w-auto mx-auto"
                      >
                        <i className="fas fa-edit text-lg"></i>
                        <span>Edit Your Profile</span>
                        <i className="fas fa-arrow-right text-sm"></i>
                      </button>
                    </div>
                  ) : (
                    /* Complete Profile Card */
                    <div className="bg-gradient-to-r from-red-50 to-red-100 p-10 border border-red-200 h-full flex flex-col justify-center min-h-[350px]">
                      <div className="flex items-center justify-center mb-6">
                        <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                          <i className="fas fa-user-plus text-white text-3xl"></i>
                        </div>
                      </div>
                      <h3 className="text-2xl font-black text-gray-800 mb-3 tracking-tight">Complete Your Profile</h3>
                      <p className="text-gray-600 text-base mb-8 leading-relaxed font-medium">Add your location details to help us serve you better</p>
                      <button
                        onClick={() => setShowCompleteProfile(true)}
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-5 rounded-2xl font-black text-lg transition-all duration-300 shadow-xl hover:shadow-red-200 transform hover:-translate-y-1 flex items-center justify-center gap-3 w-full"
                      >
                        <i className="fas fa-map-marker-alt text-xl"></i>
                        <span>Complete Profile</span>
                        <i className="fas fa-arrow-right text-base"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Eligibility Countdown Card */}
              <div className="modern-card p-6 flex flex-col">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <i className="fas fa-hourglass-half text-red-600"></i> Eligibility Countdown
                </h3>

                {stats.isEligible ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-2xl mb-4 shadow-inner">
                      <i className="fas fa-check-circle"></i>
                    </div>
                    <p className="text-base font-bold text-gray-700 leading-snug">
                      {donations.length === 0
                        ? "No donation history available. You are eligible to donate."
                        : "Great news! You are eligible to donate again."
                      }
                    </p>
                    <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} className="mt-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline cursor-pointer">
                      Record a new donation below
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-5 text-center mb-8">
                      <p className="text-red-800 font-black text-xl">Next eligible donation in {timeLeft.days} days.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-red-100/50 rounded-3xl p-5 text-center border-b-4 border-red-200">
                        <div className="text-4xl font-black text-red-700">{timeLeft.days}</div>
                        <div className="text-xs font-black text-red-400 uppercase tracking-widest mt-1">Days</div>
                      </div>
                      <div className="bg-red-100/50 rounded-3xl p-5 text-center border-b-4 border-red-200">
                        <div className="text-4xl font-black text-red-700">{timeLeft.hours}</div>
                        <div className="text-xs font-black text-red-400 uppercase tracking-widest mt-1">Hours</div>
                      </div>
                      <div className="bg-red-100/50 rounded-3xl p-5 text-center border-b-4 border-red-200">
                        <div className="text-4xl font-black text-red-700">{timeLeft.minutes}</div>
                        <div className="text-xs font-black text-red-400 uppercase tracking-widest mt-1">Mins</div>
                      </div>
                      <div className="bg-red-100/50 rounded-3xl p-5 text-center border-b-4 border-red-200">
                        <div className="text-4xl font-black text-red-700">{timeLeft.seconds}</div>
                        <div className="text-xs font-black text-red-400 uppercase tracking-widest mt-1">Secs</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Donation & Reminders Integrated Section */}
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              {/* Donation History Card */}
              <div className="modern-card p-5">
                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <i className="fas fa-tint text-red-600 text-xl"></i>
                  Donation History
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{donations.length} donations</span>
                </h2>

                {donations.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fas fa-heart text-gray-300 text-4xl mb-3"></i>
                    <p className="text-gray-500 font-medium">No donations recorded yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Your first donation will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {donations.map((h) => (
                      <div key={h.id} className="bg-red-50 border border-red-200 rounded-lg p-3 hover:bg-red-100 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                              <i className="fas fa-tint text-white text-xs"></i>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{formatDateHyphen(h.date)}</p>
                              <p className="text-sm text-gray-600">{h.notes || 'No notes'}</p>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                              {h.units} {h.units > 1 ? 'units' : 'unit'}
                            </span>
                            <div className="flex gap-1">
                              <button onClick={() => setEditingDonation(h)} className="text-blue-600 hover:text-blue-800 text-sm p-1"><i className="fas fa-edit"></i></button>
                              <button onClick={() => handleDelete('donation', h.id)} className="text-red-600 hover:text-red-800 text-sm p-1"><i className="fas fa-trash"></i></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t-2 border-gray-100">
                  <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-6 border border-red-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-red-200 rounded-full opacity-20 translate-x-10 -translate-y-10"></div>

                    <div className="relative z-10">
                      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                          <i className="fas fa-plus-circle"></i>
                        </div>
                        <span>Record New Donation</span>
                        <div className="w-2 h-2 bg-red-400 rounded-full animate-bounce"></div>
                      </h3>

                      <form onSubmit={handleAddDonation} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="block text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <i className="fas fa-tint text-red-500"></i>
                              Units Donated *
                            </label>
                            <div className="relative">
                              <input
                                className="w-full bg-white border-2 border-gray-200 rounded-xl px-12 py-4 h-[60px] text-base font-medium focus:border-red-400 focus:ring-0 transition-all outline-none"
                                type="number"
                                value={newDonation.units}
                                onChange={(e) => setNewDonation({ ...newDonation, units: e.target.value })}
                                step="0.1"
                                min="0.1"
                                required
                              />
                              <i className="fas fa-tint absolute left-4 top-1/2 -translate-y-1/2 text-red-500 text-lg"></i>
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">units</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <i className="fas fa-calendar text-red-500"></i>
                              Donation Date *
                            </label>
                            <div className="relative">
                              <input
                                className="w-full bg-white border-2 border-gray-200 rounded-xl px-12 py-4 h-[60px] text-base font-medium focus:border-red-400 focus:ring-0 transition-all outline-none"
                                type="date"
                                min={new Date().toISOString().split('T')[0]}
                                value={newDonation.date}
                                onChange={(e) => setNewDonation({ ...newDonation, date: e.target.value })}
                                required
                              />
                              <i className="fas fa-calendar absolute left-4 top-1/2 -translate-y-1/2 text-red-500 text-lg"></i>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6">
                          <label className="block text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <i className="fas fa-comment text-red-500"></i>
                            Notes (Optional)
                          </label>
                          <div className="relative">
                            <input
                              className="w-full bg-white border-2 border-gray-200 rounded-xl px-12 py-4 h-[60px] text-base font-medium focus:border-red-400 focus:ring-0 transition-all outline-none"
                              placeholder="e.g., Emergency donation, Regular checkup"
                              value={newDonation.notes}
                              onChange={(e) => setNewDonation({ ...newDonation, notes: e.target.value })}
                            />
                            <i className="fas fa-comment absolute left-4 top-1/2 -translate-y-1/2 text-red-500 text-lg"></i>
                          </div>
                        </div>

                        <button type="submit" className="w-full bg-gradient-to-r from-red-500 via-red-600 to-rose-600 hover:from-red-600 hover:via-red-700 hover:to-rose-700 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-xl flex items-center justify-center gap-3 mt-4">
                          <i className="fas fa-heart text-xl animate-pulse"></i>
                          <span>Record Donation</span>
                          <i className="fas fa-arrow-right text-lg"></i>
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>

              {/* Donation Reminders Card */}
              <div className="modern-card p-5">
                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <i className="fas fa-bell text-yellow-600 text-xl"></i>
                  Donation Reminders
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{reminders.length} active</span>
                </h2>

                {reminders.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fas fa-calendar-alt text-gray-300 text-4xl mb-3"></i>
                    <p className="text-gray-500 font-medium">No reminders set.</p>
                    <p className="text-xs text-gray-400 mt-1">Set reminders to stay on track</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                    {reminders.map((r) => (
                      <div key={r.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                              <i className="fas fa-bell text-white text-xs"></i>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{r.message}</p>
                              <p className="text-sm text-gray-600">{formatDateHyphen(r.reminder_date)}</p>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full uppercase">Upcoming</span>
                            <div className="flex gap-1">
                              <button onClick={() => setEditingReminder(r)} className="text-blue-600 hover:text-blue-800 text-sm p-1"><i className="fas fa-edit"></i></button>
                              <button onClick={() => handleDelete('reminder', r.id)} className="text-red-600 hover:text-red-800 text-sm p-1"><i className="fas fa-trash"></i></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 pt-6 border-t-2 border-gray-100">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-20 h-20 bg-blue-200 rounded-full opacity-20 -translate-x-10 -translate-y-10"></div>

                    <div className="relative z-10">
                      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                          <i className="fas fa-plus-circle"></i>
                        </div>
                        <span>Set New Reminder</span>
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      </h3>

                      <form onSubmit={handleAddReminder} className="space-y-6">
                        <div>
                          <label className="block text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <i className="fas fa-calendar-plus text-blue-500"></i>
                            Reminder Date *
                          </label>
                          <div className="relative">
                            <input
                              className="w-full bg-white border-2 border-gray-200 rounded-xl px-12 py-4 h-[60px] text-base font-medium focus:border-blue-400 focus:ring-0 transition-all outline-none"
                              type="date"
                              min={new Date().toISOString().split('T')[0]}
                              value={newReminder.date}
                              onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
                              required
                            />
                            <i className="fas fa-calendar-plus absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 text-lg"></i>
                          </div>
                        </div>

                        <div className="mt-6">
                          <label className="block text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <i className="fas fa-comment-dots text-blue-500"></i>
                            Reminder Message *
                          </label>
                          <div className="relative">
                            <input
                              className="w-full bg-white border-2 border-gray-200 rounded-xl px-12 py-4 h-[60px] text-base font-medium focus:border-blue-400 focus:ring-0 transition-all outline-none"
                              placeholder="e.g., Time for your next donation"
                              value={newReminder.text}
                              onChange={(e) => setNewReminder({ ...newReminder, text: e.target.value })}
                              required
                            />
                            <i className="fas fa-comment-dots absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 text-lg"></i>
                          </div>
                        </div>

                        <button type="submit" className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 text-white py-4 rounded-2xl font-bold text-lg transition-all shadow-xl flex items-center justify-center gap-3 mt-4">
                          <i className="fas fa-bell text-xl animate-pulse"></i>
                          <span>Set Reminder</span>
                          <i className="fas fa-arrow-right text-lg"></i>
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCompleteProfile && <CompleteProfileModal onClose={() => setShowCompleteProfile(false)} onSuccess={fetchDashboardData} user={user} />}
      {showEditProfile && <EditProfileModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} user={user} onUpdate={fetchDashboardData} />}
      {activeInfo && <InfoModal isOpen={!!activeInfo} onClose={() => setActiveInfo(null)} title={activeInfo.title} content={activeInfo.content} />}
      <BackToTop />

      {/* Modals */}
      {editingDonation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[40px] p-12 w-full max-w-lg shadow-2xl relative border-t-8 border-red-500">
            <button onClick={() => setEditingDonation(null)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-800 text-4xl font-bold">&times;</button>
            <h3 className="text-4xl font-black text-gray-800 mb-8 tracking-tight">Edit Donation</h3>
            <form onSubmit={handleEditDonation} className="space-y-6">
              <div className="modern-input-group">
                <label>Donation Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={editingDonation.date ? editingDonation.date.split('T')[0] : ''}
                  onChange={e => setEditingDonation({ ...editingDonation, date: e.target.value })}
                  className="modern-input-field"
                  required
                />
              </div>
              <div className="modern-input-group">
                <label>Units Donated</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingDonation.units}
                  onChange={e => setEditingDonation({ ...editingDonation, units: e.target.value })}
                  className="modern-input-field"
                  required
                />
              </div>
              <div className="modern-input-group">
                <label>Notes</label>
                <textarea
                  value={editingDonation.notes || ''}
                  onChange={e => setEditingDonation({ ...editingDonation, notes: e.target.value })}
                  className="modern-input-field h-24 resize-none"
                />
              </div>
              <button type="submit" className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-red-700 transition-all">Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {editingReminder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-[40px] p-12 w-full max-w-lg shadow-2xl relative border-t-8 border-blue-500">
            <button onClick={() => setEditingReminder(null)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-800 text-4xl font-bold">&times;</button>
            <h3 className="text-4xl font-black text-gray-800 mb-8 tracking-tight">Edit Reminder</h3>
            <form onSubmit={handleEditReminder} className="space-y-6">
              <div className="modern-input-group">
                <label>Reminder Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={editingReminder.reminder_date ? editingReminder.reminder_date.split('T')[0] : ''}
                  onChange={e => setEditingReminder({ ...editingReminder, reminder_date: e.target.value })}
                  className="modern-input-field"
                  required
                />
              </div>
              <div className="modern-input-group">
                <label>Reminder Message</label>
                <input
                  type="text"
                  value={editingReminder.message}
                  onChange={e => setEditingReminder({ ...editingReminder, message: e.target.value })}
                  className="modern-input-field"
                  required
                />
              </div>
              <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-blue-700 transition-all">Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {showProfilePicModal && (
        <ProfilePicModal
          isOpen={showProfilePicModal}
          onClose={() => setShowProfilePicModal(false)}
          user={user}
          onUpdate={fetchDashboardData}
        />
      )}
    </div>
  );
};

export default Dashboard;
