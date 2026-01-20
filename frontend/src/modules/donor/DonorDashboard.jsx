import React, { useState, useEffect, useRef } from 'react';
import '../../../public/css/dashboard.css';
import CompleteProfileModal from './CompleteProfileModal';
import InfoModal from './InfoModal';
import EditProfileModal from './EditProfileModal';
import ProfilePicModal from './ProfilePicModal';
import BackToTop from '../../BackToTop';
import Chatbot from './Chatbot';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  // Edit modals state
  const [editingDonation, setEditingDonation] = useState(null);
  const [urgentNeeds, setUrgentNeeds] = useState([]);


  // Form states
  const [newDonation, setNewDonation] = useState({ date: '', units: 1, notes: '', hb_level: '', blood_pressure: '' });

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (!token) {
        window.location.href = '/donor/login';
        return;
      }
      const res = await fetch('/api/donor/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.status === 401 || res.status === 403 || res.status === 404) {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        window.location.href = '/donor/login';
        return;
      }

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
    fetchNotifications();
    fetchUrgentNeeds();

    // Close notifications when clicking outside
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Polling for notifications
    const interval = setInterval(fetchNotifications, 30000); // 30s

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearInterval(interval);
    };
  }, []);

  const fetchUrgentNeeds = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (!token) return;
      const res = await axios.get('/api/donor/urgent-needs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUrgentNeeds(res.data);
    } catch (err) {
      console.error('Error fetching urgent needs:', err);
    }
  };

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

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (!token) return;
      const res = await axios.get('/api/donor/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);

      // Check for unread emergency notifications
      const unreadEmergency = res.data.find(n => !n.is_read && n.type === 'Emergency');
      if (unreadEmergency) {
        toast.error(`URGENT: ${unreadEmergency.title}`, {
          duration: 10000,
          position: 'top-center',
          style: {
            background: '#dc2626',
            color: '#fff',
            fontWeight: 'bold',
            borderRadius: '16px',
            padding: '16px 24px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          },
          icon: '🚨',
        });
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      await axios.patch(`/api/donor/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      // Update data count locally
      if (data && data.stats) {
        setData(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            unreadNotifications: Math.max(0, prev.stats.unreadNotifications - 1)
          }
        }));
      }
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      await axios.patch('/api/donor/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      if (data && data.stats) {
        setData(prev => ({
          ...prev,
          stats: { ...prev.stats, unreadNotifications: 0 }
        }));
      }
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleEditDonation = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const res = await fetch(`/api/donor/donation/${editingDonation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          date: editingDonation.date,
          units: editingDonation.units,
          notes: editingDonation.notes,
          hb_level: editingDonation.hb_level,
          blood_pressure: editingDonation.blood_pressure
        })
      });
      if (!res.ok) throw new Error('Failed to update donation');
      toast.success('Donation updated successfully!');
      fetchDashboardData();
      setEditingDonation(null);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const res = await fetch(`/api/donor/${type}/${id}`, {
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
    sessionStorage.removeItem('authToken');
    window.location.href = '/login';
  };

  if (loading) return <div className="modern-bg flex items-center justify-center text-white text-2xl font-black">Loading...</div>;
  if (error) return <div className="modern-bg flex items-center justify-center text-red-200 text-2xl font-black">Error: {error}</div>;

  if (!data || !data.user) return <div className="modern-bg flex items-center justify-center text-white text-2xl font-black">Loading User Data...</div>;
  const { user, donations = [], stats = {}, memberships = [] } = data;

  const navigationContent = {
    'about-us': {
      title: 'About eBloodBank',
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-red-50 to-white p-6 rounded-2xl border-l-4 border-red-500 shadow-sm">
            <h4 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
              <i className="fas fa-history text-red-500"></i> Our Story
            </h4>
            <p className="text-gray-600 leading-relaxed text-lg">
              eBloodBank.org was born from a simple yet powerful idea: <span className="font-bold text-red-600">No one should suffer due to a lack of blood.</span> Established in 2024, we have grown into a global volunteering movement, bridging the gap between donors and patients in real-time.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-md border hover:border-red-200 transition-all group">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <i className="fas fa-users text-red-600 text-xl"></i>
              </div>
              <h5 className="font-bold text-gray-800 mb-2">Community Driven</h5>
              <p className="text-sm text-gray-500">Powered by thousands of volunteers and donors like you.</p>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-md border hover:border-red-200 transition-all group">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <i className="fas fa-bolt text-blue-600 text-xl"></i>
              </div>
              <h5 className="font-bold text-gray-800 mb-2">Fast & Secure</h5>
              <p className="text-sm text-gray-500">Real-time connection with strict privacy protocols.</p>
            </div>
          </div>
        </div>
      )
    },
    'vision-mission': {
      title: 'Vision & Mission',
      content: (
        <div className="space-y-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 rounded-3xl shadow-xl transform hover:scale-[1.01] transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-red-500 rounded-full text-xs font-black uppercase tracking-widest">Our Vision</span>
              </div>
              <p className="text-2xl font-light italic leading-relaxed">
                "To create a world where <span className="font-bold text-red-400">every life is valued</span> and no patient dies waiting for blood."
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-lg relative">
            <div className="absolute -top-5 left-8 bg-red-600 text-white w-10 h-10 flex items-center justify-center rounded-xl shadow-lg">
              <i className="fas fa-bullseye text-xl"></i>
            </div>
            <h4 className="text-xl font-bold text-gray-800 mb-4 mt-2">Our Mission</h4>
            <ul className="space-y-4">
              {[
                "Build a massive global network of voluntary donors.",
                "Leverage technology to reduce response time in emergencies.",
                "Eliminate the scarcity of blood through awareness and action.",
                "Ensure safe and free access to blood for all."
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-gray-600">
                  <i className="fas fa-check-circle text-green-500 mt-1"></i>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )
    },
    'founders': {
      title: 'Our Founders',
      content: (
        <div className="space-y-6">
          <p className="text-lg text-gray-600 leading-relaxed text-center">
            Driven by passion and united by a cause. Meet the visionaries who started it all.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-lg border-t-4 border-red-500 hover:-translate-y-2 transition-transform duration-300">
                <div className="w-20 h-20 mx-auto bg-gray-200 rounded-full mb-4 flex items-center justify-center text-3xl text-gray-400">
                  <i className="fas fa-user"></i>
                </div>
                <h4 className="text-center text-xl font-bold text-gray-800">Founder Name {i}</h4>
                <p className="text-center text-red-500 font-medium text-sm mb-3">Co-Founder</p>
                <p className="text-center text-gray-500 text-sm">"Believing in the power of humanity to save lives."</p>
              </div>
            ))}
          </div>
        </div>
      )
    },
    'technical-team': {
      title: 'Technical Wizards',
      content: (
        <div className="text-center">
          <div className="inline-block p-4 bg-blue-50 rounded-full mb-6">
            <i className="fas fa-code text-4xl text-blue-600"></i>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Building the Future of Donation</h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Our platform is engineered by volunteer developers who dedicate their code to save lives. Secure, fast, and reliable.
          </p>
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-left">
            <h5 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <i className="fas fa-layer-group text-blue-500"></i> Tech Stack
            </h5>
            <div className="flex flex-wrap gap-2">
              {['React', 'Node.js', 'PostgreSQL', 'Tailwind', 'Maps API'].map(tag => (
                <span key={tag} className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-600 shadow-sm">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      )
    },
    'field-volunteers': { title: 'Heroes on Ground', content: <div className="space-y-4"><p className="text-lg text-gray-700">From verified requests to organizing camps, our volunteers work 24/7.</p><div className="bg-yellow-50 p-4 rounded-xl border-l-4 border-yellow-500"><p className="font-bold text-yellow-800">Interested in volunteering?</p><p className="text-sm text-yellow-700">Join our local chapter today via the 'Contact' section.</p></div></div> },
    'campaign-team': { title: 'Voice of Change', content: <p className="text-gray-700 text-lg">Spreading awareness, busting myths, and inspiring the youth to become lifelong donors.</p> },

    'donation-facts': {
      title: 'Did You Know?',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { icon: 'fa-heartbeat', color: 'text-red-500', title: '3 Lives', desc: 'One donation can save up to three lives.' },
            { icon: 'fa-clock', color: 'text-blue-500', title: 'Every 2 Secs', desc: 'Someone in needs blood every two seconds.' },
            { icon: 'fa-history', color: 'text-green-500', title: 'Regenerates', desc: 'Plasma regenerates within 24 hours.' },
            { icon: 'fa-weight', color: 'text-purple-500', title: 'Free Checkup', desc: 'You get a mini medical checkup before donating.' },
          ].map((fact, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
              <div className={`mt-1 text-2xl ${fact.color}`}><i className={`fas ${fact.icon}`}></i></div>
              <div>
                <h5 className="font-bold text-gray-900">{fact.title}</h5>
                <p className="text-sm text-gray-500 leading-snug">{fact.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )
    },
    'who-can-donate': {
      title: 'Eligibility Criteria',
      content: (
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-1 bg-green-50 rounded-2xl p-6 border border-green-200">
              <h4 className="text-green-800 font-bold mb-4 flex items-center gap-2"><i className="fas fa-check-circle"></i> Can Donate</h4>
              <ul className="space-y-2 text-green-900 text-sm font-medium">
                <li><i className="fas fa-check mr-2 opacity-50"></i> Age: 18 - 65 years</li>
                <li><i className="fas fa-check mr-2 opacity-50"></i> Weight: &gt; 50 kg</li>
                <li><i className="fas fa-check mr-2 opacity-50"></i> Healthy & Well rested</li>
                <li><i className="fas fa-check mr-2 opacity-50"></i> Hb level &gt; 12.5 g/dL</li>
              </ul>
            </div>
            <div className="flex-1 bg-red-50 rounded-2xl p-6 border border-red-200">
              <h4 className="text-red-800 font-bold mb-4 flex items-center gap-2"><i className="fas fa-times-circle"></i> Cannot Donate</h4>
              <ul className="space-y-2 text-red-900 text-sm font-medium">
                <li><i className="fas fa-times mr-2 opacity-50"></i> Under 18 years</li>
                <li><i className="fas fa-times mr-2 opacity-50"></i> Underweight</li>
                <li><i className="fas fa-times mr-2 opacity-50"></i> Consumed alcohol (24h)</li>
                <li><i className="fas fa-times mr-2 opacity-50"></i> Major surgery recently</li>
              </ul>
            </div>
          </div>
          <p className="text-center text-gray-500 text-xs italic">Consult with the doctor at the camp for specific medical conditions.</p>
        </div>
      )
    },

    // ... Simplified rich content for other sections
    'donation-process': { title: '4 Simple Steps', content: <div className="space-y-4">{['Registration', 'Medical Check', 'Donation', 'Refreshment'].map((step, i) => (<div key={i} className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm"><div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold">{i + 1}</div><span className="font-bold text-gray-700">{step}</span></div>))}</div> },
    'blood-types': {
      title: 'Blood Types Compatibility',
      content: <div className="bg-white rounded-xl shadow-lg overflow-hidden"><table className="w-full text-sm text-left"><thead className="bg-gray-100 text-gray-700"><tr><th className="p-3">Type</th><th className="p-3">Give To</th><th className="p-3">Receive From</th></tr></thead><tbody className="divide-y">{[
        { t: 'O-', g: 'All', r: 'O-' }, { t: 'O+', g: 'O+, A+, B+, AB+', r: 'O+, O-' }, { t: 'A+', g: 'A+, AB+', r: 'A+, A-, O+, O-' }, { t: 'AB+', g: 'AB+', r: 'All' }
      ].map(r => (<tr key={r.t} className="hover:bg-gray-50"><td className="p-3 font-bold text-red-600">{r.t}</td><td className="p-3">{r.g}</td><td className="p-3">{r.r}</td></tr>))}</tbody></table></div>
    },
    'health-benefits': { title: 'Why Donate?', content: <ul className="grid grid-cols-2 gap-3">{['Heart Health', 'Cancer Risk Reduction', 'Free Health Checkup', 'Calorie Burn', 'Iron Balance', 'Mental Satisfaction'].map(b => (<li key={b} className="bg-emerald-50 text-emerald-800 p-3 rounded-lg text-sm font-bold flex items-center gap-2"><i className="fas fa-leaf"></i> {b}</li>))}</ul> },
    'preparation-tips': { title: 'Be Prepared', content: <div className="bg-blue-50 p-5 rounded-2xl"><h5 className="font-bold text-blue-900 mb-3">Before you go:</h5><ul className="list-disc pl-5 space-y-2 text-blue-800"><li>Hydrate well (water/juice).</li><li>Have a light meal.</li><li>Avoid smoking/drinking.</li><li>Carry your ID card.</li></ul></div> },
    'aftercare': { title: 'Relax & Recover', content: <div className="text-center"><i className="fas fa-couch text-4xl text-orange-400 mb-4"></i><p className="text-gray-700 mb-4">You've done a great job! Now take it easy.</p><div className="grid grid-cols-2 gap-4 text-left"><div className="bg-orange-50 p-3 rounded-lg"><span className="font-bold block text-orange-800">Do:</span> Drink fluids, eat snacks.</div><div className="bg-red-50 p-3 rounded-lg"><span className="font-bold block text-red-800">Don't:</span> Heavy lifting, rushing.</div></div></div> },

    'myths-facts': {
      title: 'Busting Myths',
      content: (
        <div className="space-y-4">
          {[
            { m: "Giving blood hurts.", f: "The pain is no more than a pinprick and lasts only a second." },
            { m: "I'll get an infection.", f: "Sterile, disposable needles are used. There is zero risk of infection." },
            { m: "I will become weak.", f: "The body replenishes the lost fluid in 24 hours. You can resume normal activities soon." },
            { m: "I am too old.", f: "Anyone up to age 65 (or even older with doctor approval) can donate." }
          ].map((item, idx) => (
            <div key={idx} className="bg-white p-5 rounded-xl border-l-4 border-indigo-500 shadow-sm">
              <p className="text-red-500 font-bold text-sm uppercase tracking-wide mb-1"><i className="fas fa-times-circle mr-1"></i> Myth:</p>
              <p className="text-gray-800 font-medium mb-3 pl-2">"{item.m}"</p>
              <div className="border-t border-gray-100 pt-2">
                <p className="text-emerald-600 font-bold text-sm uppercase tracking-wide mb-1"><i className="fas fa-check-circle mr-1"></i> Fact:</p>
                <p className="text-gray-600 pl-2">{item.f}</p>
              </div>
            </div>
          ))}
        </div>
      )
    },

    'emergency-blood': {
      title: 'Emergency?',
      content: (
        <div className="space-y-6 text-center">
          <div className="bg-red-600 text-white p-8 rounded-3xl shadow-xl animate-pulse-slow">
            <i className="fas fa-exclamation-triangle text-5xl mb-4 text-yellow-300"></i>
            <h3 className="text-3xl font-black mb-2">Critical Need?</h3>
            <p className="text-lg opacity-90 mb-6">Don't panic. We are here to help you find a donor instantly.</p>
            <div className="flex flex-col gap-3">
              <button className="bg-white text-red-600 w-full py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <i className="fas fa-search"></i> Search Donors Nearby
              </button>
              <button className="bg-red-800 text-white w-full py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-red-900 transition-colors flex items-center justify-center gap-2 border border-red-700">
                <i className="fas fa-phone-alt"></i> Call Helpline (1800-DONATE)
              </button>
            </div>
          </div>
          <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-200">
            <h4 className="font-bold text-yellow-800 mb-2"><i className="fas fa-info-circle"></i> While you wait:</h4>
            <ul className="text-yellow-900 text-sm text-left space-y-2 list-disc pl-5">
              <li>Keep the patient's blood group details handy.</li>
              <li>Contact local hospitals directly as well.</li>
              <li>Share the requirement on social media with verified tags.</li>
            </ul>
          </div>
        </div>
      )
    },

    'nearby-centers': {
      title: 'Locate Centers',
      content: (
        <div className="text-center space-y-4">
          <div className="aspect-video bg-gray-100 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gray-500/10 group-hover:bg-gray-500/0 transition-colors"></div>
            <i className="fas fa-map-marked-alt text-6xl text-gray-300 mb-3 group-hover:scale-110 transition-transform"></i>
            <p className="text-gray-500 font-medium">Interactive Map Integration</p>
            <span className="text-xs bg-gray-200 px-3 py-1 rounded-full text-gray-600 mt-2">Coming Soon in v2.0</span>
          </div>
          <p className="text-gray-600">
            We are partnering with government and private blood banks to show real-time stock availability near you.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 p-4 rounded-xl text-blue-700 font-bold text-sm">
              <i className="fas fa-hospital text-xl block mb-2"></i> Hospitals
            </div>
            <div className="bg-red-50 p-4 rounded-xl text-red-700 font-bold text-sm">
              <i className="fas fa-clinic-medical text-xl block mb-2"></i> Blood Banks
            </div>
          </div>
        </div>
      )
    },

    'blood-drives': {
      title: 'Events & Camps',
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-700">Upcoming Events</h4>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">This Month</span>
          </div>
          {[
            { date: "12 Oct", title: "Mega Blood Donation Camp", loc: "City Hall, Downtown", time: "9 AM - 5 PM" },
            { date: "25 Oct", title: "Corporate Drive", loc: "Tech Park, Sector 5", time: "10 AM - 4 PM" }
          ].map((ev, i) => (
            <div key={i} className="flex gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-red-200 transition-colors cursor-pointer">
              <div className="bg-red-100 text-red-600 rounded-xl w-16 flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold uppercase">{ev.date.split(' ')[1]}</span>
                <span className="text-2xl font-black">{ev.date.split(' ')[0]}</span>
              </div>
              <div>
                <h5 className="font-bold text-gray-900 leading-tight mb-1">{ev.title}</h5>
                <p className="text-xs text-gray-500 flex items-center gap-1"><i className="fas fa-map-marker-alt"></i> {ev.loc}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1"><i className="fas fa-clock"></i> {ev.time}</p>
              </div>
            </div>
          ))}
        </div>
      )
    },

    'success-stories': {
      title: 'Real Heroes',
      content: (
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
            <div className="h-64 bg-gray-300 bg-[url('https://images.unsplash.com/photo-1615461168409-0d21818d2d66?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center group-hover:scale-105 transition-transform duration-700"></div>
            <div className="absolute bottom-0 left-0 p-6 z-20 text-white">
              <span className="bg-red-600 text-xs font-bold px-2 py-1 rounded mb-2 inline-block">Featured Story</span>
              <h4 className="text-xl font-bold mb-1">"A stranger saved my daughter."</h4>
              <p className="text-sm opacity-90 line-clamp-2">When 5-year-old Ananya needed rare AB- blood, a donor from eBloodBank traveled 50km in the rain to save her.</p>
            </div>
          </div>
          <div className="bg-gray-50 p-6 rounded-2xl text-center">
            <i className="fas fa-quote-left text-3xl text-gray-300 mb-3"></i>
            <p className="text-gray-600 italic mb-4">"I never knew my blood could be someone's lifeline. It's the best feeling in the world."</p>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="text-left">
                <p className="font-bold text-gray-900 text-sm">Rahul Sharma</p>
                <p className="text-xs text-gray-500">Regular Donor (15+ donations)</p>
              </div>
            </div>
          </div>
        </div>
      )
    },

    'faq': {
      title: 'Questions?',
      content: (
        <div className="space-y-4">
          {[
            { q: "How often can I donate?", a: "Whole blood can be donated every 56 days (8 weeks). Platelets can be donated every 7 days." },
            { q: "Can I donate if I have a tattoo?", a: "You usually need to wait 6-12 months after getting a tattoo, depending on state regulations and heavy metal testing." },
            { q: "Does it hurt?", a: "Only a momentary pinch. The feeling of saving a life lasts forever!" },
            { q: "Do I need to fast?", a: "No! In fact, you should eat a healthy meal and drink plenty of water before donating." }
          ].map((item, i) => (
            <details key={i} className="bg-white border border-gray-100 rounded-xl group">
              <summary className="p-4 font-bold text-gray-800 cursor-pointer flex items-center justify-between list-none">
                <span>{item.q}</span>
                <span className="transition-transform group-open:rotate-180"><i className="fas fa-chevron-down text-gray-400"></i></span>
              </summary>
              <div className="px-4 pb-4 pt-0 text-gray-600 text-sm leading-relaxed border-t border-gray-50 mt-2">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      )
    },

    'contact-support': {
      title: 'We are here',
      content: (
        <div className="space-y-6">
          <p className="text-gray-600 text-center">Have a question or facing an issue? Our volunteer support team is ready to assist you.</p>
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xl"><i className="fas fa-envelope"></i></div>
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">Email Us</p>
                <p className="text-gray-900 font-bold">ebloodbankoriginal@gmail.com</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-xl"><i className="fas fa-headset"></i></div>
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">Chat Support</p>
                <p className="text-gray-900 font-bold">+91 98765 43210</p>
              </div>
            </div>
          </div>
        </div>
      )
    }
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

            <div className="flex items-center gap-6">
              {/* Notification Bell */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 relative group
                                    ${showNotifications ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  <i className={`fas fa-bell text-lg ${data?.stats?.unreadNotifications > 0 ? 'animate-bounce' : ''}`}></i>
                  {data?.stats?.unreadNotifications > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-white transform translate-x-1 -translate-y-1">
                      {data.stats.unreadNotifications}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-4 w-[400px] bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200 border border-gray-100 py-8 overflow-hidden z-50 animate-in slide-in-from-top-4 duration-300">
                    <div className="px-8 mb-6 flex items-center justify-between">
                      <h3 className="text-xl font-black text-gray-900 tracking-tight">Activity Feed</h3>
                      {data?.stats?.unreadNotifications > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-[10px] font-black text-red-600 uppercase tracking-widest hover:text-red-700 hover:underline"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto px-4 space-y-3 custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="py-16 text-center">
                          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-ghost text-gray-200 text-2xl"></i>
                          </div>
                          <p className="text-xs font-black text-gray-300 uppercase tracking-widest">No Alerts</p>
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => !n.is_read && markAsRead(n.id)}
                            className={`p-6 rounded-[2rem] transition-all cursor-pointer group relative overflow-hidden
                                                        ${n.is_read ? 'bg-white opacity-60' : 'bg-red-50/50 hover:bg-red-50 border border-red-100/50'}`}
                          >
                            <div className="flex gap-5 relative z-10">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg 
                                                            ${n.type === 'Emergency' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
                                <i className={`fas ${n.type === 'Emergency' ? 'fa-radiation' : 'fa-info-circle'} text-md`}></i>
                              </div>
                              <div className="space-y-1 flex-1">
                                <h4 className={`text-sm font-black tracking-tight ${!n.is_read ? 'text-gray-900' : 'text-gray-500'}`}>{n.title}</h4>
                                <p className="text-[11px] font-bold text-gray-400 leading-relaxed line-clamp-2">{n.message}</p>
                                <div className="flex items-center gap-3 pt-2">
                                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
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
              <nav className="space-y-6">
                {[
                  {
                    label: 'General',
                    items: [
                      { key: 'about-us', icon: 'fa-info-circle', label: 'About Us', color: 'blue' },
                      { key: 'vision-mission', icon: 'fa-lightbulb', label: 'Vision & Mission', color: 'yellow' },
                      {
                        key: 'people-behind', icon: 'fa-users', label: 'People Behind', color: 'purple', isGroup: true,
                        subItems: [
                          { key: 'founders', label: 'Founders', icon: 'fa-user-tie' },
                          { key: 'technical-team', label: 'Technical Team', icon: 'fa-laptop-code' },
                          { key: 'field-volunteers', label: 'Field Volunteers', icon: 'fa-hands-helping' },
                          { key: 'campaign-team', label: 'Campaign Team', icon: 'fa-bullhorn' },
                        ]
                      }
                    ]
                  },
                  {
                    label: 'Donation Guides',
                    items: [
                      { key: 'who-can-donate', icon: 'fa-check-circle', label: 'Eligibility Criteria', color: 'emerald' },
                      { key: 'donation-process', icon: 'fa-clipboard-check', label: 'Donation Process', color: 'teal' },
                      { key: 'blood-types', icon: 'fa-vial', label: 'Blood Types', color: 'red' },
                      { key: 'donation-facts', icon: 'fa-book-open', label: 'Facts & Figures', color: 'indigo' },
                    ]
                  },
                  {
                    label: 'Health & Care',
                    items: [
                      { key: 'health-benefits', icon: 'fa-heartbeat', label: 'Health Benefits', color: 'rose' },
                      { key: 'preparation-tips', icon: 'fa-apple-alt', label: 'Preparation Tips', color: 'orange' },
                      { key: 'aftercare', icon: 'fa-bed', label: 'Post-Donation Care', color: 'cyan' },
                    ]
                  },
                  {
                    label: 'Community',
                    items: [
                      { key: 'myths-facts', icon: 'fa-comment-slash', label: 'Myths vs Facts', color: 'violet' },
                      { key: 'success-stories', icon: 'fa-star', label: 'Success Stories', color: 'yellow' },
                      { key: 'blood-drives', icon: 'fa-flag', label: 'Events & Drives', color: 'red' },
                    ]
                  },
                  {
                    label: 'Support',
                    items: [
                      { key: 'faq', icon: 'fa-question-circle', label: 'FAQ', color: 'gray' },
                      { key: 'contact-support', icon: 'fa-headset', label: 'Contact Support', color: 'blue' },
                    ]
                  }
                ].map((section, idx) => (
                  <div key={idx}>
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 pl-3">{section.label}</h4>
                    <div className="space-y-1">
                      {section.items.map(item => (
                        <div key={item.key}>
                          {item.isGroup ? (
                            <div className="space-y-1">
                              <div className="px-3 py-2 text-gray-800 font-bold text-sm flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg bg-${item.color}-50 text-${item.color}-500 flex items-center justify-center`}>
                                  <i className={`fas ${item.icon}`}></i>
                                </div>
                                {item.label}
                              </div>
                              <div className="pl-6 space-y-1 border-l-2 border-gray-100 ml-7">
                                {item.subItems.map(sub => (
                                  <button
                                    key={sub.key}
                                    onClick={() => openInfo(sub.key)}
                                    className="w-full text-left py-1.5 px-3 text-sm text-gray-500 hover:text-red-500 font-medium hover:bg-red-50 rounded-lg transition-all flex items-center gap-3"
                                  >
                                    <div className="w-5 text-center">
                                      <i className={`fas ${sub.icon} text-sm opacity-70`}></i>
                                    </div>
                                    {sub.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => openInfo(item.key)}
                              className={`w-full text-left group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${item.urgent ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
                                }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm ${item.urgent ? 'bg-red-500 text-white' : `bg-${item.color}-50 text-${item.color}-500 group-hover:scale-110 duration-300`
                                }`}>
                                <i className={`fas ${item.icon} text-sm`}></i>
                              </div>
                              <span className={`font-semibold text-sm ${item.urgent ? 'text-red-700' : 'text-gray-700 group-hover:text-gray-900'}`}>
                                {item.label}
                              </span>
                              {item.urgent && <i className="fas fa-exclamation-circle text-red-500 ml-auto animate-pulse"></i>}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
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
                <p className="font-bold text-base">No donation history found. Please record your first donation to start tracking your journey.</p>
              </div>
            )}

            {/* Dashboard Stats Overview - Impact Visualization */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="modern-card p-8 flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-all bg-gradient-to-br from-red-50 to-white border-b-4 border-red-500">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <i className="fas fa-heartbeat text-red-600 text-3xl"></i>
                </div>
                <span className="text-5xl font-black text-gray-800 mb-1">{stats.livesSaved || 0}</span>
                <span className="text-sm font-bold text-red-600 uppercase tracking-widest">Lives Saved</span>
                <p className="text-[10px] text-gray-400 mt-2 italic">Based on {donations.length} successful donations</p>
              </div>
              <div className="modern-card p-8 flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-all bg-gradient-to-br from-blue-50 to-white border-b-4 border-blue-500">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <i className="fas fa-medal text-blue-600 text-3xl"></i>
                </div>
                <span className="text-4xl font-black text-gray-800 mb-1">{stats.milestone}</span>
                <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">Rank Level</span>
                <p className="text-[10px] text-gray-400 mt-2">Keep donating to level up!</p>
              </div>
              <div className="modern-card p-8 flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-all bg-gradient-to-br from-emerald-50 to-white border-b-4 border-emerald-500">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <i className="fas fa-check-circle text-emerald-600 text-3xl"></i>
                </div>
                <span className="text-4xl font-black text-gray-800 mb-1">{stats.isEligible ? 'Ready' : 'Resting'}</span>
                <span className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Status</span>
                <p className="text-[10px] text-gray-400 mt-2">{stats.isEligible ? 'Eligible for donation' : 'In recovery phase'}</p>
              </div>
            </div>

            {/* Hello User Section */}
            <div className="modern-card p-8 bg-white overflow-hidden relative">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <h1 className="text-3xl font-black text-gray-800 uppercase">Hello, {user?.full_name || 'Donor'}</h1>
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
                      <img
                        src={getProfilePicUrl(user.profile_picture)}
                        className="w-24 h-24 rounded-full object-cover shadow-2xl border-4 border-white"
                        alt="Profile"
                        referrerPolicy="no-referrer"
                      />
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

                <div className="w-full space-y-4 font-bold text-gray-600 mb-8 px-6">
                  <div className="flex items-center justify-start gap-4 text-lg">
                    <i className="fas fa-user text-red-500 w-6 text-center"></i>
                    <span>Name: <span className="text-gray-900">{user.full_name}</span></span>
                  </div>
                  <div className="flex items-center justify-start gap-4 text-lg">
                    <i className="fas fa-tint text-red-500 w-6 text-center"></i>
                    <span>Blood Group: <span className="text-gray-900">{user.blood_type}</span></span>
                  </div>
                  <div className="flex items-center justify-start gap-4 text-lg">
                    <i className="fas fa-calendar-alt text-blue-500 w-6 text-center"></i>
                    <span>Date of Birth: <span className="text-gray-900">{user.dob ? formatDateHyphen(user.dob) : 'Not set'}</span></span>
                  </div>
                </div>

                <div className="w-full">
                  <div className={`flex items-center justify-center gap-3 py-3 rounded-full text-white font-black text-base shadow-lg ${user.availability === 'Available' ? 'bg-emerald-600' : 'bg-red-600'} animate-pulse-slow`}>
                    <div className="w-2 h-2 bg-white rounded-full shadow-sm"></div>
                    {user.availability === 'Available' ? 'Available' : 'Unavailable'}
                    <i className="fas fa-cloud text-sm opacity-90"></i>
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
                      {donations?.length === 0
                        ? "No donation history available. You are eligible to donate."
                        : "Great news! You are eligible to donate again."
                      }
                    </p>
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
                  <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <i className="fas fa-building text-blue-600 text-xl"></i>
                    My Organizations
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{memberships?.length || 0} joined</span>
                  </h2>

                  {memberships?.length === 0 ? (
                    <div className="bg-gray-50 rounded-2xl p-8 text-center border-2 border-dashed border-gray-200">
                      <i className="fas fa-hospital-user text-gray-300 text-4xl mb-3"></i>
                      <p className="text-gray-500 font-medium">Not part of any organization yet.</p>
                      <p className="text-xs text-gray-400 mt-1">Visit a registered hospital to get verified and joined!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {memberships?.map((m, idx) => (
                        <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border-l-4 border-l-blue-500">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl">
                                <i className={m.org_type === 'Hospital' ? 'fas fa-hospital' : 'fas fa-clinic-medical'}></i>
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900">{m.org_name}</h4>
                                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mt-1">
                                  <span>{m.org_type}</span>
                                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                  <span>{m.org_city}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Joined On</div>
                              <div className="text-sm font-bold text-gray-700 bg-gray-50 px-3 py-1 rounded-lg">
                                {formatDateHyphen(m.joined_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Urgent Needs & Digital ID Section */}
              <div className="space-y-6">
                {/* Digital Donor ID Card - Verified Life Saver Edition */}
                <div className="relative group">
                  <div className="id-card-premium rounded-[2.5rem] p-0 shadow-2xl relative overflow-hidden neon-border-red" style={{ background: '#0f172a' }}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl -translate-y-32 translate-x-32"></div>

                    {/* Top Bar - RED SECTION */}
                    <div className="bg-red-600 h-[70px] px-10 flex items-center justify-between border-b border-white/10 relative z-20 w-full flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                          <i className="fas fa-heart text-white text-[12px] animate-pulse"></i>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Verified Life Saver</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-white/90 leading-none">eBloodBank</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-400 verified-badge-glow"></div>
                      </div>
                    </div>

                    <div className="p-8 relative z-10">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h3 className="text-3xl font-black tracking-tighter uppercase leading-none mb-0.5 text-white">Donor ID</h3>
                          <p className="text-[9px] text-gray-400 font-bold tracking-[0.2em] uppercase leading-none">Member Card</p>
                        </div>
                        <div className="id-card-chip"></div>
                      </div>

                      <div className="flex gap-10 items-center mb-10">
                        <div className="w-32 h-32 bg-white/5 rounded-[2.5rem] border border-white/10 p-2 backdrop-blur-md shadow-inner flex items-center justify-center overflow-hidden">
                          {user?.profile_picture ? (
                            <img src={getProfilePicUrl(user.profile_picture)} className="w-full h-full object-cover rounded-[2rem]" alt="ID" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-red-600 to-red-800 rounded-[2rem] flex items-center justify-center text-5xl font-black text-white shadow-lg">
                              <span className="leading-none mt-[-4px]">{user?.full_name?.charAt(0)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-5">
                          <div className="mt-[-2px]">
                            <p className="donor-stat-label">Donor Name</p>
                            <p className="text-3xl font-black text-white tracking-tight leading-none">{user?.full_name}</p>
                          </div>
                          <div className="flex gap-20 items-start min-h-[50px]">
                            <div className="flex flex-col">
                              <p className="donor-stat-label">Blood Type</p>
                              <p className="text-3xl font-black text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)] leading-none mt-1">{user?.blood_type}</p>
                            </div>
                            <div className="flex flex-col">
                              <p className="donor-stat-label">City</p>
                              <p className="text-lg font-bold text-white/90 leading-none pb-0.5">{user?.city || 'Not Set'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-end justify-between bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-sm">
                        <div className="space-y-4">
                          <div>
                            <p className="donor-stat-label">Member Identifier</p>
                            <p className="text-sm font-mono text-gray-300">EB-{user?.id?.toString().padStart(6, '0')}</p>
                          </div>
                          <div>
                            <p className="donor-stat-label">Life Saver Status</p>
                            <div className="flex gap-1 mt-1">
                              {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className={`w-3 h-1 rounded-full ${i <= (stats?.totalDonations || 1) ? 'bg-red-500' : 'bg-white/10'}`}></div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="qr-container-premium">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=Donor:${user?.full_name}|Type:${user?.blood_type}|ID:EB-${user?.id}&bgcolor=ffffff&color=000000&margin=2`}
                            alt="Unique QR Code"
                            className="w-16 h-16"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Decorative Footer - FULL WIDTH */}
                    <div className="bg-white/5 py-3 px-10 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 border-t border-white/5 w-full flex-shrink-0">
                      <span>Issued: 2026 Edition</span>
                      <span className="flex items-center gap-2">
                        <i className="fas fa-shield-alt text-red-600"></i>
                        Secured Digital Token
                      </span>
                    </div>


                  </div>
                </div>


                {/* Urgent Needs Feed */}
                <div className="modern-card p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <i className="fas fa-fire-alt text-orange-500"></i>
                      Urgent Needs in {user.city}
                    </span>
                    <span className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full animate-pulse">Live</span>
                  </h3>

                  {urgentNeeds.length === 0 ? (
                    <div className="py-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border shadow-sm">
                        <i className="fas fa-check text-emerald-500 text-xl"></i>
                      </div>
                      <p className="text-sm font-bold text-gray-500 italic">"Looks like everyone is safe in your city today!"</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {urgentNeeds.map((need) => (
                        <div key={need.id} className="relative group rounded-[2rem] border border-red-100 p-5 hover:bg-red-50 transition-all duration-300">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-red-600 text-white rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-red-100 font-black">
                                <span className="text-xl leading-none">{need.blood_group}</span>
                                <span className="text-[10px] uppercase">{need.urgency_level}</span>
                              </div>
                              <div>
                                <h4 className="font-black text-gray-900 leading-tight">{need.org_name}</h4>
                                <p className="text-xs text-red-600 font-bold flex items-center gap-1 mt-1">
                                  <i className="fas fa-map-marker-alt"></i> {need.org_city}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Units Required</p>
                              <p className="text-2xl font-black text-gray-900">{need.units_required}</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 font-medium mb-4 line-clamp-2">"{need.description}"</p>
                          <a href={`tel:${need.org_phone}`} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all">
                            <i className="fas fa-phone-alt animate-bounce"></i>
                            Call Institution
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Health Analytics - HB & BP Trends */}
              <div className="modern-card p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <i className="fas fa-chart-line text-blue-600"></i>
                  Health Trends (Hb level)
                </h3>
                <div className="h-[250px] w-full">
                  {donations.filter(d => d.hb_level).length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[...donations].reverse().filter(d => d.hb_level)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="date" tickFormatter={(str) => new Date(str).toLocaleDateString([], { month: 'short', day: 'numeric' })} tick={{ fontSize: 10 }} />
                        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="hb_level" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 8 }} name="Hb Level (g/dL)" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center bg-gray-50 rounded-2xl border-2 border-dashed">
                      <i className="fas fa-vial text-gray-300 text-3xl mb-2"></i>
                      <p className="text-xs text-gray-500 px-10">Add Hb level data to your next donation to see trends!</p>
                    </div>
                  )}
                </div>
                {donations.some(d => d.blood_pressure) && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Recent BP Readings</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                      {donations.filter(d => d.blood_pressure).slice(0, 4).map(d => (
                        <div key={d.id} className="bg-blue-50 px-4 py-2 rounded-full border border-blue-100 flex-shrink-0">
                          <span className="text-xs font-bold text-blue-800">{d.blood_pressure}</span>
                          <span className="text-[8px] text-blue-400 ml-2">{new Date(d.date).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {showCompleteProfile && <CompleteProfileModal onClose={() => setShowCompleteProfile(false)} onSuccess={fetchDashboardData} user={user} />}
        {showEditProfile && <EditProfileModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} user={user} onUpdate={fetchDashboardData} />}
        {activeInfo && <InfoModal isOpen={!!activeInfo} onClose={() => setActiveInfo(null)} title={activeInfo.title} content={activeInfo.content} />}

        {
          editingDonation && (
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="modern-input-group">
                      <label>Hb Level (g/dL)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Optional"
                        value={editingDonation.hb_level || ''}
                        onChange={e => setEditingDonation({ ...editingDonation, hb_level: e.target.value })}
                        className="modern-input-field"
                      />
                    </div>
                    <div className="modern-input-group">
                      <label>Blood Pressure</label>
                      <input
                        type="text"
                        placeholder="e.g. 120/80"
                        value={editingDonation.blood_pressure || ''}
                        onChange={e => setEditingDonation({ ...editingDonation, blood_pressure: e.target.value })}
                        className="modern-input-field"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-red-700 transition-all">Save Changes</button>
                </form>
              </div>
            </div>
          )
        }

        {
          showProfilePicModal && (
            <ProfilePicModal
              isOpen={showProfilePicModal}
              onClose={() => setShowProfilePicModal(false)}
              user={user}
              onUpdate={fetchDashboardData}
            />
          )
        }
        <BackToTop />
        <Chatbot user={user} stats={stats} />
      </div>
    </div>
  );
};

export default Dashboard;
