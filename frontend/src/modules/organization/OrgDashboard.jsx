import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
    BarChart, Bar, Cell
} from 'recharts';

// --- Constants ---
const BLOOD_GROUPS = [
    "A+", "A-", "A1+", "A1-", "A1B+", "A1B-",
    "A2+", "A2-", "A2B+", "A2B-", "AB+", "AB-",
    "B+", "B-", "Bombay Blood Group", "INRA", "O+", "O-"
];

// --- High Performance Search Component ---
const DonorSearch = React.memo(({ onSelect, verifying }) => {
    const [query, setQuery] = useState('');
    const [liveResults, setLiveResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [justSelected, setJustSelected] = useState(false);

    // Live Search Debounce
    useEffect(() => {
        if (justSelected) {
            setJustSelected(false);
            return;
        }

        if (query.trim().length < 1) {
            setLiveResults([]);
            setShowResults(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`/api/organization/donor/search?query=${query}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setLiveResults(res.data);
                setShowResults(true);
            } catch (err) {
                console.error("Live search failed", err);
            } finally {
                setIsSearching(false);
            }
        }, 200); // Faster debounce for smoother feel

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (donor) => {
        onSelect(donor);
        setJustSelected(true); // Flag to skip the next search effect
        setQuery(donor.email);
        setLiveResults([]);
        setShowResults(false);
    };

    return (
        <div className="relative mb-10">
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <input
                        type="text"
                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        placeholder="Search Email or Phone..."
                        value={query}
                        onChange={e => {
                            setQuery(e.target.value);
                            setJustSelected(false);
                        }}
                        onFocus={() => query.length >= 1 && setShowResults(true)}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {isSearching && <i className="fas fa-circle-notch fa-spin text-blue-500 text-sm"></i>}
                        {query && (
                            <button
                                onClick={() => { setQuery(''); setLiveResults([]); setShowResults(false); onSelect(null); }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <i className="fas fa-times-circle"></i>
                            </button>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => query.length >= 1 && setShowResults(true)}
                    disabled={verifying}
                    className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 active:scale-95"
                >
                    {verifying ? <i className="fas fa-spinner fa-spin"></i> : 'Search'}
                </button>
            </div>

            {/* Autocomplete Dropdown */}
            {showResults && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">
                            {liveResults.length > 0 ? `Possible Matches (${liveResults.length})` : 'No matches found'}
                        </p>
                        <button onClick={() => setShowResults(false)} className="px-3 text-gray-400 hover:text-gray-600">
                            <i className="fas fa-times text-[10px]"></i>
                        </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto scrollbar-thin">
                        {liveResults.map(donor => (
                            <button
                                key={donor.id}
                                onClick={() => handleSelect(donor)}
                                className="w-full p-4 flex items-center justify-between hover:bg-blue-50 transition-colors border-b last:border-0 border-gray-50 group text-left"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 font-black text-sm group-hover:bg-red-100">
                                        {donor.blood_type}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-gray-900">{donor.full_name}</p>
                                        <p className="text-xs font-bold text-gray-400">{donor.email} • {donor.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-blue-500 opacity-0 group-hover:opacity-100 uppercase tracking-widest">Select</span>
                                    <i className="fas fa-chevron-right text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"></i>
                                </div>
                            </button>
                        ))}
                        {liveResults.length === 0 && query.length >= 2 && !isSearching && (
                            <div className="p-10 text-center text-gray-400">
                                <i className="fas fa-search text-2xl mb-2 opacity-10"></i>
                                <p className="text-sm font-bold">Try searching for something else</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

export default function OrgDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('home');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({ total_units: 0, active_requests: 0, verified_count: 0 });
    const [inventory, setInventory] = useState([]);
    const [history, setHistory] = useState([]);
    const [requests, setRequests] = useState([]);
    const [members, setMembers] = useState([]);
    const [inventorySearch, setInventorySearch] = useState('');

    const [activity, setActivity] = useState([]);
    const [analytics, setAnalytics] = useState({ verifications: [], requests: [] });
    const [geoReach, setGeoReach] = useState([]);
    const [outreachData, setOutreachData] = useState({ subject: '', body: '', template: 'General' });
    const [sendingBroadcast, setSendingBroadcast] = useState(false);
    const [loading, setLoading] = useState(false);
    const [membersLoading, setMembersLoading] = useState(false);

    // Emergency Request Form State
    const [requestForm, setRequestForm] = useState({
        blood_group: 'A+',
        units_required: 1,
        urgency_level: 'High',
        description: ''
    });

    // Verification State
    const [verificationResult, setVerificationResult] = useState(null);
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        fetchStats();
        fetchActivity();
    }, []);

    useEffect(() => {
        if (activeTab === 'home') {
            fetchStats();
            fetchActivity();
            fetchAnalytics();
            fetchGeoReach();
        }
        if (activeTab === 'inventory') fetchInventory();
        if (activeTab === 'history') fetchHistory();
        if (activeTab === 'emergency') fetchRequests();
        if (activeTab === 'members') fetchMembers();
    }, [activeTab]);

    const fetchAnalytics = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/organization/analytics', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAnalytics(res.data);
        } catch (err) {
            console.error('Analytics Fetch Error:', err);
        }
    };

    const fetchGeoReach = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/organization/geographic-stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGeoReach(res.data);
        } catch (err) {
            console.error('Geo Stats Fetch Error:', err);
        }
    };

    const handleSendBroadcast = async () => {
        if (!outreachData.subject || !outreachData.body) {
            toast.error("Please fill in both subject and body");
            return;
        }
        setSendingBroadcast(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/organization/outreach', outreachData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Broadcast sent successfully!");
            setOutreachData({ subject: '', body: '', template: 'General' });
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to send broadcast");
        } finally {
            setSendingBroadcast(false);
        }
    };



    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/organization/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(res.data);
        } catch (err) {
            if (err.response && (err.response.status === 401 || err.response.status === 404)) {
                localStorage.removeItem('token');
                sessionStorage.removeItem('token');
                navigate('/organization/login'); // Or simply navigate to login
                return;
            }
            console.error("Failed to fetch stats", err);
        }
    };

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/organization/inventory', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInventory(res.data);
        } catch (err) {
            toast.error("Failed to fetch inventory");
        } finally {
            setLoading(false);
        }
    };

    const downloadHistoryCSV = () => {
        if (history.length === 0) return toast.error("No history to export");

        const headers = ["Donor Name,Email,Blood Type,Date,Notes,Status"];
        const rows = history.map(h =>
            `${h.full_name},${h.email},${h.blood_type},${new Date(h.created_at).toLocaleDateString()},"${h.notes || ''}",Verified`
        );

        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `donation_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/organization/history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data);
        } catch (err) {
            toast.error("Failed to fetch history");
        } finally {
            setLoading(false);
        }
    };

    const fetchRequests = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/organization/requests', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRequests(res.data);
        } catch (err) {
            console.error("Failed to fetch requests");
        }
    };

    const fetchActivity = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/organization/recent-activity', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActivity(res.data);
        } catch (err) {
            console.error("Failed to fetch activity", err);
        }
    };



    const handleQuickUpdate = async (bloodGroup, currentUnits, change) => {
        const newUnits = Math.max(0, currentUnits + change);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/organization/inventory/update',
                { blood_group: bloodGroup, units: newUnits },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`Stock updated to ${newUnits}`);
            fetchInventory();
            fetchStats();
        } catch (err) {
            toast.error("Update failed");
        }
    };

    const handleUpdateInventory = async (bloodGroup, currentUnits) => {
        const newUnits = prompt(`Update units for ${bloodGroup}:`, currentUnits);
        if (newUnits !== null && !isNaN(newUnits)) {
            try {
                const token = localStorage.getItem('token');
                await axios.post('/api/organization/inventory/update',
                    { blood_group: bloodGroup, units: parseInt(newUnits) },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                toast.success("Inventory updated");
                fetchInventory();
                fetchStats(); // Refresh stats too
            } catch (err) {
                toast.error("Update failed");
            }
        }
    };

    const handleCreateRequest = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/organization/request/create', requestForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Emergency request broadcasted!");
            setRequestForm({ blood_group: 'A+', units_required: 1, urgency_level: 'High', description: '' });
            fetchStats();
            fetchRequests(); // Refresh list
        } catch (err) {
            toast.error("Failed to create request");
        }
    };

    const handleCloseRequest = async (id) => {
        if (!confirm('Are you sure you want to close this request?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/organization/request/${id}/status`,
                { status: 'Closed' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Request closed");
            fetchRequests();
            fetchStats();
        } catch (err) {
            toast.error("Failed to close request");
        }
    };

    const handleSearchDonor = async (q) => {
        if (!q) return;
        setVerifying(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/organization/donor/search?query=${q}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.length > 0) {
                setVerificationResult(res.data[0]);
            } else {
                setVerificationResult(null);
                toast.error("No donor found");
            }
        } catch (err) {
            toast.error("Search failed");
        } finally {
            setVerifying(false);
        }
    };

    const handleVerifyDonation = async () => {
        if (!verificationResult) return;
        if (!confirm(`Verify donation for ${verificationResult.full_name}?`)) return;

        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/organization/verify',
                { donor_id: verificationResult.id, notes: 'Verified via Portal' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Donation verified & recorded");
            setVerificationResult(null);
            setVerifyQuery('');
            fetchStats();
        } catch (err) {
            toast.error("Verification failed");
        }
    };

    const handleAddMember = async (donorId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/organization/members/add',
                { donor_id: donorId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Donor added as Organization Member");
            // If they are in search result, we might want to refresh something, 
            // but usually search is transient.
        } catch (err) {
            toast.error("Failed to add member");
        }
    };

    const fetchMembers = async () => {
        setMembersLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/organization/members', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMembers(res.data);
        } catch (err) {
            toast.error("Failed to fetch members");
        } finally {
            setMembersLoading(false);
        }
    };

    const handleRemoveMember = async (donorId) => {
        if (!confirm('Are you sure you want to remove this member?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/organization/members/${donorId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Member removed");
            fetchMembers();
        } catch (err) {
            toast.error("Failed to remove member");
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        toast.success("Logged out successfully");
        navigate('/organization/login');
    };

    const navItems = [
        { id: 'home', label: 'Dashboard', icon: 'fa-th-large' },
        { id: 'inventory', label: 'Blood Inventory', icon: 'fa-burn' },
        { id: 'emergency', label: 'Emergency Requests', icon: 'fa-ambulance' },
        { id: 'outreach', label: 'Outreach Hub', icon: 'fa-bullhorn' },
        { id: 'verification', label: 'Donor Verification', icon: 'fa-user-check' },
        { id: 'members', label: 'Our Members', icon: 'fa-users' },
        { id: 'history', label: 'History', icon: 'fa-history' },
    ];

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-72' : 'w-24'} bg-white border-r border-gray-100 transition-all duration-300 flex flex-col fixed h-full z-30`}>
                <div className="h-24 flex items-center justify-center border-b border-gray-50">
                    {sidebarOpen ? (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-tr from-red-600 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                                <i className="fas fa-heartbeat text-white text-lg"></i>
                            </div>
                            <h1 className="text-xl font-black tracking-tight text-gray-900">eBloodBank</h1>
                        </div>
                    ) : (
                        <div className="w-10 h-10 bg-gradient-to-tr from-red-600 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                            <i className="fas fa-heartbeat text-white text-lg"></i>
                        </div>
                    )}
                </div>

                <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center p-4 rounded-2xl transition-all duration-200 group
                                ${activeTab === item.id
                                    ? 'bg-red-50 text-red-600 shadow-sm'
                                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <div className={`w-6 flex justify-center text-xl transition-colors ${activeTab === item.id ? 'text-red-500' : 'group-hover:text-gray-900'}`}>
                                <i className={`fas ${item.icon}`}></i>
                            </div>
                            {sidebarOpen && <span className="ml-4 font-bold tracking-tight">{item.label}</span>}
                            {sidebarOpen && activeTab === item.id && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-50">
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center p-4 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group ${!sidebarOpen && 'justify-center'}`}
                    >
                        <i className="fas fa-sign-out-alt text-xl group-hover:rotate-180 transition-transform duration-300"></i>
                        {sidebarOpen && <span className="ml-4 font-bold">Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'ml-72' : 'ml-24'}`}>
                {/* Header */}
                <header className="h-24 bg-white/80 backdrop-blur-xl sticky top-0 z-20 px-10 flex items-center justify-between border-b border-gray-50/50">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
                        >
                            <i className={`fas ${sidebarOpen ? 'fa-indent' : 'fa-outdent'} text-lg`}></i>
                        </button>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">
                                {activeTab === 'home' && 'Overview'}
                                {activeTab === 'inventory' && 'Inventory Management'}
                                {activeTab === 'emergency' && 'Emergency Broadcast'}
                                {activeTab === 'outreach' && 'Outreach Hub'}
                                {activeTab === 'verification' && 'Donor Verification'}
                                {activeTab === 'members' && 'Organization Member List'}
                                {activeTab === 'history' && 'Donation History'}
                            </h2>
                            <p className="text-xs font-semibold text-gray-400 mt-0.5">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative group cursor-pointer">
                            <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></div>
                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-red-500 transition-colors">
                                <i className="fas fa-bell text-lg"></i>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-bold text-gray-900">{user?.name || 'Organization'}</p>
                                <p className="text-xs font-semibold text-gray-400">{user?.type || 'Medical Facility'}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-black text-lg shadow-inner">
                                {user?.name?.charAt(0) || 'O'}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-10 overflow-auto">
                    {/* HOME TAB (Revamped with Intelligence) */}
                    {activeTab === 'home' && (
                        <div className="max-w-7xl mx-auto space-y-10">
                            {/* Welcome Hero */}
                            <div className="relative overflow-hidden rounded-[2.5rem] bg-gray-900 p-12 shadow-2xl">
                                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-red-600/10 to-transparent pointer-events-none"></div>
                                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                                    <div className="space-y-6 text-center lg:text-left">
                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-black uppercase tracking-widest mx-auto lg:mx-0">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                            Facility Command Center
                                        </div>
                                        <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
                                            Blood Bank <span className="text-red-500">Intelligence.</span>
                                        </h1>
                                        <p className="text-gray-400 text-lg font-bold leading-relaxed max-w-lg mx-auto lg:mx-0">
                                            Stay ahead with real-time analytics, geographic donor insights, and predictive inventory alerts designed for medical facilities.
                                        </p>
                                        <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                                            <button onClick={() => setActiveTab('verification')} className="px-8 py-4 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 flex items-center gap-3 active:scale-95">
                                                <i className="fas fa-plus"></i>
                                                Verify Donation
                                            </button>
                                            <button onClick={() => setActiveTab('outreach')} className="px-8 py-4 bg-white/5 text-white font-black rounded-2xl hover:bg-white/10 transition-all border border-white/10 flex items-center gap-3">
                                                Member Outreach
                                            </button>
                                        </div>
                                    </div>
                                    <div className="hidden lg:grid grid-cols-2 gap-4">
                                        {[
                                            { label: 'Total Impact', val: stats.verified_count, icon: 'fa-heart', color: 'text-red-400' },
                                            { label: 'Active Alerts', val: stats.active_requests, icon: 'fa-ambulance', color: 'text-blue-400' },
                                            { label: 'Units Stock', val: stats.total_units, icon: 'fa-burn', color: 'text-orange-400' },
                                            { label: 'Geo Reach', val: geoReach.length, icon: 'fa-globe', color: 'text-green-400' }
                                        ].map((box, i) => (
                                            <div key={i} className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md">
                                                <i className={`fas ${box.icon} ${box.color} text-2xl mb-4`}></i>
                                                <p className="text-white text-3xl font-black">{box.val}</p>
                                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">{box.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Analytics Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Impact Trends Section */}
                                <div className="lg:col-span-2 bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Activity Analytics</h3>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Donation & Request Trends (Last 7 Days)</p>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                <span className="text-[10px] font-black uppercase text-gray-500">Verifications</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-200"></div>
                                                <span className="text-[10px] font-black uppercase text-gray-500">Reqs</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-72 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={analytics.verifications.length > 0 ? analytics.verifications.map(v => ({
                                                name: new Date(v.date).toLocaleDateString(undefined, { weekday: 'short' }),
                                                verifications: v.count,
                                                requests: (analytics.requests.find(r => r.date === v.date) || { count: 0 }).count
                                            })) : [
                                                { name: 'Mon', verifications: 0, requests: 0 },
                                                { name: 'Tue', verifications: 0, requests: 0 },
                                                { name: 'Wed', verifications: 0, requests: 0 },
                                                { name: 'Thu', verifications: 0, requests: 0 },
                                                { name: 'Fri', verifications: 0, requests: 0 },
                                                { name: 'Sat', verifications: 0, requests: 0 },
                                                { name: 'Sun', verifications: 0, requests: 0 },
                                            ]}>
                                                <defs>
                                                    <linearGradient id="colorVer" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="black" axisLine={false} tickLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={10} fontWeight="black" axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }}
                                                />
                                                <Area type="monotone" dataKey="verifications" stroke="#ef4444" strokeWidth={4} fillOpacity={1} fill="url(#colorVer)" />
                                                <Area type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorReq)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Geographic reach Card */}
                                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8 flex flex-col justify-between">
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Geographic Reach</h3>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Member Localities</p>
                                    </div>

                                    <div className="space-y-6 flex-1 py-4">
                                        {geoReach.length > 0 ? geoReach.map((geo, i) => (
                                            <div key={i} className="group">
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-red-50 group-hover:text-red-500 transition-all">
                                                            <i className="fas fa-map-marker-alt text-xs"></i>
                                                        </div>
                                                        <span className="text-sm font-black text-gray-800">{geo.city}</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-gray-400 group-hover:text-red-500 transition-colors">{geo.count} Members</span>
                                                </div>
                                                <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-1000"
                                                        style={{ width: `${(geo.count / (geoReach[0]?.count || 1)) * 100}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                                                <i className="fas fa-globe-americas text-4xl mb-4"></i>
                                                <p className="text-xs font-black uppercase tracking-widest leading-loose">Waiting for member data</p>
                                            </div>
                                        )}
                                    </div>

                                    <button onClick={() => setActiveTab('members')} className="w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-900 font-black rounded-2xl transition-all text-xs uppercase tracking-widest border border-gray-100">
                                        Analyze Member Density
                                    </button>
                                </div>
                            </div>

                            {/* Alerts & Activity Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Intelligent Alerts */}
                                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Intelligence Alerts</h3>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Live Stock Threshold Monitor</p>
                                        </div>
                                        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 shadow-sm">
                                            <i className="fas fa-robot text-xl"></i>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {stats.inventory_breakdown?.filter(item => item.units < (item.min_threshold || 5)).length > 0 ? (
                                            stats.inventory_breakdown
                                                .filter(item => item.units < (item.min_threshold || 5))
                                                .map((item, i) => (
                                                    <div key={i} className="p-6 bg-red-50/50 border border-red-100 rounded-[2rem] flex items-center justify-between group animate-in slide-in-from-left-2 duration-300">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-14 h-14 rounded-2xl bg-white border border-red-100 flex flex-col items-center justify-center shadow-lg shadow-red-500/5">
                                                                <span className="text-red-600 font-black text-lg">{item.blood_group}</span>
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-gray-900">Critical Drop Detected</p>
                                                                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                                                                    <i className="fas fa-exclamation-triangle"></i>
                                                                    {item.units}U Available <span className="opacity-40">•</span> Target: {item.min_threshold || 5}U
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => setActiveTab('emergency')} className="px-6 py-3 bg-red-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95">
                                                            Restock
                                                        </button>
                                                    </div>
                                                ))
                                        ) : (
                                            <div className="p-10 border-2 border-dashed border-gray-100 rounded-[2.5rem] text-center bg-gray-50/30">
                                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto mb-6 shadow-inner">
                                                    <i className="fas fa-shield-alt text-2xl"></i>
                                                </div>
                                                <p className="text-sm font-black text-gray-900 uppercase">Operational Status: Peak</p>
                                                <p className="text-xs font-bold text-gray-400 mt-2">All stock thresholds are currently healthy.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Activity Logs */}
                                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8 flex flex-col">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Recent Activity Feed</h3>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Real-time facility logs</p>
                                        </div>
                                        <button onClick={fetchActivity} className="w-10 h-10 rounded-xl hover:bg-gray-50 flex items-center justify-center text-gray-400 transition-all active:rotate-180">
                                            <i className="fas fa-sync-alt"></i>
                                        </button>
                                    </div>
                                    <div className="space-y-6 flex-1 max-h-[400px] overflow-y-auto pr-4 scrollbar-thin">
                                        {activity.length > 0 ? activity.map((act, i) => (
                                            <div key={i} className="flex gap-5 group">
                                                <div className="relative flex flex-col items-center">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 duration-300 ${act.type === 'Verification' ? 'bg-red-500' :
                                                        act.type === 'Request' ? 'bg-blue-500' : 'bg-gray-800'
                                                        }`}>
                                                        <i className={`fas ${act.type === 'Verification' ? 'fa-check' :
                                                            act.type === 'Request' ? 'fa-ambulance' : 'fa-user-plus'
                                                            } text-sm`}></i>
                                                    </div>
                                                    {i !== activity.length - 1 && <div className="w-0.5 grow bg-gray-100 my-2"></div>}
                                                </div>
                                                <div className="pb-8 pt-1">
                                                    <p className="text-sm font-black text-gray-800 leading-tight mb-1 group-hover:text-red-600 transition-colors">
                                                        {act.details}
                                                    </p>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[9px] font-black text-white px-2 py-0.5 bg-gray-900 rounded-md uppercase tracking-widest">{act.type}</span>
                                                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                                                            {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                                                <i className="fas fa-list-ul text-4xl mb-4"></i>
                                                <p className="text-xs font-black uppercase tracking-widest">No logs detected yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* INVENTORY TAB */}
                    {activeTab === 'inventory' && (
                        <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
                            {/* Inventory Header & Search */}
                            <div className="bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-10">
                                <div className="max-w-md">
                                    <h3 className="text-3xl font-black text-gray-900 tracking-tight">Blood Stock Inventory</h3>
                                    <p className="text-gray-400 font-bold mt-2 leading-relaxed">Real-time monitoring and management of all {BLOOD_GROUPS.length} blood groups with automated low-stock alerts.</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-5 w-full lg:w-auto">
                                    <div className="relative group flex items-center flex-1 sm:w-80 h-full">
                                        <div className="absolute left-8 flex items-center justify-center h-full pointer-events-none text-red-500 transition-colors z-20">
                                            <i className="fas fa-search text-xl"></i>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search Blood Group..."
                                            value={inventorySearch}
                                            onChange={e => setInventorySearch(e.target.value)}
                                            className="w-full pl-16 pr-6 py-5 bg-gray-50 border-none rounded-[2rem] font-bold text-gray-900 outline-none focus:ring-4 focus:ring-red-500/10 transition-all shadow-inner relative z-10"
                                        />
                                    </div>
                                    <div className="px-10 py-5 bg-red-600 rounded-[2rem] flex items-center gap-6 shadow-xl shadow-red-500/20 transition-all hover:scale-[1.02]">
                                        <div className="min-w-[4rem] px-4 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black backdrop-blur-md text-xl shadow-inner">
                                            {stats.total_units}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-black text-red-100 uppercase tracking-[0.2em] leading-none mb-2">Total Capacity</p>
                                            <p className="text-white font-black text-xl leading-none">Healthy Stock</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {loading ? (
                                <div className="text-center py-20">
                                    <i className="fas fa-circle-notch fa-spin text-4xl text-red-500"></i>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                    {BLOOD_GROUPS.filter(t => t.toLowerCase().startsWith(inventorySearch.toLowerCase())).map(type => {
                                        const typeData = inventory.find(i => i.blood_group === type);
                                        const units = typeData ? typeData.units : 0;
                                        const threshold = typeData ? typeData.min_threshold : 5;
                                        const isLow = units < threshold;

                                        return (
                                            <div key={type} className={`bg-white p-8 rounded-[3rem] border transition-all duration-500 group relative overflow-hidden ${isLow ? 'border-red-100 bg-red-50/20 shadow-xl shadow-red-500/5' : 'border-gray-100 hover:shadow-2xl hover:shadow-gray-200/50 hover:border-gray-200'}`}>
                                                {/* Background Accent */}
                                                <div className={`absolute top-0 right-0 w-32 h-32 -mr-10 -mt-10 rounded-full blur-[60px] opacity-10 transition-opacity ${isLow ? 'bg-red-600' : 'bg-gray-900 group-hover:opacity-20'}`}></div>

                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-8">
                                                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-lg transition-transform group-hover:scale-110 duration-500 ${isLow ? 'bg-red-600 text-white shadow-red-500/30' : 'bg-gray-900 text-white shadow-gray-900/30'}`}>
                                                            {type.length > 5 ? type.split(' ').map(w => w[0]).join('') : type}
                                                        </div>
                                                        <div className="text-right">
                                                            <button
                                                                onClick={() => {
                                                                    const newThreshold = prompt(`Setup minimum monitoring threshold for ${type}:`, threshold);
                                                                    if (newThreshold !== null && !isNaN(newThreshold)) {
                                                                        handleUpdateInventory(type, units, parseInt(newThreshold));
                                                                    }
                                                                }}
                                                                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isLow ? 'bg-red-100 text-red-600' : 'bg-gray-50 text-gray-400 group-hover:bg-gray-900 group-hover:text-white'}`}
                                                            >
                                                                Limit: {threshold}U
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4 mb-10">
                                                        <div className="flex items-end justify-between">
                                                            <div>
                                                                <h3 className={`text-5xl font-black transition-colors ${isLow ? 'text-red-600' : 'text-gray-900'}`}>{units}</h3>
                                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">Active Units</p>
                                                            </div>
                                                            {isLow && (
                                                                <div className="px-3 py-1 bg-red-600 text-white text-[8px] font-black rounded-lg uppercase tracking-widest animate-pulse ring-4 ring-red-50">
                                                                    Critically Low
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Stock Gauge */}
                                                        <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden flex shadow-inner border border-gray-100/50">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-1000 ease-out ${isLow ? 'bg-gradient-to-r from-red-600 to-rose-500' : 'bg-gradient-to-r from-gray-800 to-gray-700'}`}
                                                                style={{ width: `${Math.min((units / Math.max(units, threshold, 20)) * 100, 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <button
                                                            onClick={() => handleUpdateInventory(type, Math.max(0, units - 1), threshold)}
                                                            className="h-16 rounded-2xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all active:scale-95 flex items-center justify-center text-xl"
                                                            title="Subtract units"
                                                        >
                                                            <i className="fas fa-minus"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateInventory(type, units + 1, threshold)}
                                                            className="h-16 rounded-2xl bg-gray-50 text-gray-400 hover:bg-green-50 hover:text-green-700 transition-all active:scale-95 flex items-center justify-center text-xl"
                                                            title="Add units"
                                                        >
                                                            <i className="fas fa-plus"></i>
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            const newVal = prompt(`Enter precise unit count for ${type}:`, units);
                                                            if (newVal !== null && !isNaN(newVal)) handleUpdateInventory(type, parseInt(newVal), threshold);
                                                        }}
                                                        className="w-full mt-4 py-4 border-2 border-dashed border-gray-100 text-gray-400 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 font-black rounded-2xl transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-3"
                                                    >
                                                        <i className="fas fa-keyboard"></i> Manual Sync
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'emergency' && (
                        <div className="max-w-5xl mx-auto space-y-10">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Create Request Form */}
                                <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                                    <div className="bg-red-600 p-10 text-white relative overflow-hidden">
                                        <div className="relative z-10">
                                            <h3 className="text-2xl font-black mb-2">Broadcast Emergency</h3>
                                            <p className="text-red-100 font-medium">This will notify all verified donors in your vicinity immediately.</p>

                                            {/* Quick Templates */}
                                            <div className="flex gap-3 mt-6 overflow-x-auto pb-2 scrollbar-hide">
                                                {[
                                                    { label: 'Critical O+', bg: 'O+', u: 'Critical', units: 5 },
                                                    { label: 'Urgent B-', bg: 'B-', u: 'High', units: 3 },
                                                    { label: 'General AB+', bg: 'AB+', u: 'Medium', units: 2 },
                                                ].map((t, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setRequestForm({
                                                            blood_group: t.bg,
                                                            units_required: t.units,
                                                            urgency_level: t.u,
                                                            description: `Emergency request for ${t.bg} blood.`
                                                        })}
                                                        className="whitespace-nowrap px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold text-white transition-colors backdrop-blur-sm border border-white/10"
                                                    >
                                                        {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                                    </div>
                                    <div className="p-10">
                                        <form onSubmit={handleCreateRequest} className="space-y-8">
                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Blood Group</label>
                                                    <select
                                                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-red-500/20"
                                                        value={requestForm.blood_group}
                                                        onChange={e => setRequestForm({ ...requestForm, blood_group: e.target.value })}
                                                    >
                                                        {BLOOD_GROUPS.map(t => (
                                                            <option key={t} value={t}>{t}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Units Required</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-red-500/20"
                                                        value={requestForm.units_required}
                                                        onChange={e => setRequestForm({ ...requestForm, units_required: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Urgency Level</label>
                                                <div className="flex gap-4">
                                                    {['Critical', 'High', 'Medium'].map(level => (
                                                        <button
                                                            key={level}
                                                            type="button"
                                                            onClick={() => setRequestForm({ ...requestForm, urgency_level: level })}
                                                            className={`flex-1 py-4 rounded-2xl font-bold transition-all ${requestForm.urgency_level === level
                                                                ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                                                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                                                }`}
                                                        >
                                                            {level}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Description / Note</label>
                                                <textarea
                                                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-red-500/20 h-32 resize-none"
                                                    placeholder="Describe the medical situation..."
                                                    value={requestForm.description}
                                                    onChange={e => setRequestForm({ ...requestForm, description: e.target.value })}
                                                ></textarea>
                                            </div>

                                            <button type="submit" className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-200">
                                                Broadcast Request
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                {/* Recent Requests List */}
                                <div className="space-y-6">
                                    <h3 className="text-xl font-black text-gray-900 px-4">Recent Requests</h3>
                                    {requests.length === 0 ? (
                                        <div className="text-center py-10 text-gray-400">
                                            <p>No requests found.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {requests.map(req => (
                                                <div key={req.id} className={`p-6 rounded-3xl border transition-all ${req.status === 'Active' ? 'bg-white border-red-100 shadow-sm' : 'bg-gray-50 border-transparent opacity-75'}`}>
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${req.urgency_level === 'Critical' ? 'bg-red-100 text-red-600' :
                                                                req.urgency_level === 'High' ? 'bg-orange-100 text-orange-600' :
                                                                    'bg-blue-100 text-blue-600'
                                                                }`}>
                                                                {req.urgency_level}
                                                            </span>
                                                            <span className="text-xs font-bold text-gray-400">
                                                                {new Date(req.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        {req.status === 'Active' && (
                                                            <button
                                                                onClick={() => handleCloseRequest(req.id)}
                                                                className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline"
                                                            >
                                                                Close Request
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4 mb-2">
                                                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-black text-gray-900 border border-gray-200">
                                                            {req.blood_group}
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-900 font-bold">{req.units_required} Units Required</p>
                                                            <p className="text-xs text-gray-500 font-semibold">{req.status}</p>
                                                        </div>
                                                    </div>
                                                    {req.description && (
                                                        <p className="text-sm text-gray-500 mt-2 bg-gray-50 p-3 rounded-xl">
                                                            "{req.description}"
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* OUTREACH HUB TAB */}
                    {activeTab === 'outreach' && (
                        <div className="max-w-4xl mx-auto space-y-8">
                            <div className="bg-gradient-to-br from-indigo-900 to-gray-900 rounded-[2.5rem] p-12 text-white relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 w-1/2 h-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                                    <div className="flex-1 space-y-4">
                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 border border-indigo-500/20 rounded-full text-indigo-300 text-[10px] font-black uppercase tracking-widest">
                                            Community Engagement
                                        </div>
                                        <h2 className="text-4xl font-black leading-tight">Member <span className="text-indigo-400">Broadcast</span> Hub.</h2>
                                        <p className="text-indigo-200/60 font-bold leading-relaxed">
                                            Mobilize your community instantly. Reach every verified donor with drives, updates, or appeals from your medical command center.
                                        </p>
                                    </div>
                                    <div className="w-32 h-32 rounded-3xl bg-indigo-500/20 backdrop-blur-xl border border-indigo-400/20 flex items-center justify-center shadow-2xl shadow-indigo-500/20">
                                        <i className="fas fa-bullhorn text-5xl text-indigo-400 animate-pulse"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-10 md:p-14 space-y-10">
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Select Communication Template</p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {[
                                                { id: 'General', label: 'News Update', icon: 'fa-info-circle' },
                                                { id: 'Drive', label: 'Donation Drive', icon: 'fa-calendar-check' },
                                                { id: 'Urgent', label: 'Urgent Appeal', icon: 'fa-exclamation-circle' }
                                            ].map(tmp => (
                                                <button
                                                    key={tmp.id}
                                                    onClick={() => setOutreachData({ ...outreachData, template: tmp.id, subject: `[${tmp.label}] Important update from ${user?.name}` })}
                                                    className={`p-8 rounded-[2rem] border-2 transition-all text-left flex flex-col gap-4 ${outreachData.template === tmp.id ? 'border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-50' : 'border-gray-50 hover:border-indigo-200 hover:bg-gray-50/50'
                                                        }`}
                                                >
                                                    <i className={`fas ${tmp.icon} text-2xl ${outreachData.template === tmp.id ? 'text-indigo-600' : 'text-gray-300'}`}></i>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-sm">{tmp.label}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Quick message</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-8 pt-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Broadcast Subject</label>
                                            <input
                                                className="w-full px-8 py-5 bg-gray-50 border-none rounded-2xl font-bold text-gray-900 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                                placeholder="Enter email subject line..."
                                                value={outreachData.subject}
                                                onChange={e => setOutreachData({ ...outreachData, subject: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Message Content</label>
                                            <textarea
                                                className="w-full px-8 py-6 bg-gray-50 border-none rounded-[2rem] font-bold text-gray-900 outline-none focus:ring-4 focus:ring-indigo-500/10 min-h-[300px] resize-none transition-all"
                                                placeholder="Write your broadcast message here. Use a professional tone..."
                                                value={outreachData.body}
                                                onChange={e => setOutreachData({ ...outreachData, body: e.target.value })}
                                            />
                                        </div>
                                        <div className="bg-indigo-50 p-6 rounded-2xl flex items-center gap-4 border border-indigo-100">
                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                                                <i className="fas fa-users"></i>
                                            </div>
                                            <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest leading-relaxed">
                                                This broadcast will reach all {members.length} verified members of your organization via their registered emails.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleSendBroadcast}
                                            disabled={sendingBroadcast}
                                            className="w-full py-6 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-4 disabled:opacity-50 active:scale-[0.98]"
                                        >
                                            {sendingBroadcast ? (
                                                <><i className="fas fa-circle-notch fa-spin"></i> Sending Pulse...</>
                                            ) : (
                                                <><i className="fas fa-paper-plane"></i> Initialize Broadcast</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="max-w-6xl mx-auto">
                            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 mb-2">Donation History</h3>
                                        <p className="text-gray-500 font-medium">Log of all donors verified by your organization.</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={downloadHistoryCSV}
                                            className="w-12 h-12 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all"
                                            title="Export CSV"
                                        >
                                            <i className="fas fa-download text-xl"></i>
                                        </button>
                                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
                                            <i className="fas fa-history text-xl"></i>
                                        </div>
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="p-20 text-center">
                                        <i className="fas fa-circle-notch fa-spin text-4xl text-gray-300"></i>
                                    </div>
                                ) : history.length === 0 ? (
                                    <div className="p-20 text-center text-gray-400">
                                        <p>No history found.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                                    <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Donor</th>
                                                    <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Contact</th>
                                                    <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Blood Type</th>
                                                    <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Date Verified</th>
                                                    <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {history.map(item => (
                                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="p-6">
                                                            <div className="font-bold text-gray-900">{item.full_name}</div>
                                                            <div className="text-xs text-gray-400 font-medium block md:hidden">{item.email}</div>
                                                        </td>
                                                        <td className="p-6 hidden md:table-cell">
                                                            <div className="text-sm font-medium text-gray-600">{item.email}</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-red-50 text-red-700 font-black text-xs border border-red-100">
                                                                {item.blood_type}
                                                            </span>
                                                        </td>
                                                        <td className="p-6 hidden md:table-cell">
                                                            <span className="text-sm font-medium text-gray-500">
                                                                {new Date(item.created_at).toLocaleDateString()}
                                                            </span>
                                                        </td>
                                                        <td className="p-6">
                                                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold">
                                                                <i className="fas fa-check-circle text-[10px]"></i> Verified
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'members' && (
                        <div className="max-w-6xl mx-auto">
                            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-10 border-b border-gray-50 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 mb-2">Organization Members</h3>
                                        <p className="text-gray-500 font-medium">Donors who are officially part of your organization's community.</p>
                                    </div>
                                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                                        <i className="fas fa-users text-xl"></i>
                                    </div>
                                </div>

                                {membersLoading ? (
                                    <div className="p-20 text-center">
                                        <i className="fas fa-circle-notch fa-spin text-4xl text-blue-500"></i>
                                    </div>
                                ) : members.length === 0 ? (
                                    <div className="p-20 text-center text-gray-400">
                                        <i className="fas fa-user-plus text-5xl mb-4 opacity-20"></i>
                                        <p className="font-bold">No members found.</p>
                                        <p className="text-sm">Search and add donors from the Verification tab.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                                    <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Member name</th>
                                                    <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Contact Info</th>
                                                    <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Blood Type</th>
                                                    <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Joined Date</th>
                                                    <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {members.map(member => (
                                                    <tr key={member.donor_id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="p-6 text-gray-900">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                                    {member.full_name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold">{member.full_name}</div>
                                                                    <div className="text-xs text-gray-400">{member.city || 'Location N/A'}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="text-sm font-medium text-gray-600">{member.email}</div>
                                                            <div className="text-xs text-gray-400">{member.phone}</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-red-50 text-red-700 font-black text-xs border border-red-100">
                                                                {member.blood_type}
                                                            </span>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="text-sm font-medium text-gray-500">
                                                                {new Date(member.joined_at).toLocaleDateString()}
                                                            </div>
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            <button
                                                                onClick={() => handleRemoveMember(member.donor_id)}
                                                                className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-all"
                                                                title="Remove Member"
                                                            >
                                                                <i className="fas fa-user-minus"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* VERIFICATION TAB */}
                    {activeTab === 'verification' && (
                        <div className="max-w-2xl mx-auto">
                            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-10 border-b border-gray-50">
                                    <h3 className="text-2xl font-black text-gray-900 mb-2">Donor Verification</h3>
                                    <p className="text-gray-500 font-medium">Search for a donor by email or phone to verify their donation.</p>
                                </div>
                                <div className="p-10">
                                    <DonorSearch
                                        verifying={verifying}
                                        onSelect={(donor) => setVerificationResult(donor)}
                                    />

                                    {verificationResult ? (
                                        <div className="bg-green-50 rounded-3xl p-8 border border-green-100">
                                            <div className="flex items-center gap-6 mb-8">
                                                <div className="w-20 h-20 bg-green-200 rounded-full flex items-center justify-center text-green-700 text-3xl font-black">
                                                    {verificationResult.blood_type}
                                                </div>
                                                <div>
                                                    <h4 className="text-xl font-black text-gray-900">{verificationResult.full_name}</h4>
                                                    <p className="text-gray-500 font-medium">{verificationResult.email}</p>
                                                    <p className="text-gray-500 font-medium">{verificationResult.phone}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={handleVerifyDonation}
                                                    className="flex-1 bg-green-600 text-white font-bold py-4 rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                                                >
                                                    Confirm Donation & Verify
                                                </button>
                                                <button
                                                    onClick={() => handleAddMember(verificationResult.id)}
                                                    className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                                                >
                                                    Add to Organization
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 text-gray-300">
                                            <i className="fas fa-user-shield text-5xl mb-4"></i>
                                            <p className="font-bold">Search result will appear here</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
