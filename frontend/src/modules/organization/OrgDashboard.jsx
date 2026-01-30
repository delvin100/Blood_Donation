import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import MedicalReports from './MedicalReports';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
    BarChart, Bar, Cell
} from 'recharts';

// --- Constants ---
const getAuthToken = () => localStorage.getItem('token') || sessionStorage.getItem('token');

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
                const token = getAuthToken();
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
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">{donor.donor_tag}</span>
                                            <p className="text-xs font-bold text-gray-400">{donor.email} • {donor.phone}</p>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${donor.availability === 'Available' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                            {donor.availability}
                                        </span>
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
    const [loading, setLoading] = useState(false);
    const [membersLoading, setMembersLoading] = useState(false);
    const [orgDetails, setOrgDetails] = useState(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        phone: '',
        license_number: '',
        type: '',
        state: '',
        district: '',
        city: '',
        address: ''
    });

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

    const [showReportsModal, setShowReportsModal] = useState(false);
    const [selectedDonor, setSelectedDonor] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
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
        if (activeTab === 'profile') fetchOrgProfile();
    }, [activeTab]);

    const fetchOrgProfile = async () => {
        setProfileLoading(true);
        try {
            const token = getAuthToken();
            const res = await axios.get('/api/organization/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOrgDetails(res.data);
            setEditForm({
                name: res.data.name,
                email: res.data.email,
                phone: res.data.phone,
                license_number: res.data.license_number,
                type: res.data.type,
                state: res.data.state,
                district: res.data.district,
                city: res.data.city,
                address: res.data.address
            });
            // Refresh counts to ensure profile shows latest data
            fetchStats();
            fetchMembers();
        } catch (err) {
            toast.error("Failed to fetch profile details");
        } finally {
            setProfileLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        // Phone Validation (10 digits numeric)
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(editForm.phone)) {
            return toast.error("Phone number must be exactly 10 digits");
        }

        try {
            const token = getAuthToken();
            await axios.put('/api/organization/profile', editForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Profile updated successfully");
            setIsEditingProfile(false);
            fetchOrgProfile();
            // Update local storage user name/email/type if changed
            const updatedUser = { ...user, name: editForm.name, email: editForm.email, type: editForm.type };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update profile");
        }
    };

    const fetchAnalytics = async () => {
        try {
            const token = getAuthToken();
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
            const token = getAuthToken();
            const res = await axios.get('/api/organization/geographic-stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGeoReach(res.data);
        } catch (err) {
            console.error('Geo Stats Fetch Error:', err);
        }
    };





    const fetchStats = async () => {
        try {
            const token = getAuthToken();
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
            const token = getAuthToken();
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

    const handleMasterSync = async () => {
        const syncToast = toast.loading("Syncing with central database...");
        try {
            await Promise.all([fetchInventory(), fetchStats()]);
            toast.success("All inventory baselines synchronized", { id: syncToast });
        } catch (err) {
            toast.error("Sync failed. Check your connection.", { id: syncToast });
        }
    };

    const downloadHistoryCSV = () => {
        if (history.length === 0) return toast.error("No history to export");

        const headers = ["Donor Name,Email,Blood Type,Units,Date,Type,Notes"];
        const rows = history.map(h =>
            `${h.full_name},${h.email},${h.blood_type},${h.units || '1.0'},${new Date(h.created_at).toLocaleDateString()},${h.type || 'Verified'},"${h.notes || ''}"`
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
            const token = getAuthToken();
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
            const token = getAuthToken();
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
            const token = getAuthToken();
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
            const token = getAuthToken();
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

    const handleUpdateInventory = async (bloodGroup, newUnits, newThreshold = null) => {
        try {
            const token = getAuthToken();
            await axios.post('/api/organization/inventory/update',
                {
                    blood_group: bloodGroup,
                    units: parseInt(newUnits),
                    min_threshold: newThreshold !== null ? parseInt(newThreshold) : undefined
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Inventory updated");
            fetchInventory();
            fetchStats(); // Refresh stats too
        } catch (err) {
            toast.error("Update failed");
        }
    };

    const handleCreateRequest = async (e) => {
        e.preventDefault();
        try {
            const token = getAuthToken();
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
            const token = getAuthToken();
            await axios.put(`/api/organization/request/${id}/status`,
                { status: 'Cancelled' },
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
            const token = getAuthToken();
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
            const token = getAuthToken();
            await axios.post('/api/organization/verify',
                { donor_id: verificationResult.id, notes: 'Verified via Portal' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Donation verified & recorded");
            setVerificationResult(null);
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.error || "Verification failed");
        }
    };

    const handleAddMember = async (donorId) => {
        try {
            const token = getAuthToken();
            await axios.post('/api/organization/members/add',
                { donor_id: donorId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Donor added as Organization Member");
            // If they are in search result, we might want to refresh something, 
            // but usually search is transient.
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to add member");
        }
    };

    const fetchMembers = async () => {
        setMembersLoading(true);
        try {
            const token = getAuthToken();
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
            const token = getAuthToken();
            await axios.delete(`/api/organization/members/${donorId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Member removed");
            fetchMembers();
        } catch (err) {
            toast.error("Failed to remove member");
        }
    };

    const fetchDonorReports = async (donor) => {
        setSelectedDonor(donor);
        setShowReportsModal(true);
    };

    const validateMedicalForm = () => {
        const errors = {};
        const bpRegex = /^\d{2,3}\/\d{2,3}$/;

        if (!reportForm.hb_level || reportForm.hb_level < 5 || reportForm.hb_level > 25)
            errors.hb_level = "Invalid Hb (5-25 range)";
        if (!bpRegex.test(reportForm.blood_pressure))
            errors.blood_pressure = "Invalid format (e.g. 120/80)";
        if (!reportForm.pulse_rate || reportForm.pulse_rate < 40 || reportForm.pulse_rate > 200)
            errors.pulse_rate = "Pulse out of range (40-200)";
        if (!reportForm.temperature || reportForm.temperature < 35 || reportForm.temperature > 42)
            errors.temperature = "Temp out of range (35-42°C)";
        if (!reportForm.weight || reportForm.weight < 30 || reportForm.weight > 250)
            errors.weight = "Weight out of range (30-250kg)";

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const generateClinicalPDF = (report, donor) => {
        const doc = jsPDF();
        const dateStr = new Date(report.test_date).toLocaleDateString();

        // --- THEMED STYLING ---
        doc.setFillColor(248, 250, 252); // Slate 50 background
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(30, 41, 59); // Slate 800
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("CLINICAL VERIFICATION RECORD", 105, 25, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139); // Slate 400
        doc.text(`Official Medical Archive • Record ID: #RC-${report.id || 'N/A'}`, 105, 32, { align: "center" });

        // --- DONOR SECTION ---
        doc.setTextColor(15, 23, 42); // Slate 900
        doc.setFontSize(14);
        doc.text("PATIENT INFORMATION", 20, 55);
        doc.setLineWidth(0.5);
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.line(20, 58, 190, 58);

        doc.setFontSize(11);
        doc.text(`Name: ${donor.full_name}`, 20, 68);
        doc.text(`Digital Health ID: ${donor.donor_tag || '#DH-00' + (donor.donor_id || donor.id)}`, 20, 75);
        doc.text(`Verified Blood Group: ${report.blood_group}${report.rh_factor === 'Positive' ? '+' : '-'}`, 120, 68);
        doc.text(`Assessment Date: ${dateStr}`, 120, 75);

        // --- VITALS SECTION ---
        doc.text("CLINICAL VITALS", 20, 95);
        doc.line(20, 98, 190, 98);

        const vGridY = 108;
        const colW = 42;

        const vitals = [
            { label: "Hemoglobin", value: `${report.hb_level} g/dL` },
            { label: "Blood Pressure", value: `${report.blood_pressure} mmHg` },
            { label: "Pulse Rate", value: `${report.pulse_rate} BPM` },
            { label: "Temperature", value: `${report.temperature} °C` }
        ];

        vitals.forEach((v, i) => {
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(20 + (i * colW), vGridY, 35, 25, 3, 3, 'F');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(v.label, 37.5 + (i * colW), vGridY + 8, { align: "center" });
            doc.setFontSize(12);
            doc.setTextColor(15, 23, 42);
            doc.text(v.value, 37.5 + (i * colW), vGridY + 18, { align: "center" });
        });

        // --- SAFETY SCREENING ---
        doc.setFontSize(14);
        doc.text("LABORATORY SCREENING RESULTS", 20, 150);
        doc.line(20, 153, 190, 153);

        const screeningTests = [
            { name: "HIV", status: report.hiv_status },
            { name: "Hepatitis B (HBsAg)", status: report.hepatitis_b },
            { name: "Hepatitis C (HCV)", status: report.hepatitis_c },
            { name: "Syphilis (VDRL/RPR)", status: report.syphilis },
            { name: "Malaria (Antigen)", status: report.malaria }
        ];

        screeningTests.forEach((s, i) => {
            const y = 165 + (i * 12);
            doc.setFontSize(10);
            doc.setTextColor(51, 65, 85);
            doc.text(s.name, 25, y);

            const isNeg = s.status === 'Negative';
            if (isNeg) doc.setTextColor(16, 185, 129); // Emerald 500
            else doc.setTextColor(244, 63, 94); // Rose 500

            doc.setFont("helvetica", "bold");
            doc.text(s.status.toUpperCase(), 185, y, { align: "right" });
            doc.setFont("helvetica", "normal");

            doc.setDrawColor(241, 245, 249);
            doc.line(20, y + 4, 190, y + 4);
        });

        // --- NOTES ---
        if (report.notes) {
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(11);
            doc.text("CLINICAL ANNOTATIONS", 20, 235);
            doc.line(20, 238, 190, 238);
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            const splitNotes = doc.splitTextToSize(report.notes, 170);
            doc.text(splitNotes, 20, 246);
        }

        // --- FOOTER ---
        doc.setTextColor(148, 163, 184); // Slate 300
        doc.setFontSize(8);
        doc.text("Digitally authenticated and verified by " + (orgDetails?.name || "Medical Facility"), 105, 285, { align: "center" });
        doc.text("This is a computer-generated report and does not require a physical signature.", 105, 290, { align: "center" });

        doc.save(`Medical_Report_${donor.full_name.replace(' ', '_')}_${dateStr}.pdf`);
        toast.success("Medical Report Downloaded");
    };

    const handleAddReport = async (e) => {
        e.preventDefault();

        if (!validateMedicalForm()) {
            return toast.error("Please correct the clinical indicators");
        }

        try {
            const token = getAuthToken();
            await axios.post(`/api/organization/member/${selectedDonor.donor_id}/reports`, reportForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Clinical Record Authenticated");

            // Re-fetch reports to update history
            const res = await axios.get(`/api/organization/member/${selectedDonor.donor_id}/reports`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDonorReports(res.data);

            // Reset form for next entry
            setReportForm(prev => ({
                ...prev, hb_level: '', blood_pressure: '', pulse_rate: '', temperature: '', weight: '', notes: ''
            }));
            setFormErrors({});
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to add report");
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
        { id: 'verification', label: 'Donor Verification', icon: 'fa-user-check' },
        { id: 'members', label: 'Our Members', icon: 'fa-users' },
        { id: 'history', label: 'History', icon: 'fa-history' },
        { id: 'profile', label: 'Profile', icon: 'fa-id-card' },
    ];

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
            <style>
                {`
                @keyframes gradient {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient {
                    background-size: 200% 200%;
                    animation: gradient 3s ease infinite;
                }
                @keyframes progress {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-progress {
                    position: relative;
                    overflow: hidden;
                }
                .professional-shadow {
                    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                }
                .luxury-shadow {
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.035);
                }
                .status-dot-pulse {
                    position: relative;
                }
                .status-dot-pulse::after {
                    content: "";
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background: inherit;
                    border-radius: inherit;
                    animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                @keyframes pulse-ring {
                    0% { transform: scale(.95); opacity: 1; }
                    50% { transform: scale(1.5); opacity: 0.5; }
                    100% { transform: scale(.95); opacity: 1; }
                }
                `}
            </style>
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

                        <div
                            onClick={() => setActiveTab('profile')}
                            className="flex items-center gap-3 pl-6 border-l border-gray-100 cursor-pointer group"
                        >
                            <div className="text-right hidden md:block group-hover:opacity-80 transition-opacity">
                                <p className="text-sm font-bold text-gray-900">{user?.name || 'Organization'}</p>
                                <p className="text-xs font-semibold text-gray-400">{user?.type || 'Medical Facility'}</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-black text-lg shadow-inner group-hover:scale-105 transition-transform duration-300">
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
                                <div className="relative z-10 flex flex-col items-center text-center py-10">
                                    <div className="space-y-6 max-w-4xl">
                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-black uppercase tracking-widest mx-auto">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                            Facility Command Center
                                        </div>
                                        <h1 className="text-5xl md:text-7xl font-black text-white leading-tight tracking-tight">
                                            Blood Bank <span className="text-red-500">Intelligence.</span>
                                        </h1>
                                        <p className="text-gray-400 text-xl font-bold leading-relaxed max-w-2xl mx-auto">
                                            Stay ahead with real-time analytics, geographic donor insights, and predictive inventory alerts designed for medical facilities.
                                        </p>
                                        <div className="flex flex-wrap gap-6 justify-center pt-4">
                                            <button onClick={() => setActiveTab('verification')} className="px-10 py-5 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 flex items-center gap-3 active:scale-95 text-lg">
                                                <i className="fas fa-plus"></i>
                                                Verify Donation
                                            </button>
                                            <button onClick={() => setActiveTab('inventory')} className="px-10 py-5 bg-white/5 text-white font-black rounded-2xl hover:bg-white/10 transition-all border border-white/10 flex items-center gap-3 text-lg">
                                                <i className="fas fa-burn"></i>
                                                Blood Inventory
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full mt-16 max-w-6xl">
                                        {[
                                            { label: 'Total Impact', val: stats.verified_count, icon: 'fa-heart', color: 'text-red-400' },
                                            { label: 'Active Alerts', val: stats.active_requests, icon: 'fa-ambulance', color: 'text-blue-400' },
                                            { label: 'Units Stock', val: stats.total_units, icon: 'fa-burn', color: 'text-orange-400' },
                                            { label: 'Geo Reach', val: geoReach.length, icon: 'fa-globe', color: 'text-green-400' }
                                        ].map((box, i) => (
                                            <div key={i} className="p-8 bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-md hover:bg-white/10 transition-all">
                                                <i className={`fas ${box.icon} ${box.color} text-3xl mb-4`}></i>
                                                <p className="text-white text-4xl font-black tracking-tighter">{box.val}</p>
                                                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">{box.label}</p>
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
                                        {(() => {
                                            const lowStockItems = BLOOD_GROUPS.map(type => {
                                                const item = stats.inventory_breakdown?.find(i => i.blood_group === type);
                                                const units = item ? item.units : 0;
                                                const threshold = item ? item.min_threshold : 5;
                                                return { blood_group: type, units, min_threshold: threshold };
                                            }).filter(item => item.units < item.min_threshold);

                                            if (lowStockItems.length > 0) {
                                                return lowStockItems.slice(0, 4).map((item, i) => (
                                                    <div key={i} className="p-6 bg-red-50/50 border border-red-100 rounded-[2rem] flex items-center justify-between group animate-in slide-in-from-left-2 duration-300">
                                                        <div className="flex items-center gap-5">
                                                            <div className="w-14 h-14 rounded-2xl bg-white border border-red-100 flex flex-col items-center justify-center shadow-lg shadow-red-500/5">
                                                                <span className="text-red-600 font-black text-lg">{item.blood_group}</span>
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-gray-900">Critical Drop Detected</p>
                                                                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-1 flex items-center gap-2">
                                                                    <i className="fas fa-exclamation-triangle"></i>
                                                                    {item.units}U Available <span className="opacity-40">•</span> Target: {item.min_threshold}U
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => setActiveTab('emergency')} className="px-6 py-3 bg-red-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95">
                                                            Restock
                                                        </button>
                                                    </div>
                                                ));
                                            }

                                            return (
                                                <div className="p-10 border-2 border-dashed border-gray-100 rounded-[2.5rem] text-center bg-gray-50/30">
                                                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto mb-6 shadow-inner">
                                                        <i className="fas fa-shield-alt text-2xl"></i>
                                                    </div>
                                                    <p className="text-sm font-black text-gray-900 uppercase">Operational Status: Peak</p>
                                                    <p className="text-xs font-bold text-gray-400 mt-2">All stock thresholds are currently healthy.</p>
                                                </div>
                                            );
                                        })()}
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
                                                        act.type === 'Request' ? 'bg-blue-500' : 'bg-emerald-500'
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
                            {/* Modern Luxury Professional Header */}
                            <div className="bg-white px-10 py-8 rounded-[2rem] border border-gray-100 luxury-shadow flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
                                {/* Brand & Search Cloud */}
                                <div className="flex flex-col md:flex-row items-center gap-8 w-full lg:w-auto">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-200 rotate-3 transition-transform hover:rotate-0">
                                            <i className="fas fa-cubes text-xl"></i>
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                                Inventory <span className="text-gray-400 font-medium">Hub</span>
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="w-2 h-2 rounded-full bg-green-500 status-dot-pulse"></div>
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Real-time Telemetry</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="hidden md:block w-[1px] h-10 bg-gray-100"></div>

                                    <div className="relative w-full md:w-80 group">
                                        <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-red-500 transition-colors"></i>
                                        <input
                                            type="text"
                                            placeholder="Quick filter stock..."
                                            value={inventorySearch}
                                            onChange={e => setInventorySearch(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-transparent rounded-xl font-bold text-gray-900 outline-none focus:bg-white focus:border-red-500/10 focus:ring-4 focus:ring-red-500/5 transition-all text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Stats & Action Wing */}
                                <div className="flex flex-wrap items-center justify-center lg:justify-end gap-10 w-full lg:w-auto">
                                    <div className="flex items-center gap-8">
                                        <div className="text-center md:text-left">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 opacity-60">Network Volume</p>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl font-black text-gray-900 tracking-tighter">{stats.total_units}</span>
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Units</span>
                                            </div>
                                        </div>

                                        <div className="hidden sm:flex h-12 w-[1px] bg-gray-50"></div>

                                        <div className="text-center md:text-left">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 opacity-60">Status</p>
                                            <div className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-green-100/50 flex items-center gap-1.5">
                                                <i className="fas fa-shield-alt"></i> Optimal
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleMasterSync}
                                        className="px-6 py-3.5 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-red-600 transition-all shadow-xl shadow-gray-900/10 active:scale-95"
                                    >
                                        <i className="fas fa-sync-alt"></i> Master Sync
                                    </button>
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
                                        const fillPercentage = Math.min((units / Math.max(units, threshold, 20)) * 100, 100);

                                        return (
                                            <div
                                                key={type}
                                                className={`group relative bg-white rounded-[2rem] p-6 border-2 transition-all duration-300 hover-professional-shadow ${isLow
                                                    ? 'border-red-100 bg-red-50/10'
                                                    : 'border-gray-50 hover:border-gray-200'
                                                    }`}
                                            >
                                                {/* Card Header: Type & Action */}
                                                <div className="flex justify-between items-center mb-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg transition-colors ${isLow ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-gray-100 text-gray-900 group-hover:bg-gray-900 group-hover:text-white'
                                                            }`}>
                                                            {type.length > 5 ? type.split(' ').map(w => w[0]).join('') : type}
                                                        </div>
                                                        <div>
                                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Group Identifier</p>
                                                            <p className="text-xs font-bold text-gray-900">{type}</p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => {
                                                            const newThreshold = prompt(`Threshold for ${type}:`, threshold);
                                                            if (newThreshold !== null && !isNaN(newThreshold)) {
                                                                handleUpdateInventory(type, units, parseInt(newThreshold));
                                                            }
                                                        }}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-900 hover:bg-gray-100 transition-all"
                                                        title="Inventory Settings"
                                                    >
                                                        <i className="fas fa-cog text-xs"></i>
                                                    </button>
                                                </div>

                                                {/* Stats Section */}
                                                <div className="bg-gray-50/50 rounded-2xl p-4 mb-6 border border-gray-100/50">
                                                    <div className="flex items-end justify-between mb-2">
                                                        <div>
                                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Available Units</p>
                                                            <h3 className={`text-4xl font-black tracking-tighter ${isLow ? 'text-red-600' : 'text-gray-900'}`}>{units}</h3>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Minimum</p>
                                                            <p className={`text-xs font-bold ${isLow ? 'text-red-500' : 'text-gray-600'}`}>{threshold} U</p>
                                                        </div>
                                                    </div>

                                                    {/* Minimal Gauge */}
                                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-1000 ${isLow ? 'bg-red-500 animate-pulse' : 'bg-gray-900'
                                                                }`}
                                                            style={{ width: `${fillPercentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>

                                                {/* Streamlined Controls */}
                                                <div className="grid grid-cols-2 gap-3 mb-3">
                                                    <button
                                                        onClick={() => handleUpdateInventory(type, Math.max(0, units - 1), threshold)}
                                                        className="py-3 rounded-xl border border-gray-100 bg-white text-gray-400 hover:text-red-600 hover:border-red-100 transition-all flex items-center justify-center text-xs active:bg-gray-50"
                                                    >
                                                        <i className="fas fa-minus mr-2"></i> Reduce
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateInventory(type, units + 1, threshold)}
                                                        className="py-3 rounded-xl border border-gray-100 bg-white text-gray-400 hover:text-green-600 hover:border-green-100 transition-all flex items-center justify-center text-xs active:bg-gray-50"
                                                    >
                                                        <i className="fas fa-plus mr-2"></i> Stock Up
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        const newVal = prompt(`Units for ${type}:`, units);
                                                        if (newVal !== null && !isNaN(newVal)) handleUpdateInventory(type, parseInt(newVal), threshold);
                                                    }}
                                                    className="w-full py-3 bg-white text-gray-400 hover:text-gray-900 font-bold rounded-xl transition-all text-[9px] uppercase tracking-widest border border-gray-50 flex items-center justify-center gap-2"
                                                >
                                                    <i className="fas fa-keyboard opacity-50"></i> Manual Input
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'emergency' && (
                        <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in zoom-in-95 duration-500">
                            {/* Emergency Header */}
                            <div className="bg-gradient-to-r from-red-900 to-black rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 w-1/3 h-full bg-red-600/10 blur-[100px] pointer-events-none"></div>
                                <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                                    <div className="flex-1 space-y-5">
                                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-red-500/20 border border-red-500/20 rounded-full text-red-400 text-[10px] font-black uppercase tracking-widest">
                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                            Emergency Command Center
                                        </div>
                                        <h2 className="text-5xl font-black leading-tight tracking-tighter">Broadcast Life-Saving <span className="text-red-500 underline decoration-red-500/30 underline-offset-8">Alerts</span></h2>
                                        <p className="text-red-100/60 font-medium leading-relaxed text-lg max-w-2xl">
                                            Instantly notify all available donors in your network. Targeted alerts will be sent via Email and In-App notifications to exactly the right blood group donors.
                                        </p>
                                    </div>
                                    <div className="w-40 h-40 rounded-[2.5rem] bg-red-600/10 backdrop-blur-3xl border border-red-500/20 flex flex-col items-center justify-center shadow-2xl shadow-red-500/20 group hover:scale-105 transition-transform">
                                        <i className="fas fa-satellite-dish text-6xl text-red-500 mb-2 animate-bounce"></i>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-red-400/50">Live Pulse</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                                {/* Create Request Form - 3 Col */}
                                <div className="lg:col-span-3 space-y-8">
                                    <div className="bg-white rounded-[3.5rem] p-10 md:p-14 shadow-2xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full blur-[80px] -mr-32 -mt-32 opacity-50"></div>

                                        <div className="relative z-10 space-y-12">
                                            <div className="space-y-2">
                                                <h3 className="text-3xl font-black text-gray-900 tracking-tight">Compose Alert</h3>
                                                <p className="text-gray-400 font-bold text-sm">Define the urgency and requirements for your broadcast.</p>
                                            </div>

                                            <form onSubmit={handleCreateRequest} className="space-y-10">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-4">
                                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-6">Target Blood Group</label>
                                                        <div className="relative group">
                                                            <div className="absolute left-8 top-1/2 -translate-y-1/2 text-red-500 z-10">
                                                                <i className="fas fa-tint text-lg"></i>
                                                            </div>
                                                            <select
                                                                className="w-full pl-20 pr-10 py-6 bg-gray-50 border-none rounded-[2rem] font-bold text-gray-900 outline-none focus:ring-4 focus:ring-red-500/10 transition-all appearance-none shadow-inner"
                                                                value={requestForm.blood_group}
                                                                onChange={e => setRequestForm({ ...requestForm, blood_group: e.target.value })}
                                                            >
                                                                {BLOOD_GROUPS.map(t => (
                                                                    <option key={t} value={t}>{t}</option>
                                                                ))}
                                                            </select>
                                                            <div className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                                                                <i className="fas fa-chevron-down"></i>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-6">Required Volume (Units)</label>
                                                        <div className="relative">
                                                            <div className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400 z-10">
                                                                <i className="fas fa-vials text-lg"></i>
                                                            </div>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                placeholder="e.g. 5"
                                                                className="w-full pl-20 pr-8 py-6 bg-gray-50 border-none rounded-[2rem] font-bold text-gray-900 outline-none focus:ring-4 focus:ring-red-500/10 transition-all shadow-inner"
                                                                value={requestForm.units_required}
                                                                onChange={e => setRequestForm({ ...requestForm, units_required: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-6">Set Urgency Level</label>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        {[
                                                            { id: 'Critical', color: 'red', icon: 'fa-radiation' },
                                                            { id: 'High', color: 'orange', icon: 'fa-bolt' },
                                                            { id: 'Medium', color: 'blue', icon: 'fa-clock' }
                                                        ].map(level => (
                                                            <button
                                                                key={level.id}
                                                                type="button"
                                                                onClick={() => setRequestForm({ ...requestForm, urgency_level: level.id })}
                                                                className={`flex flex-col items-center justify-center py-6 rounded-[2rem] border-2 transition-all gap-2 ${requestForm.urgency_level === level.id
                                                                    ? `bg-${level.color}-600 border-${level.color}-600 text-white shadow-xl shadow-${level.color}-500/30 ring-4 ring-${level.color}-50`
                                                                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                                                    }`}
                                                            >
                                                                <i className={`fas ${level.icon} text-xl ${requestForm.urgency_level === level.id ? 'animate-pulse' : ''}`}></i>
                                                                <span className="text-[10px] font-black uppercase tracking-widest">{level.id}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-6">Situation Briefing</label>
                                                    <textarea
                                                        className="w-full px-10 py-8 bg-gray-50 border-none rounded-[2.5rem] font-bold text-gray-900 outline-none focus:ring-4 focus:ring-red-500/10 min-h-[160px] resize-none transition-all shadow-inner"
                                                        placeholder="Provide essential details to motivate donors and inform medical staff..."
                                                        value={requestForm.description}
                                                        onChange={e => setRequestForm({ ...requestForm, description: e.target.value })}
                                                    ></textarea>
                                                </div>

                                                <button type="submit" className="group w-full bg-gray-900 hover:bg-black text-white py-8 rounded-[2.5rem] font-black transition-all shadow-2xl shadow-gray-400/30 flex items-center justify-center gap-4 relative overflow-hidden active:scale-[0.98]">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    <span className="relative z-10 flex items-center gap-4 text-sm uppercase tracking-[0.2em]">
                                                        <i className="fas fa-broadcast-tower"></i>
                                                        Initialize Network Broadcast
                                                    </span>
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </div>

                                {/* Active Requests Queue - 2 Col */}
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="flex items-center justify-between px-6">
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Active Queue</h3>
                                        <span className="px-3 py-1 bg-red-100 text-red-600 text-[10px] font-black rounded-full shadow-sm">
                                            {requests.filter(r => r.status === 'Active').length} Pulse{requests.filter(r => r.status === 'Active').length !== 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    <div className="space-y-6 max-h-[900px] overflow-y-auto pr-2 scrollbar-hide">
                                        {requests.filter(r => r.status === 'Active').length === 0 ? (
                                            <div className="p-16 border-2 border-dashed border-gray-100 rounded-[3.5rem] bg-gray-50/50 text-center space-y-5">
                                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-gray-200 mx-auto shadow-inner">
                                                    <i className="fas fa-satellite-dish text-4xl"></i>
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-400 uppercase text-xs tracking-widest">Scanning Network</p>
                                                    <p className="text-gray-300 font-bold text-[10px] mt-1">No active emergency requests detected.</p>
                                                </div>
                                            </div>
                                        ) : (
                                            requests.filter(r => r.status === 'Active').map(req => (
                                                <div key={req.id} className="group bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/20 transition-all hover:shadow-2xl hover:border-red-100 animate-in slide-in-from-right-4 duration-500">
                                                    <div className="flex justify-between items-start mb-8">
                                                        <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${req.urgency_level === 'Critical' ? 'bg-red-600 text-white shadow-lg shadow-red-500/40' :
                                                            req.urgency_level === 'High' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/40' :
                                                                'bg-blue-500 text-white shadow-lg shadow-blue-500/40'
                                                            }`}>
                                                            <i className={`fas ${req.urgency_level === 'Critical' ? 'fa-fire' : 'fa-bolt'} text-[10px]`}></i>
                                                            {req.urgency_level}
                                                        </div>
                                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg">
                                                            {new Date(req.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-6 mb-10">
                                                        <div className="w-20 h-20 rounded-[2rem] bg-gray-900 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-gray-900/20 group-hover:scale-110 transition-transform duration-500">
                                                            {req.blood_group}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-gray-900 font-black text-xl leading-none">{req.units_required} Units</p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Requirement Volume</p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-gray-50 p-6 rounded-[2rem] mb-8 group-hover:bg-red-50/30 transition-colors">
                                                        <p className="text-xs text-gray-500 font-bold italic leading-relaxed">
                                                            "{req.description || 'No specific description provided for this emergency broadcast.'}"
                                                        </p>
                                                    </div>

                                                    <div className="flex gap-4">
                                                        <button
                                                            onClick={() => handleCloseRequest(req.id, 'Fulfilled')}
                                                            className="flex-1 py-4 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white font-black rounded-2xl transition-all text-[10px] uppercase tracking-widest border border-emerald-100/50 flex items-center justify-center gap-3 active:scale-95"
                                                        >
                                                            <i className="fas fa-check-double text-xs"></i>
                                                            Fulfilled
                                                        </button>
                                                        <button
                                                            onClick={() => handleCloseRequest(req.id, 'Cancelled')}
                                                            className="flex-1 py-4 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-black rounded-2xl transition-all text-[10px] uppercase tracking-widest border border-red-100/50 flex items-center justify-center gap-3 active:scale-95"
                                                        >
                                                            <i className="fas fa-times-circle text-xs"></i>
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}

                                        {/* Show history toggle */}
                                        <button className="w-full py-5 bg-gray-50 hover:bg-gray-100 text-gray-400 font-black rounded-[2rem] transition-all text-[9px] uppercase tracking-widest flex items-center justify-center gap-3 border border-gray-100">
                                            <i className="fas fa-archive"></i>
                                            History of Past Broadcasts
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
                                                    <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Units</th>
                                                    <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest hidden md:table-cell">Date</th>
                                                    <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Log Type</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {history.map(item => (
                                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="p-6">
                                                            <div className="font-bold text-gray-900">{item.full_name}</div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">{item.donor_tag}</span>
                                                                <div className="text-xs text-gray-400 font-medium block md:hidden">{item.email}</div>
                                                            </div>
                                                        </td>
                                                        <td className="p-6 hidden md:table-cell">
                                                            <div className="text-sm font-medium text-gray-600">{item.email}</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-red-50 text-red-700 font-black text-xs border border-red-100">
                                                                {item.blood_type}
                                                            </span>
                                                        </td>
                                                        <td className="p-6 text-center">
                                                            <span className="inline-flex items-center justify-center p-2 rounded-xl bg-gray-50 text-gray-900 font-black text-xs border border-gray-100 min-w-[50px]">
                                                                {item.units || '1.0'}
                                                            </span>
                                                        </td>
                                                        <td className="p-6 hidden md:table-cell">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-gray-900">
                                                                    {new Date(item.created_at).toLocaleDateString()}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400 font-medium">
                                                                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${item.type === 'Clinical' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                                                <i className={`fas ${item.type === 'Clinical' ? 'fa-file-medical' : 'fa-check-circle'} text-[10px]`}></i> {item.type || 'Verified'}
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
                                                                    <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{member.donor_tag}</div>
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
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => fetchDonorReports(member)}
                                                                    className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-all"
                                                                    title="View Reports"
                                                                >
                                                                    <i className="fas fa-file-medical"></i>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRemoveMember(member.donor_id)}
                                                                    className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-all"
                                                                    title="Remove Member"
                                                                >
                                                                    <i className="fas fa-user-minus"></i>
                                                                </button>
                                                            </div>
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

                    {activeTab === 'profile' && (
                        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
                                {/* Profile Header */}
                                <div className="relative h-48 bg-gradient-to-r from-red-600 to-red-500">
                                    <div className="absolute -bottom-16 left-10 p-2 bg-white rounded-3xl shadow-xl">
                                        <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 font-black text-5xl shadow-inner">
                                            {orgDetails?.name?.charAt(0) || user?.name?.charAt(0) || 'O'}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-24 pb-12 px-12">
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-12">
                                        <div>
                                            <h3 className="text-4xl font-black text-gray-900 tracking-tight">{orgDetails?.name || user?.name}</h3>
                                            {isEditingProfile ? (
                                                <select
                                                    value={editForm.type}
                                                    onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                                                    className="mt-2 bg-red-50 border-2 border-red-100 rounded-xl px-4 py-1 text-xs font-black text-red-600 uppercase tracking-widest outline-none focus:border-red-500 transition-all"
                                                >
                                                    <option value="Multi-Specialty Hospital">Multi-Specialty Hospital</option>
                                                    <option value="Blood Bank">Blood Bank</option>
                                                    <option value="Clinic">Specialized Clinic</option>
                                                </select>
                                            ) : (
                                                <p className="text-red-500 font-black uppercase tracking-[0.2em] text-xs mt-2 flex items-center gap-2">
                                                    <i className="fas fa-shield-alt"></i>
                                                    {orgDetails?.type || user?.type || 'Certified Medical Facility'}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => isEditingProfile ? handleUpdateProfile() : setIsEditingProfile(true)}
                                                className={`px-6 py-3 rounded-2xl font-black flex items-center gap-3 transition-all ${isEditingProfile ? 'bg-green-600 text-white hover:bg-green-700 shadow-xl shadow-green-600/20' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                                            >
                                                <i className={`fas ${isEditingProfile ? 'fa-check' : 'fa-edit'}`}></i>
                                                {isEditingProfile ? 'Save Profile' : 'Edit Profile'}
                                            </button>
                                            {isEditingProfile && (
                                                <button
                                                    onClick={() => setIsEditingProfile(false)}
                                                    className="px-6 py-3 bg-red-100 text-red-600 rounded-2xl font-black hover:bg-red-200 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            {!isEditingProfile && (
                                                <div className="px-6 py-3 bg-green-50 text-green-700 rounded-2xl font-black flex items-center gap-3 border border-green-100">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                    Active Status
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {profileLoading ? (
                                        <div className="py-20 text-center">
                                            <i className="fas fa-circle-notch fa-spin text-4xl text-gray-200"></i>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-8">
                                                <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100 transition-all hover:border-gray-200">
                                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm border border-gray-100">
                                                        <i className="fas fa-user-tag text-xl"></i>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Facility Name</p>
                                                        {isEditingProfile ? (
                                                            <input
                                                                type="text"
                                                                value={editForm.name}
                                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                                className="w-full bg-white border-2 border-red-500/20 rounded-xl px-4 py-2 font-bold text-gray-900 focus:border-red-500 outline-none transition-all"
                                                            />
                                                        ) : (
                                                            <p className="text-lg font-bold text-gray-900 leading-tight">{orgDetails?.name || 'N/A'}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100 transition-all hover:border-gray-200">
                                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm border border-gray-100">
                                                        <i className="fas fa-phone text-xl"></i>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Contact Number</p>
                                                        {isEditingProfile ? (
                                                            <input
                                                                type="text"
                                                                value={editForm.phone}
                                                                onChange={e => {
                                                                    const val = e.target.value.replace(/\D/g, '');
                                                                    if (val.length <= 10) setEditForm({ ...editForm, phone: val });
                                                                }}
                                                                className="w-full bg-white border-2 border-red-500/20 rounded-xl px-4 py-2 font-bold text-gray-900 focus:border-red-500 outline-none transition-all"
                                                                placeholder="10-digit number"
                                                            />
                                                        ) : (
                                                            <p className="text-lg font-bold text-gray-900 leading-tight">{orgDetails?.phone || 'N/A'}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100 transition-all hover:border-gray-200">
                                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-400 shadow-sm border border-gray-100">
                                                        <i className="fas fa-envelope text-xl"></i>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Official Email</p>
                                                        {isEditingProfile ? (
                                                            <input
                                                                type="email"
                                                                value={editForm.email}
                                                                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                                                className="w-full bg-white border-2 border-red-500/20 rounded-xl px-4 py-2 font-bold text-gray-900 focus:border-red-500 outline-none transition-all"
                                                                placeholder="organization@email.com"
                                                            />
                                                        ) : (
                                                            <p className="text-lg font-bold text-gray-900 leading-tight">{orgDetails?.email || 'N/A'}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100 transition-all hover:border-gray-200">
                                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm border border-gray-100">
                                                        <i className="fas fa-certificate text-xl"></i>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">License Number</p>
                                                        {isEditingProfile ? (
                                                            <input
                                                                type="text"
                                                                value={editForm.license_number}
                                                                onChange={e => setEditForm({ ...editForm, license_number: e.target.value })}
                                                                className="w-full bg-white border-2 border-red-500/20 rounded-xl px-4 py-2 font-bold text-gray-900 focus:border-red-500 outline-none transition-all"
                                                            />
                                                        ) : (
                                                            <p className="text-lg font-bold text-gray-900 leading-tight uppercase font-mono">{orgDetails?.license_number || 'N/A'}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-8">
                                                <div className="p-8 bg-gray-900 rounded-[2.5rem] text-white relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform">
                                                        <i className="fas fa-location-arrow text-6xl"></i>
                                                    </div>
                                                    <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] mb-4">Facility Location</p>
                                                    <div className="space-y-4 relative z-10">
                                                        {isEditingProfile ? (
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="col-span-2">
                                                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Full Address</label>
                                                                    <textarea
                                                                        value={editForm.address}
                                                                        onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                                                                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 font-bold text-white focus:border-red-500 outline-none transition-all text-sm"
                                                                        rows="2"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">City</label>
                                                                    <input
                                                                        type="text"
                                                                        value={editForm.city}
                                                                        onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                                                                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 font-bold text-white focus:border-red-500 outline-none transition-all text-sm"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">District</label>
                                                                    <input
                                                                        type="text"
                                                                        value={editForm.district}
                                                                        onChange={e => setEditForm({ ...editForm, district: e.target.value })}
                                                                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 font-bold text-white focus:border-red-500 outline-none transition-all text-sm"
                                                                    />
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">State</label>
                                                                    <input
                                                                        type="text"
                                                                        value={editForm.state}
                                                                        onChange={e => setEditForm({ ...editForm, state: e.target.value })}
                                                                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 font-bold text-white focus:border-red-500 outline-none transition-all text-sm"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <h4 className="text-2xl font-black tracking-tight">{orgDetails?.city}, {orgDetails?.state}</h4>
                                                                <p className="text-gray-400 font-bold leading-relaxed">{orgDetails?.address}</p>
                                                                <div className="pt-4 flex gap-4">
                                                                    <div className="px-4 py-2 bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest">
                                                                        District: {orgDetails?.district}
                                                                    </div>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm">
                                                    <div className="flex items-center justify-between mb-6">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Insights</p>
                                                        <i className="fas fa-history text-gray-200 font-black"></i>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center text-sm font-bold">
                                                            <span className="text-gray-400">Registered On</span>
                                                            <span className="text-gray-900">{orgDetails?.created_at ? new Date(orgDetails?.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</span>
                                                        </div>
                                                        <div className="pt-4 border-t border-gray-50 flex gap-4">
                                                            <div className="flex-1 p-4 bg-gray-50 rounded-2xl text-center">
                                                                <p className="text-2xl font-black text-gray-900">{stats.verified_count}</p>
                                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">Life Saved (Donations)</p>
                                                            </div>
                                                            <div className="flex-1 p-4 bg-gray-50 rounded-2xl text-center">
                                                                <p className="text-2xl font-black text-gray-900">{members.length}</p>
                                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">Rescue Network</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
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
                                                    <p className="text-gray-500 font-medium mb-2">{verificationResult.phone}</p>
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white px-2 py-1 rounded border border-gray-100">{verificationResult.donor_tag}</span>
                                                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${verificationResult.availability === 'Available' ? 'bg-green-100 text-green-600 border border-green-200' : 'bg-red-100 text-red-600 border border-red-200'}`}>
                                                            {verificationResult.availability}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <button
                                                    onClick={handleVerifyDonation}
                                                    disabled={verificationResult.availability !== 'Available'}
                                                    className={`flex-1 font-bold py-4 rounded-2xl transition-all shadow-lg ${verificationResult.availability === 'Available'
                                                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/20'
                                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'}`}
                                                >
                                                    {verificationResult.availability === 'Available' ? 'Confirm Donation & Verify' : 'Unavailable for Donation'}
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

                {/* --- PROFESSIONAL DIGITAL MEDICAL ARCHIVE --- */}
                {showReportsModal && (
                    <MedicalReports
                        selectedDonor={selectedDonor}
                        orgDetails={orgDetails}
                        onClose={() => setShowReportsModal(false)}
                    />
                )}
            </div >
        </div >
    );
}
