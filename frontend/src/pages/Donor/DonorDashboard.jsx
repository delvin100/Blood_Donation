import React, { useState, useEffect, useRef } from 'react';
import '../../assets/css/dashboard.css';
import { jsPDF } from 'jspdf';
import CompleteProfileModal from '../../components/modals/CompleteProfileModal';
import EditProfileModal from '../../components/modals/EditProfileModal';
import InfoModal from '../../components/modals/InfoModal';
import ProfilePicModal from '../../components/modals/ProfilePicModal';
import BackToTop from '../../components/common/BackToTop';
import Chatbot from '../../components/donor/Chatbot';
import ModernModal from '../../components/common/ModernModal';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

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
  const [modalInfo, setModalInfo] = useState(null);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  // Edit modals state
  const [editingDonation, setEditingDonation] = useState(null);
  const [urgentNeeds, setUrgentNeeds] = useState([]);
  const [reports, setReports] = useState([]);
  const [activeReportForPDF, setActiveReportForPDF] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);


  // Form states
  const [newDonation, setNewDonation] = useState({ date: '', units: 1, notes: '', hb_level: '', blood_pressure: '' });

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Modern Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    confirmText: 'Confirm',
    onConfirm: () => { },
    type: 'info'
  });

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

      // Auto-refresh reports to keep analysis section in sync
      fetchReports();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };




  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (!token) return;
      const res = await axios.get('/api/donor/reports', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data);
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  const generateReportPDF = async (report) => {
    setIsGeneratingPDF(true);
    setActiveReportForPDF(report);

    // Short delay to ensure state update and template rendering
    setTimeout(async () => {
      try {
        const html2canvas = (await import('html2canvas')).default;
        const template = document.getElementById('donor-report-template');

        const canvas = await html2canvas(template, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Medical_Report_${report.id || 'DR'}_${(data?.user?.full_name || 'Donor').replace(/\s+/g, '_')}.pdf`);
        toast.success('Medical Report Downloaded');
      } catch (err) {
        console.error("PDF Export failed", err);
        toast.error("Failed to generate professional PDF");
      } finally {
        setIsGeneratingPDF(false);
        setActiveReportForPDF(null);
      }
    }, 100);
  };

  useEffect(() => {
    fetchDashboardData();
    fetchNotifications();
    fetchUrgentNeeds();
    fetchReports();

    // Close notifications when clicking outside
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Polling for notifications and reports
    const interval = setInterval(() => {
      fetchNotifications();
      fetchReports();
    }, 30000); // 30s

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
    setModalConfig({
      title: `Delete ${type.charAt(0).toUpperCase() + type.slice(1)}?`,
      message: `Are you sure you want to permanently remove this ${type}? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        setIsModalOpen(false);
        try {
          const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
          const res = await fetch(`/api/donor/${type}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!res.ok) throw new Error(`Failed to delete ${type}`);
          toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`);
          fetchDashboardData();
        } catch (err) {
          toast.error(`Error: ${err.message}`);
        }
      }
    });
    setIsModalOpen(true);
  };


  const handleLogout = () => {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    window.location.href = '/login';
  };

  if (loading) return <div className="modern-bg flex items-center justify-center text-white text-2xl font-black">Loading...</div>;
  if (error) return <div className="modern-bg flex items-center justify-center text-red-200 text-2xl font-black">Error: {error}</div>;

  if (!data || !data.user) return <div className="modern-bg flex items-center justify-center text-white text-2xl font-black">Loading User Data...</div>;
  const { user, donations = [], stats = {}, memberships = [] } = data; /* Navigation Content Data with Reports included */

  // Calculate dynamic preparation score
  const getPreparationScore = () => {
    if (stats.isEligible) return 100;
    if (!stats.lastDonation || !stats.nextEligibleDate) return 0;

    const start = new Date(stats.lastDonation).getTime();
    const end = new Date(stats.nextEligibleDate).getTime();
    const now = new Date().getTime();

    const totalDuration = end - start;
    const elapsed = now - start;

    if (totalDuration <= 0) return 100;

    const percent = Math.floor((elapsed / totalDuration) * 100);
    return Math.min(100, Math.max(0, percent));
  };

  const preparationScore = getPreparationScore();

  const navigationContent = {
    'medical-reports': {
      title: 'My Medical Reports',
      content: (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="modern-card p-8 bg-blue-50/50 border border-blue-100 rounded-3xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-xl">
                <i className="fas fa-file-medical-alt"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-800">Health Records</h3>
                <p className="text-sm font-bold text-gray-500">View and download your official medical reports.</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Every time you donate, your blood is screened for health markers and infectious diseases.
              These reports are confidential and available for you to download.
              <b> Please consult a doctor if any parameter looks abnormal.</b>
            </p>
          </div>

          <div className="modern-card p-6 bg-white border border-gray-100 shadow-sm rounded-3xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">All Reports</h3>
            <div className="space-y-3">
              {reports.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">No reports found in your history.</p>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-all border border-gray-100 group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                        <i className="fas fa-file-pdf"></i>
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-800">{report.org_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-gray-400">{new Date(report.test_date).toLocaleDateString()}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          <span className="text-[10px] uppercase font-bold text-gray-400">{report.org_city}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => generateReportPDF(report)}
                      className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                    >
                      Download
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )
    },
    'my-organizations': {
      title: 'My Organizations',
      content: (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="modern-card p-8 bg-blue-50/50 border border-blue-100 rounded-3xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-xl">
                <i className="fas fa-building"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-800">Affiliated Facilities</h3>
                <p className="text-sm font-bold text-gray-500">View and manage your organization memberships.</p>
              </div>
            </div>
          </div>

          <div className="modern-card p-6 bg-white border border-gray-100 shadow-sm rounded-3xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Joined Organizations</h3>
            <div className="space-y-4">
              {memberships.length === 0 ? (
                <div className="py-12 text-center">
                  <i className="fas fa-hospital text-gray-200 text-4xl mb-3"></i>
                  <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No Memberships</p>
                </div>
              ) : (
                memberships.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between p-5 hover:bg-blue-50/30 rounded-2xl transition-all border border-gray-100 group border-l-4 border-l-blue-500">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100/50 text-blue-600 rounded-xl flex items-center justify-center text-xl transition-colors group-hover:bg-blue-600 group-hover:text-white">
                        <i className={m.org_type === 'Hospital' ? 'fas fa-hospital' : 'fas fa-clinic-medical'}></i>
                      </div>
                      <div>
                        <h4 className="font-black text-gray-800 tracking-tight">{m.org_name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">{m.org_type}</span>
                          <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{m.org_city}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Joined On</p>
                      <p className="text-sm font-black text-gray-900 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">{formatDateHyphen(m.joined_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )
    },
    'analysis': {
      title: 'Health Performance Center',
      content: (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* Top Row: Quick Vitals & Readiness */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Latest Vitals Snapshot */}
            <div className="lg:col-span-2 modern-card p-6 bg-white border border-gray-100 shadow-sm rounded-3xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-gray-800 tracking-tight flex items-center gap-2">
                  <i className="fas fa-heartbeat text-red-500"></i> Latest Vitals
                </h3>
                <span className="text-[10px] font-black bg-gray-50 text-gray-400 px-3 py-1 rounded-full uppercase">
                  Last Checked: {reports.length > 0 ? formatDateHyphen(reports[0].test_date) : 'N/A'}
                </span>
              </div>

              {reports.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Blood Pressure', value: reports[0].blood_pressure, icon: 'fa-compress-arrows-alt', bgClass: 'bg-blue-50', textClass: 'text-blue-500' },
                    { label: 'Hemoglobin', value: `${reports[0].hb_level} g/dL`, icon: 'fa-tint', bgClass: 'bg-red-50', textClass: 'text-red-500' },
                    { label: 'Pulse Rate', value: `${reports[0].pulse_rate} bpm`, icon: 'fa-heart-pulse', bgClass: 'bg-emerald-50', textClass: 'text-emerald-500' },
                    { label: 'Body Weight', value: `${reports[0].weight} kg`, icon: 'fa-weight', bgClass: 'bg-purple-50', textClass: 'text-purple-500' },
                    { label: 'Temperature', value: `${reports[0].temperature} °C`, icon: 'fa-thermometer-half', bgClass: 'bg-orange-50', textClass: 'text-orange-500' }
                  ].map((vital, i) => (
                    <div key={i} className="bg-gray-50/50 border border-gray-100 p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all group">
                      <div className={`w-8 h-8 rounded-lg ${vital.bgClass} ${vital.textClass} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                        <i className={`fas ${vital.icon} text-xs`}></i>
                      </div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{vital.label}</p>
                      <p className="text-base font-black text-gray-800 mt-1">{vital.value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                  <p className="text-sm font-black text-gray-300 uppercase tracking-widest">No clinical data available</p>
                </div>
              )}
            </div>

            {/* Health Readiness Card */}
            <div className="modern-card p-6 bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
              <div className="absolute top-4 right-4 text-6xl text-gray-50 opacity-50 rotate-12 pointer-events-none">
                <i className={`fas ${stats.isEligible ? 'fa-check-circle' : 'fa-hourglass-half'}`}></i>
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                  Current Status
                  <i className={`fas ${stats.isEligible ? 'fa-check-circle text-emerald-500' : 'fa-hourglass-half text-orange-500'}`}></i>
                </p>
                <h3 className="text-2xl font-black text-gray-900">{stats.isEligible ? 'Fit to Save' : 'In Recovery'}</h3>
              </div>
              <div className="mt-8 relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Preparation Score</span>
                  <span className="text-sm font-black text-red-500">{preparationScore}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 transition-all duration-1000"
                    style={{ width: `${preparationScore}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Row: Safety Clearance & Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Safety Clearance Status */}
            <div className="modern-card p-6 bg-white border border-gray-100 shadow-sm rounded-3xl">
              <h3 className="font-black text-gray-800 tracking-tight flex items-center gap-2 mb-6">
                <i className="fas fa-user-shield text-emerald-500"></i> Safety Clearance
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'HIV Status', key: 'hiv_status' },
                  { label: 'Hepatitis B', key: 'hepatitis_b' },
                  { label: 'Hepatitis C', key: 'hepatitis_c' },
                  { label: 'Syphilis', key: 'syphilis' },
                  { label: 'Malaria', key: 'malaria' }
                ].map((item, i) => {
                  const result = reports.length > 0 ? reports[0][item.key] : 'Not Tested';
                  const isNegative = result === 'Negative';
                  return (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl border border-gray-100/50">
                      <span className="text-[11px] font-bold text-gray-600">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase ${isNegative ? 'text-emerald-600' : 'text-red-600'}`}>
                          {result}
                        </span>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${isNegative ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                          <i className={`fas ${isNegative ? 'fa-check' : 'fa-times'}`}></i>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] text-gray-400 mt-4 leading-relaxed italic">
                * All infectious disease screenings are conducted under strict medical protocols. Results shown reflect latest screening.
              </p>
            </div>

            {/* Hemoglobin Performance Chart */}
            <div className="lg:col-span-2 modern-card p-6 bg-white border border-gray-100 shadow-sm rounded-3xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-black text-gray-800 tracking-tight flex items-center gap-2">
                    <i className="fas fa-chart-area text-purple-500"></i> Hemoglobin Trend
                  </h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Clinical Oxygen Capacity</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] font-black bg-purple-50 text-purple-600 px-3 py-1 rounded-full uppercase">Optimal: 12.5 - 18.0</span>
                </div>
              </div>
              <div className="h-64 w-full">
                {reports.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[...reports].reverse()}>
                      <defs>
                        <linearGradient id="colorHbCenter" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="test_date"
                        tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={['dataMin - 2', 'dataMax + 2']}
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                  {new Date(label).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                  <p className="text-sm font-black text-gray-800">
                                    Hemoglobin: <span className="text-purple-600 text-lg">{payload[0].value}</span> g/dL
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="hb_level" stroke="#8884d8" strokeWidth={4} fillOpacity={1} fill="url(#colorHbCenter)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-300 italic text-sm">Not enough data to generate trend analysis</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    },
    'donation-history': {
      title: 'Donation History',
      content: (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="modern-card p-8 bg-red-50/50 border border-red-100 rounded-3xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-xl">
                <i className="fas fa-history"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-800">Your Journey</h3>
                <p className="text-sm font-bold text-gray-500">A full timeline of your life-saving contributions.</p>
              </div>
            </div>
          </div>

          <div className="modern-card p-6 bg-white border border-gray-100 shadow-sm rounded-3xl">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Full Timeline</h3>
            <div className="space-y-3">
              {donations.length === 0 ? (
                <div className="py-12 text-center">
                  <i className="fas fa-tint text-gray-200 text-4xl mb-3"></i>
                  <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No Records Found</p>
                </div>
              ) : (
                donations.map((h) => {
                  const isVerified = !!h.org_name;
                  return (
                    <div key={h.id} className="flex items-center justify-between p-4 hover:bg-red-50/30 rounded-2xl transition-all border border-gray-100 group">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm ${isVerified ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-red-100 group-hover:text-red-500'}`}>
                          <i className="fas fa-tint"></i>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-gray-800">{formatDateHyphen(h.date)}</p>
                          </div>
                          <p className="text-xs font-bold text-gray-700 mt-0.5 flex items-center gap-1.5">
                            {h.org_name ? (
                              <>
                                <i className="fas fa-check-circle text-red-500"></i>
                                {`Verified by ${h.org_name}`}
                              </>
                            ) : (h.notes || 'Manual Entry')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-gray-900">{h.units} {h.units > 1 ? 'Units' : 'Unit'}</p>
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-1">Donated</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )
    },
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
            {[
              { name: "Dr. Vikram Sethi", role: "Co-Founder & CEO", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=2070&auto=format&fit=crop", quote: "Believing in the power of humanity to save lives." },
              { name: "Ananya Sharma", role: "Co-Founder & CTO", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=2070&auto=format&fit=crop", quote: "Technology is our bridge to a blood-scarcity free world." }
            ].map((f, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-lg border-t-4 border-red-500 hover:-translate-y-2 transition-transform duration-300">
                <div className="w-24 h-24 mx-auto mb-4 relative">
                  <img src={f.img} alt={f.name} className="w-full h-full object-cover rounded-full shadow-md border-4 border-white" />
                </div>
                <h4 className="text-center text-xl font-bold text-gray-800">{f.name}</h4>
                <p className="text-center text-red-500 font-medium text-sm mb-3">{f.role}</p>
                <p className="text-center text-gray-500 text-sm italic">"{f.quote}"</p>
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
              {['React', 'Node.js', 'MySQL', 'Tailwind', 'Maps API'].map(tag => (
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
      content: <div className="bg-white rounded-xl shadow-lg overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar"><table className="w-full text-sm text-left"><thead className="bg-gray-100 text-gray-700 sticky top-0"><tr><th className="p-3">Type</th><th className="p-3">Give To</th><th className="p-3">Receive From</th></tr></thead><tbody className="divide-y">{[
        { t: 'O-', g: 'All', r: 'O-' }, { t: 'O+', g: 'O+, A+, B+, AB+', r: 'O+, O-' }, { t: 'A-', g: 'A+, A-, AB+, AB-', r: 'A-, O-' }, { t: 'A+', g: 'A+, AB+', r: 'A+, A-, O+, O-' },
        { t: 'B-', g: 'B+, B-, AB+, AB-', r: 'B-, O-' }, { t: 'B+', g: 'B+, AB+', r: 'B+, B-, O+, O-' }, { t: 'AB-', g: 'AB+, AB-', r: 'AB-, A-, B-, O-' }, { t: 'AB+', g: 'AB+', r: 'All' },
        { t: 'A1-', g: 'A1+, A1-, A1B+, A1B-, AB+, AB-', r: 'A1-, O-' }, { t: 'A1+', g: 'A1+, A1B+, AB+', r: 'A1+, A1-, O+, O-' },
        { t: 'A1B-', g: 'A1B+, A1B-, AB+, AB-', r: 'A1B-, A1-, B-, O-' }, { t: 'A1B+', g: 'A1B+, AB+', r: 'A1+, A1-, A1B+, A1B-, B+, B-, O+, O-' },
        { t: 'A2-', g: 'A1+, A1-, A2+, A2-, A1B+, A1B-, A2B+, A2B-, AB+, AB-', r: 'A2-, O-' }, { t: 'A2+', g: 'A1+, A2+, A1B+, A2B+, AB+', r: 'A2+, A2-, O+, O-' },
        { t: 'A2B-', g: 'A2B+, A2B-, AB+, AB-', r: 'A2B-, A2-, B-, O-' }, { t: 'A2B+', g: 'A2B+, AB+', r: 'A2+, A2-, A2B+, A2B-, B+, B-, O+, O-' },
        { t: 'Bombay Blood Group', g: 'All', r: 'Bombay Blood Group' }, { t: 'INRA', g: 'All', r: 'INRA' }
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
          <div className="relative rounded-2xl overflow-hidden group shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10"></div>
            <div
              className="h-64 bg-cover bg-center group-hover:scale-110 transition-transform duration-700"
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=2070&auto=format&fit=crop')` }}
            ></div>
            <div className="absolute bottom-0 left-0 p-8 z-20 text-white">
              <span className="bg-red-600 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3 inline-block shadow-lg">Featured Story</span>
              <h4 className="text-2xl font-black mb-2 tracking-tight">"A stranger saved my daughter."</h4>
              <p className="text-sm font-medium opacity-90 line-clamp-2 max-w-md">When 5-year-old Ananya needed rare AB- blood, a donor from eBloodBank traveled 50km in the rain to save her.</p>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] text-center shadow-xl border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
            <i className="fas fa-quote-left text-4xl text-red-100 mb-4 block"></i>
            <p className="text-gray-700 italic text-lg font-medium mb-6 relative z-10">"I never knew my blood could be someone's lifeline. It's the best feeling in the world."</p>
            <div className="flex items-center justify-center gap-4 relative z-10">
              <img
                src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=2070&auto=format&fit=crop"
                className="w-14 h-14 rounded-full object-cover border-2 border-red-500 shadow-md"
                alt="Rahul Sharma"
              />
              <div className="text-left">
                <p className="font-black text-gray-900 text-base">Rahul Sharma</p>
                <p className="text-xs font-bold text-red-500 uppercase tracking-widest">Regular Donor (15+ donations)</p>
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
    },
    'urgent-needs': {
      title: 'Urgent Needs',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {urgentNeeds.length === 0 ? (
            <div className="md:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-100 p-12 text-center group">
              {/* Background Accents */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100/50 rounded-full blur-3xl -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-100/50 rounded-full blur-3xl translate-y-16 -translate-x-16"></div>

              <div className="relative z-10">
                <div className="w-24 h-24 bg-white/80 backdrop-blur-xl rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-200/50 group-hover:scale-110 transition-transform duration-500">
                  <i className="fas fa-shield-alt text-5xl text-emerald-500"></i>
                </div>

                <h3 className="text-3xl font-black text-emerald-900 tracking-tight mb-2">All Clear!</h3>
                <p className="text-sm font-bold text-emerald-600/80 uppercase tracking-widest mb-6">Community is Safe</p>
                <p className="text-emerald-700/70 font-medium max-w-md mx-auto leading-relaxed">
                  There are no urgent blood requirements in your network at the moment
                </p>
              </div>
            </div>
          ) : (
            urgentNeeds.map((need) => (
              <div key={need.id} className="relative overflow-hidden rounded-[2.5rem] bg-white shadow-2xl shadow-blue-900/10 border border-white/50 group/card transition-all duration-500 hover:scale-[1.02]">
                {/* Glassmorphism Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white/50 to-purple-50/50 opacity-100 group-hover/card:opacity-90 transition-opacity"></div>

                {/* Decorative Blur Circles */}
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-red-500/10 rounded-full blur-3xl group-hover/card:bg-red-500/20 transition-colors"></div>
                <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl group-hover/card:bg-blue-500/20 transition-colors"></div>

                <div className="relative p-8 z-10">
                  {/* Header: Blood Group & Hospital */}
                  <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-6">
                      {/* Hero Blood Group Badge */}
                      <div className="relative">
                        <div className={`w-24 h-24 rounded-[2rem] flex flex-col items-center justify-center shadow-xl shadow-red-500/20 z-10 relative 
                          ${need.blood_group === user.blood_type ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white' : 'bg-white text-gray-900'}`}>
                          <span className="text-4xl font-black tracking-tighter leading-none mb-1">{need.blood_group}</span>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${need.blood_group === user.blood_type ? 'text-white/80' : 'text-gray-400'}`}>Group</span>
                        </div>
                        {need.blood_group === user.blood_type && (
                          <div className="absolute inset-0 bg-red-500/30 rounded-[2rem] blur-lg animate-pulse"></div>
                        )}
                      </div>

                      <div>
                        {need.is_member > 0 && (
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black rounded-lg uppercase tracking-widest mb-2">
                            <i className="fas fa-building mr-1.5"></i>My Organization
                          </span>
                        )}
                        <h4 className="font-black text-gray-900 text-2xl tracking-tight leading-tight mb-2">
                          {need.org_name}
                        </h4>
                        <div className="flex items-center gap-2 text-gray-500">
                          <i className="fas fa-location-dot text-red-500 text-sm"></i>
                          <span className="text-xs font-bold uppercase tracking-wide">{need.org_city}</span>
                        </div>
                      </div>
                    </div>

                    {need.blood_group === user.blood_type && (
                      <div className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-black rounded-xl shadow-lg shadow-red-500/30 animate-bounce">
                        MATCH FOUND!
                      </div>
                    )}
                  </div>

                  {/* Message Box */}
                  <div className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white shadow-sm mb-8 flex gap-4 items-start">
                    <i className="fas fa-quote-left text-3xl text-rose-500/20 shrink-0"></i>
                    <p className="text-sm text-gray-700 font-bold leading-relaxed italic pt-1">
                      {need.description || 'Critically low on stock. Immediate donation requested to save lives.'}
                    </p>
                  </div>

                  {/* Footer: Stats & Action */}
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex flex-col">
                      <span className="text-5xl font-black text-gray-900 leading-none tracking-tighter">{need.units_required}</span>
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Units Needed</span>
                    </div>

                    <a
                      href={`tel:${need.org_phone || '0000000000'}`}
                      className="flex-1 py-5 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-sm uppercase tracking-[0.1em] shadow-2xl shadow-gray-900/20 flex items-center justify-center gap-4 transition-all transform hover:-translate-y-1 active:scale-95 group/btn"
                    >
                      <i className="fas fa-phone-volume text-lg group-hover/btn:animate-wiggle"></i>
                      <span>{need.org_phone || 'Call Now'}</span>
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )
    }
  };

  const openInfo = (key) => {
    const fullScreenKeys = ['medical-reports', 'my-organizations', 'donation-history', 'analysis', 'urgent-needs'];
    const content = navigationContent[key];

    if (fullScreenKeys.includes(key)) {
      setActiveInfo(content);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setModalInfo({ title: content.title, content: content.content });
    }
  };

  // Dynamic Rank Calculation
  const donationCount = data?.stats?.totalDonations || 0;
  const getRankInfo = (count) => {
    if (count >= 11) return { current: 'Platinum', next: 'Champion', needed: 0, progress: 100, icon: 'fa-crown', color: 'text-purple-600', bg: 'from-purple-50', border: 'border-purple-500', barInfo: 'bg-purple-500' };
    if (count >= 6) return { current: 'Gold', next: 'Platinum', needed: 11 - count, progress: ((count - 6) / 5) * 100, icon: 'fa-trophy', color: 'text-yellow-500', bg: 'from-yellow-50', border: 'border-yellow-500', barInfo: 'bg-yellow-500' };
    if (count >= 3) return { current: 'Silver', next: 'Gold', needed: 6 - count, progress: ((count - 3) / 3) * 100, icon: 'fa-medal', color: 'text-gray-400', bg: 'from-gray-50', border: 'border-gray-400', barInfo: 'bg-gray-400' };
    return { current: 'Bronze', next: 'Silver', needed: 3 - count, progress: (count / 3) * 100, icon: 'fa-shield-alt', color: 'text-orange-600', bg: 'from-orange-50', border: 'border-orange-500', barInfo: 'bg-orange-500' };
  };
  const rankInfo = getRankInfo(donationCount);

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
                  <i className="fas fa-bell text-lg"></i>
                  {(data?.stats?.unreadNotifications > 0 || urgentNeeds.length > 0) && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-white transform translate-x-1 -translate-y-1">
                      {(data?.stats?.unreadNotifications || 0) + urgentNeeds.length}
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
                      {notifications.length === 0 && urgentNeeds.length === 0 ? (
                        <div className="py-16 text-center">
                          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fas fa-ghost text-gray-200 text-2xl"></i>
                          </div>
                          <p className="text-xs font-black text-gray-300 uppercase tracking-widest">No Alerts</p>
                        </div>
                      ) : (
                        <>
                          {/* Urgent Needs in Notifications */}
                          {urgentNeeds.length > 0 && (
                            <div className="mb-4">
                              <h4 className="px-6 text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Urgent Requests</h4>
                              {urgentNeeds.slice(0, 3).map(need => (
                                <div key={`urgent-${need.id}`} className="px-4 mb-2">
                                  <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-4 cursor-pointer hover:bg-red-100 transition-colors" onClick={() => openInfo('urgent-needs')}>
                                    <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-200">
                                      <span className="text-xs font-black">{need.blood_group}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-bold text-gray-900 text-xs truncate">{need.org_name}</h5>
                                      <p className="text-[10px] text-gray-500 line-clamp-1">{need.org_city} • {need.units_required} Units</p>
                                    </div>
                                    {need.blood_group === user.blood_type && (
                                      <span className="px-2 py-1 bg-red-600 text-white text-[8px] font-black rounded-lg uppercase">Match</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                              <div className="px-6">
                                <div className="h-px bg-gray-100 my-2"></div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Recent Alerts</h4>
                              </div>
                            </div>
                          )}

                          {notifications.map(n => (
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
                          ))}
                        </>
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
                    label: 'Home',
                    items: [
                      { key: 'dashboard', icon: 'fa-th-large', label: 'Dashboard Overview', color: 'gray', isHome: true },
                    ]
                  },
                  {
                    label: 'My Records',
                    items: [
                      { key: 'medical-reports', icon: 'fa-file-medical-alt', label: 'Medical Reports', color: 'red' },
                      { key: 'my-organizations', icon: 'fa-building', label: 'My Organizations', color: 'blue' },
                      { key: 'urgent-needs', icon: 'fa-exclamation-circle', label: 'Urgent Needs', color: 'red', urgent: urgentNeeds.length > 0 },
                      { key: 'donation-history', icon: 'fa-history', label: 'Donation History', color: 'blue' },
                      { key: 'analysis', icon: 'fa-chart-pie', label: 'Health Analysis', color: 'purple' },
                    ]
                  },
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
                              onClick={() => item.isHome ? setActiveInfo(null) : openInfo(item.key)}
                              className={`w-full text-left group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${item.isHome && !activeInfo ? 'bg-red-50' : 'hover:bg-gray-50'
                                } ${item.urgent ? 'bg-red-50 hover:bg-red-100' : ''}`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shadow-sm ${item.isHome && !activeInfo ? 'bg-red-600 text-white' : item.urgent ? 'bg-red-500 text-white' : `bg-${item.color}-50 text-${item.color}-500 group-hover:scale-110 duration-300`
                                }`}>
                                <i className={`fas ${item.icon} text-md`}></i>
                              </div>
                              <span className={`font-bold text-sm ${item.isHome && !activeInfo ? 'text-red-700' : item.urgent ? 'text-red-700' : 'text-gray-700 group-hover:text-gray-900'}`}>
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
            {activeInfo ? (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                {/* Navigation Detail Header */}
                <div className="modern-card p-6 bg-white shadow-xl border-b-4 border-red-600 mb-8 flex items-center justify-between sticky top-0 z-40">
                  <div className="flex items-center gap-4">
                    <div>
                      <h2 className="text-3xl font-black text-gray-800 tracking-tight">{activeInfo.title}</h2>
                    </div>
                  </div>
                </div>

                {/* Navigation Detail Content */}
                <div className="min-h-[60vh]">
                  {activeInfo.content}
                </div>
              </div>
            ) : (
              <>
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
                  <div className={`modern-card p-8 flex flex-col items-center justify-center text-center group hover:scale-[1.02] transition-all bg-gradient-to-br ${rankInfo.bg} to-white border-b-4 ${rankInfo.border}`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg bg-white`}>
                      <i className={`fas ${rankInfo.icon} ${rankInfo.color} text-3xl`}></i>
                    </div>
                    <span className="text-4xl font-black text-gray-800 mb-1">{rankInfo.current}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${rankInfo.color}`}>Rank Level</span>

                    <div className="w-full mt-4">
                      <div className="flex justify-between text-[9px] uppercase font-black text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(rankInfo.progress)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${rankInfo.barInfo} transition-all duration-1000`} style={{ width: `${rankInfo.progress}%` }}></div>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-2 font-bold">
                        {rankInfo.needed > 0 ? `${rankInfo.needed} donations to ${rankInfo.next}` : 'Maximum Rank Achieved!'}
                      </p>
                    </div>
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
                  <div className="modern-card p-7 flex flex-col items-start">
                    <div className="w-full flex justify-center mb-5">
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

                    <h3 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-2">
                      <i className="fas fa-user-circle text-red-600"></i> Profile
                    </h3>

                    <div className="w-full space-y-4 font-bold text-gray-600 mb-8">
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
                            <i className="fas fa-history mr-1"></i> Next eligibility: {stats.nextEligibleDate ? formatDateHyphen(stats.nextEligibleDate) : 'Calculating...'}
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
                <div className="flex flex-col gap-8 mt-8">
                  {/* Row 1: Urgent Needs & Blood Synergy */}
                  <div className="grid lg:grid-cols-2 gap-8 items-stretch">
                    {/* Enhanced Urgent Needs Feed */}
                    <div className="modern-card h-full p-8 bg-white border-2 border-rose-100 shadow-2xl shadow-rose-500/5 rounded-[3rem] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>

                      <h3 className="text-2xl font-black text-gray-900 mb-8 flex items-center justify-between relative z-10">
                        <span className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
                            <i className="fas fa-bullhorn text-xl"></i>
                          </div>
                          <div className="flex flex-col">
                            <span className="tracking-tight">Urgent Needs</span>
                            <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] leading-none mt-1">Active Broadcasts</span>
                          </div>
                        </span>
                        <div className="flex items-center gap-2 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                          <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Live Pulse</span>
                        </div>
                      </h3>

                      {urgentNeeds.length === 0 ? (
                        <div className="md:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-100 p-12 text-center group">
                          {/* Background Accents */}
                          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100/50 rounded-full blur-3xl -translate-y-16 translate-x-16"></div>
                          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-100/50 rounded-full blur-3xl translate-y-16 -translate-x-16"></div>

                          <div className="relative z-10">
                            <div className="w-24 h-24 bg-white/80 backdrop-blur-xl rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-200/50 group-hover:scale-110 transition-transform duration-500">
                              <i className="fas fa-shield-alt text-5xl text-emerald-500"></i>
                            </div>

                            <h3 className="text-3xl font-black text-emerald-900 tracking-tight mb-2">All Clear!</h3>
                            <p className="text-sm font-bold text-emerald-600/80 uppercase tracking-widest mb-6">Community is Safe</p>
                            <p className="text-emerald-700/70 font-medium max-w-md mx-auto leading-relaxed">
                              There are no urgent blood requirements in your network at the moment.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                          {urgentNeeds.slice(0, 1).map((need) => (
                            <div key={need.id} className={`relative group/item rounded-[2.5rem] border p-6 transition-all duration-500 ${need.blood_group === user.blood_type ? 'bg-rose-50/50 border-rose-200 shadow-xl shadow-rose-500/5' : 'bg-white border-gray-100 hover:border-rose-100'}`}>
                              <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-5">
                                  <div className={`w-16 h-16 rounded-[1.5rem] flex flex-col items-center justify-center shadow-2xl font-black group-hover/item:scale-110 transition-all duration-500 ${need.blood_group === user.blood_type ? 'bg-rose-600 text-white shadow-rose-300' : 'bg-gray-900 text-white shadow-gray-200'}`}>
                                    <span className="text-2xl leading-none">{need.blood_group}</span>
                                    <span className="text-[8px] uppercase tracking-tighter opacity-70 mt-1">GROUP</span>
                                  </div>
                                  <div>
                                    <h4 className="font-black text-gray-800 text-lg tracking-tight mb-1 flex items-center gap-2">
                                      {need.org_name}
                                      {need.is_member > 0 && (
                                        <span className="px-2.5 py-1 bg-blue-100 text-blue-600 text-[8px] font-black rounded-lg uppercase tracking-widest">My Org</span>
                                      )}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                      <div className="px-2 py-0.5 bg-gray-100 rounded-md flex items-center gap-1.5">
                                        <i className="fas fa-location-dot text-[10px] text-rose-500"></i>
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{need.org_city}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {need.blood_group === user.blood_type && (
                                  <div className="flex flex-col items-center">
                                    <div className="px-3 py-1.5 bg-rose-600 text-white text-[10px] font-black rounded-xl shadow-lg shadow-rose-200 animate-bounce ring-4 ring-rose-50">
                                      MATCH!
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-white shadow-sm mb-6">
                                <p className="text-xs text-gray-600 font-bold leading-relaxed italic line-clamp-3">
                                  <i className="fas fa-quote-left text-rose-200 mr-2"></i>
                                  {need.description || 'Critically low on stock. Immediate donation requested to save lives.'}
                                </p>
                              </div>

                              <div className="flex items-center justify-between gap-6">
                                <div className="flex items-end gap-2">
                                  <span className="text-3xl font-black text-gray-900 leading-none">{need.units_required}</span>
                                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest pb-0.5">Units Needed</span>
                                </div>
                                <a href={`tel:${need.org_phone || '0000000000'}`} className="flex-1 py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-[0.1em] shadow-xl shadow-gray-200 flex items-center justify-center gap-3 transition-all transform active:scale-95 group/btn">
                                  <i className="fas fa-phone-volume group-hover/btn:animate-wiggle text-sm"></i>
                                  <span className="mt-0.5">{need.org_phone || 'Connect Now'}</span>
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Compatibility Section */}
                    <div className="modern-card h-full p-8 bg-white border border-gray-100 shadow-sm rounded-[3rem] group">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-[1.5rem] flex items-center justify-center shadow-inner group-hover:rotate-6 transition-transform duration-500">
                            <i className="fas fa-heartbeat text-2xl"></i>
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Blood Synergy</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Network Compatibility</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-3xl font-black text-red-600 leading-none">{user.blood_type || '??'}</span>
                          <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mt-1">Your Registry</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-emerald-50/30 border border-emerald-100/50 p-5 rounded-[2rem] hover:bg-emerald-50/50 transition-colors">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-sm">
                              <i className="fas fa-hand-holding-heart"></i>
                            </div>
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Ideal Recipient</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const map = {
                                'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+', 'A1-', 'A1+', 'A1B-', 'A1B+', 'A2-', 'A2+', 'A2B-', 'A2B+'],
                                'O+': ['O+', 'A+', 'B+', 'AB+', 'A1+', 'A1B+', 'A2+', 'A2B+'],
                                'A-': ['A-', 'A+', 'AB-', 'AB+', 'A1-', 'A1+', 'A1B-', 'A1B+', 'A2-', 'A2+', 'A2B-', 'A2B+'],
                                'A+': ['A+', 'AB+', 'A1+', 'A1B+', 'A2+', 'A2B+'],
                                'B-': ['B-', 'B+', 'AB-', 'AB+', 'A1B-', 'A1B+', 'A2B-', 'A2B+'],
                                'B+': ['B+', 'AB+', 'A1B+', 'A2B+'],
                                'AB-': ['AB-', 'AB+', 'A1B-', 'A1B+', 'A2B-', 'A2B+'],
                                'AB+': ['AB+', 'A1B+', 'A2B+'],
                                'A1-': ['A1-', 'A1+', 'A1B-', 'A1B+', 'AB-', 'AB+'],
                                'A1+': ['A1+', 'A1B+', 'AB+'],
                                'A1B-': ['A1B-', 'A1B+', 'AB-', 'AB+'],
                                'A1B+': ['A1B+', 'AB+'],
                                'A2-': ['A1-', 'A1+', 'A2-', 'A2+', 'A1B-', 'A1B+', 'A2B-', 'A2B+', 'AB-', 'AB+'],
                                'A2+': ['A1+', 'A2+', 'A1B+', 'A2B+', 'AB+'],
                                'A2B-': ['A2B-', 'A2B+', 'AB-', 'AB+'],
                                'A2B+': ['A2B+', 'AB+'],
                                'Bombay Blood Group': ['All Groups'],
                                'INRA': ['All Groups']
                              };
                              return map[user.blood_type]?.map(t => (
                                <span key={t} className="px-3 py-1.5 bg-white border border-emerald-100 text-emerald-600 rounded-xl text-[10px] font-black shadow-sm">{t}</span>
                              )) || <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Scanning Type...</span>;
                            })()}
                          </div>
                        </div>

                        <div className="bg-blue-50/30 border border-blue-100/50 p-5 rounded-[2rem] hover:bg-blue-50/50 transition-colors">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-sm">
                              <i className="fas fa-shield-alt"></i>
                            </div>
                            <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Safe Source</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const map = {
                                'O-': ['O-'],
                                'O+': ['O+', 'O-'],
                                'A-': ['A-', 'O-'],
                                'A+': ['A+', 'A-', 'O+', 'O-'],
                                'B-': ['B-', 'O-'],
                                'B+': ['B+', 'B-', 'O+', 'O-'],
                                'AB-': ['AB-', 'A-', 'B-', 'O-'],
                                'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
                                'A1-': ['A1-', 'O-'],
                                'A1+': ['A1+', 'A1-', 'O+', 'O-'],
                                'A1B-': ['A1B-', 'A1-', 'B-', 'O-'],
                                'A1B+': ['A1B+', 'A1B-', 'A1+', 'A1-', 'B+', 'B-', 'O+', 'O-'],
                                'A2-': ['A2-', 'O-'],
                                'A2+': ['A2+', 'A2-', 'O+', 'O-'],
                                'A2B-': ['A2B-', 'A2-', 'B-', 'O-'],
                                'A2B+': ['A2B+', 'A2B-', 'A2+', 'A2-', 'B+', 'B-', 'O+', 'O-'],
                                'Bombay Blood Group': ['Bombay Blood Group'],
                                'INRA': ['INRA']
                              };
                              return map[user.blood_type]?.map(t => (
                                <span key={t} className="px-3 py-1.5 bg-white border border-blue-100 text-blue-600 rounded-xl text-[10px] font-black shadow-sm">{t}</span>
                              )) || <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Scanning Type...</span>;
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 p-5 bg-gray-50 rounded-[2rem] flex items-center gap-5 border border-gray-100">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                          <i className="fas fa-lightbulb text-amber-400 text-xl"></i>
                        </div>
                        <p className="text-[11px] text-gray-500 font-bold italic leading-relaxed">
                          {user.blood_type === 'O-' ? 'Universal Donor: Your blood can be used in almost any emergency situation. You are a true lifesaver!' :
                            user.blood_type === 'AB+' ? 'Universal Recipient: You can safely receive blood from almost any donor. Your donations are still vital for AB+ patients!' :
                              'Did you know? Every donation you make can be separated into components to save up to three distinct lives.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Donation History & My Organizations */}
                  <div className="grid lg:grid-cols-2 gap-8 items-stretch">
                    {/* Donation History Card */}
                    <div className="modern-card h-full p-8 bg-white border border-gray-100 shadow-sm rounded-[2.5rem]">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                            <i className="fas fa-history"></i>
                          </div>
                          Donation History
                        </h2>
                        {donations.length > 0 && (
                          <button onClick={() => openInfo('donation-history')} className="text-[10px] font-black uppercase tracking-widest bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 px-4 py-2 rounded-xl transition-all">
                            See All
                          </button>
                        )}
                      </div>

                      {donations.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                          <i className="fas fa-heart text-gray-200 text-4xl mb-4"></i>
                          <p className="text-gray-400 font-bold">No donations yet.</p>
                          <p className="text-[10px] text-gray-300 mt-1 uppercase tracking-widest font-black text-center">Your legacy starts here</p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                          {donations.slice(0, 1).map((h) => (
                            <div key={h.id} className="group bg-white border border-gray-100 rounded-[2rem] p-5 hover:border-red-100 hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300 border-l-4 border-l-red-500">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition-transform">
                                    <i className="fas fa-tint"></i>
                                  </div>
                                  <div>
                                    <p className="font-black text-gray-900 text-lg leading-none mb-1">{formatDateHyphen(h.date)}</p>
                                    <div className="flex items-center gap-2">
                                      <i className="fas fa-building text-[10px] text-gray-300"></i>
                                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                                        {h.org_name || 'Self-Reported'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="bg-emerald-50 text-emerald-600 text-xs font-black px-3 py-1.5 rounded-xl border border-emerald-100">
                                    {h.units} {h.units > 1 ? 'UNITS' : 'UNIT'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Joined Organizations Card */}
                    <div className="modern-card h-full p-8 bg-white border border-gray-100 shadow-sm rounded-[3rem]">
                      <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <i className="fas fa-hospital"></i>
                          </div>
                          My Organizations
                        </h2>
                        {memberships?.length > 0 && (
                          <button onClick={() => openInfo('my-organizations')} className="text-[10px] font-black uppercase tracking-widest bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-500 px-4 py-2 rounded-xl transition-all">
                            Manage
                          </button>
                        )}
                      </div>

                      {memberships?.length === 0 ? (
                        <div className="bg-gray-50 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-gray-100">
                          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-gray-200/50">
                            <i className="fas fa-hospital-user text-gray-200 text-4xl"></i>
                          </div>
                          <p className="text-gray-400 font-black uppercase text-xs tracking-widest">No Memberships</p>
                          <p className="text-[10px] text-gray-300 mt-2 font-bold uppercase tracking-tighter text-center">Visit a hospital to get verified</p>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          {memberships.slice(0, 1).map((m, idx) => (
                            <div key={idx} className="bg-gray-50/50 border border-gray-100 rounded-[2rem] p-5 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 group/org">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                  <div className="w-14 h-14 bg-white text-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover/org:scale-110 transition-transform">
                                    <i className={m.org_type === 'Hospital' ? 'fas fa-hospital' : 'fas fa-clinic-medical'}></i>
                                  </div>
                                  <div>
                                    <h4 className="font-black text-gray-900 tracking-tight">{m.org_name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-md">{m.org_type}</span>
                                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{m.org_city}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1">Status</p>
                                  <span className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-black rounded-lg shadow-lg shadow-emerald-200">VERIFIED</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        {showCompleteProfile && <CompleteProfileModal onClose={() => setShowCompleteProfile(false)} onSuccess={fetchDashboardData} user={user} />}
        {showEditProfile && <EditProfileModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} user={user} onUpdate={fetchDashboardData} />}
        {modalInfo && <InfoModal onClose={() => setModalInfo(null)} title={modalInfo.title} content={modalInfo.content} />}

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

        {/* HIDDEN PDF TEMPLATE - Professional Alignment */}
        <div className="fixed -left-[9999px] top-0">
          <div id="donor-report-template" className="bg-white p-12 w-[800px]">
            <div className="border-b-4 border-red-600 pb-8 mb-10 flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-black text-gray-900 mb-2">Medical Report</h1>
                <p className="text-gray-500 font-bold">Ref ID: #REP-{(activeReportForPDF?.id || '0000').toString().padStart(6, '0')}</p>
              </div>
              <div className="text-right">
                <div className="font-black text-red-600 text-2xl mb-1">eBloodBank</div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Life Saving Network</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-12">
              <div>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Donor Information</h3>
                <div className="space-y-2">
                  <p className="text-xl font-black text-gray-800">{user?.full_name}</p>
                  <p className="text-gray-600 font-medium">{user?.email}</p>
                  <p className="text-gray-600 font-medium">{user?.phone || 'N/A'}</p>
                  <div className="pt-2" style={{ textAlign: 'left' }}>
                    <span style={{
                      color: '#334155',
                      fontWeight: '800',
                      fontSize: '14px',
                      display: 'block',
                      lineHeight: '1.5'
                    }}>Blood Group: {activeReportForPDF?.blood_group}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Organization</h3>
                <div className="space-y-2">
                  <p className="text-xl font-black text-gray-800">{activeReportForPDF?.org_name}</p>
                  <p className="text-gray-600 font-medium">{activeReportForPDF?.org_email}</p>
                  <p className="text-gray-600 font-medium">{activeReportForPDF?.org_phone || 'N/A'}</p>
                  <p className="text-sm text-gray-400 font-medium">Date: {activeReportForPDF?.test_date ? new Date(activeReportForPDF.test_date).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 mb-10 border border-gray-100">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Medical Vitals</h3>
              <div className="grid grid-cols-3 gap-8">
                {[
                  { label: 'HB Level', val: activeReportForPDF?.hb_level, unit: 'g/dL' },
                  { label: 'Blood Pressure', val: activeReportForPDF?.blood_pressure, unit: 'mmHg' },
                  { label: 'Pulse Rate', val: activeReportForPDF?.pulse_rate, unit: 'bpm' },
                  { label: 'Weight', val: activeReportForPDF?.weight, unit: 'kg' },
                  { label: 'Temperature', val: activeReportForPDF?.temperature, unit: '°C' },
                  { label: 'Units Donated', val: activeReportForPDF?.units_donated, unit: 'Unit', critical: true }
                ].map((v, i) => (
                  <div key={i}>
                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">{v.label}</label>
                    <p className={`text-2xl font-black ${v.critical ? 'text-red-600' : 'text-gray-800'}`}>
                      {v.val || '--'} <span className="text-xs text-gray-400 uppercase">{v.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-10">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Screening Results</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'HIV Status', val: activeReportForPDF?.hiv_status },
                  { label: 'Hepatitis B', val: activeReportForPDF?.hepatitis_b },
                  { label: 'Hepatitis C', val: activeReportForPDF?.hepatitis_c },
                  { label: 'Syphilis', val: activeReportForPDF?.syphilis },
                  { label: 'Malaria', val: activeReportForPDF?.malaria }
                ].map((test, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <span className="font-bold text-gray-700">{test.label}</span>
                    <span className={`font-black uppercase text-xs ${test.val === 'Negative' ? 'text-green-600' : 'text-red-600'}`}>
                      {test.val || 'Not Tested'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Medical Notes</h3>
              <p className="text-gray-700 font-medium leading-relaxed bg-blue-50/30 p-6 rounded-2xl border border-blue-100/50 italic">
                {activeReportForPDF?.notes || 'No medical complications noted during this donation session.'}
              </p>
            </div>

            <div className="mt-16 pt-8 border-t border-gray-100 flex justify-between items-end">
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                System Generated Report • eBloodBank Certified
              </div>
              <div className="text-center w-48">
                <div className="h-0.5 bg-gray-200 mb-2"></div>
                <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Medical Officer Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ModernModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        type={modalConfig.type}
      />
    </div >
  );
};

export default Dashboard;

