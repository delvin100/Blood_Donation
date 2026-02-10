import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import BackToTop from '../../components/common/BackToTop';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import ModernModal from '../../components/common/ModernModal';

// --- COLORS & THEME ---
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];

// --- HELPERS ---
const toTitleCase = (str) => {
    if (!str) return '';
    return str.split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
};

export default function AdminDashboard() {
    // --- STATE ---
    const [stats, setStats] = useState({ donors: 0, organizations: 0, bloodUnits: 0 });
    const [data, setData] = useState({
        donors: [],
        organizations: [],
        inventory: [],
        requests: [],
        reports: [],
        admins: [],
        activityLogs: []
    });
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddAdminModal, setShowAddAdminModal] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
    const [broadcast, setBroadcast] = useState({ target: 'all', recipient_type: 'Donor', recipient_ids: [], title: '', message: '' });
    const [sendingBroadcast, setSendingBroadcast] = useState(false);
    const [selectedDonor, setSelectedDonor] = useState(null);
    const [selectedReport, setSelectedReport] = useState(null);
    const [selectedOrg, setSelectedOrg] = useState(null); // For Detail View
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile Menu State
    const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false); // New state for Add Admin
    const [user, setUser] = useState(null); // Added user state

    // Modern Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: '',
        message: '',
        confirmText: 'Confirm',
        onConfirm: () => { },
        type: 'info'
    });

    const navigate = useNavigate();

    // --- FETCH DATA ---
    const getAuthConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } });

    const fetchAllData = async () => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            navigate('/admin/login');
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const baseUrl = '/api/admin';

            const [statsRes, donorsRes, orgsRes, invRes, reqRes, repRes, adminsRes, logsRes] = await Promise.all([
                axios.get(`${baseUrl}/stats`, config),
                axios.get(`${baseUrl}/donors`, config),
                axios.get(`${baseUrl}/organizations`, config),
                axios.get(`${baseUrl}/inventory`, config),
                axios.get(`${baseUrl}/requests`, config),
                axios.get(`${baseUrl}/reports`, config),
                axios.get(`${baseUrl}/admins`, config),
                axios.get(`${baseUrl}/activity-logs`, config)
            ]);

            setStats(statsRes.data);
            setData({
                donors: donorsRes.data,
                organizations: orgsRes.data,
                inventory: invRes.data,
                requests: reqRes.data,
                reports: repRes.data,
                admins: adminsRes.data,
                activityLogs: logsRes.data
            });
            setLoading(false);
        } catch (err) {
            console.error(err);
            if (err.response?.status === 403 || err.response?.status === 401) {
                toast.error('Session expired');
                navigate('/admin/login');
            } else {
                const msg = err.response?.data?.error || err.message || 'Failed to update dashboard';
                toast.error(msg);
            }
            setLoading(false);
        }
    };

    useEffect(() => {
        const storedAdmin = localStorage.getItem('adminUser');
        if (storedAdmin) {
            setUser(JSON.parse(storedAdmin));
        }
        fetchAllData();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/');
    };

    // --- ACTIONS ---

    const handleDeleteDonor = async (id) => {
        setModalConfig({
            title: 'Delete Donor?',
            message: 'Are you sure you want to permanently delete this donor? This action cannot be undone.',
            confirmText: 'Delete',
            type: 'danger',
            onConfirm: async () => {
                setIsModalOpen(false);
                try {
                    await axios.delete(`/api/admin/donors/${id}`, getAuthConfig());
                    toast.success('Donor deleted');
                    fetchAllData();
                } catch (error) {
                    toast.error('Failed to delete');
                }
            }
        });
        setIsModalOpen(true);
    };

    const handleDeleteOrg = async (id) => {
        setModalConfig({
            title: 'Delete Organization?',
            message: 'Are you sure you want to delete this organization? All associated data will be removed.',
            confirmText: 'Delete',
            type: 'danger',
            onConfirm: async () => {
                setIsModalOpen(false);
                try {
                    await axios.delete(`/api/admin/organizations/${id}`, getAuthConfig());
                    toast.success('Organization deleted');
                    if (selectedOrg?.id === id) setSelectedOrg(null);
                    fetchAllData();
                } catch (error) { toast.error('Failed to delete'); }
            }
        });
        setIsModalOpen(true);
    };

    const handleVerifyOrg = async (id) => {
        try {
            await axios.put(`/api/admin/organizations/${id}/verify`, {}, getAuthConfig());
            toast.success('Status updated');
            if (selectedOrg && selectedOrg.id === id) {
                // Update local state if viewing details
                const updated = { ...selectedOrg, verified: !selectedOrg.verified };
                setSelectedOrg(updated);
            }
            fetchAllData();
        } catch (error) {
            const msg = error.response?.data?.error || 'Failed to update';
            toast.error(msg);
        }
    };

    const handleViewOrg = async (id) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/admin/organizations/${id}`, getAuthConfig());
            setSelectedOrg(res.data);
            setActiveTab('orgs'); // Ensure we are on the orgs tab
        } catch (error) {
            toast.error('Failed to fetch details');
        } finally {
            setLoading(false);
        }
    };

    const handleBackToOrgList = () => {
        setSelectedOrg(null);
    };

    const handleViewDonor = async (id) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/admin/donors/${id}`, getAuthConfig());
            setSelectedDonor(res.data);
            setActiveTab('donors');
        } catch (error) {
            toast.error('Failed to fetch donor details');
        } finally {
            setLoading(false);
        }
    };

    const handleBackToDonorList = () => {
        setSelectedDonor(null);
    };

    const handleViewReport = async (id) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/admin/reports/${id}`, getAuthConfig());
            setSelectedReport(res.data);
            setActiveTab('reports');
        } catch (error) {
            toast.error('Failed to fetch report details');
        } finally {
            setLoading(false);
        }
    };

    const handleBackToReportList = () => {
        setSelectedReport(null);
    };


    const handleAddAdmin = async (e) => {
        e.preventDefault();
        setIsSubmittingAdmin(true);
        try {
            await axios.post('/api/admin/admins', newAdmin, getAuthConfig());
            toast.success('Admin added successfully');
            setShowAddAdminModal(false);
            setNewAdmin({ username: '', password: '' });
            fetchAllData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to add admin');
        } finally {
            setIsSubmittingAdmin(false);
        }
    };

    const handleDeleteAdmin = async (id) => {
        // Prevent deleting self or super admin
        const adminToDelete = data.admins.find(a => a.id === id);
        if (adminToDelete?.username === 'admin') {
            return toast.error("Super admin account cannot be deleted");
        }

        setModalConfig({
            title: 'Delete Admin?',
            message: 'Are you sure you want to revoke admin privileges for this user?',
            confirmText: 'Delete',
            type: 'danger',
            onConfirm: async () => {
                setIsModalOpen(false);
                try {
                    await axios.delete(`/api/admin/admins/${id}`, getAuthConfig());
                    toast.success('Admin deleted');
                    fetchAllData();
                } catch (error) {
                    toast.error(error.response?.data?.error || 'Failed to delete');
                }
            }
        });
        setIsModalOpen(true);
    };

    const handleToggleAdminStatus = async (id) => {
        const adminToToggle = data.admins.find(a => a.id === id);
        if (adminToToggle?.username === 'admin') {
            return toast.error("Super admin account cannot be disabled");
        }

        try {
            await axios.put(`/api/admin/admins/${id}/status`, {}, getAuthConfig());
            toast.success('Admin status updated');
            fetchAllData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update status');
        }
    };

    const handleBroadcast = async (e) => {
        e.preventDefault();
        setSendingBroadcast(true);
        try {
            await axios.post('/api/admin/notifications', broadcast, getAuthConfig());
            toast.success('Broadcast sent successfully!');
            setBroadcast({ target: 'all', recipient_type: 'Donor', recipient_ids: [], title: '', message: '' });
        } catch (error) {
            toast.error('Failed to send broadcast');
        } finally {
            setSendingBroadcast(false);
        }
    };

    // --- FILTERING ---
    const filteredData = useMemo(() => {
        const term = searchTerm.toLowerCase();
        if (!term) return data;

        const filters = {
            donors: (item) =>
                item.full_name?.toLowerCase().includes(term) ||
                item.email?.toLowerCase().includes(term) ||
                item.phone?.toLowerCase().includes(term),
            organizations: (item) =>
                item.name?.toLowerCase().includes(term) ||
                item.email?.toLowerCase().includes(term) ||
                item.phone?.toLowerCase().includes(term),
            admins: (item) => item.username?.toLowerCase().includes(term),
            inventory: (item) => item.blood_group?.toLowerCase().includes(term) || item.org_name?.toLowerCase().includes(term),
            requests: (item) => item.blood_group?.toLowerCase().includes(term) || item.org_name?.toLowerCase().includes(term),
            reports: (item) => item.donor_name?.toLowerCase().includes(term) || item.org_name?.toLowerCase().includes(term),
            activityLogs: (item) =>
                item.origin_name?.toLowerCase().includes(term) ||
                item.action_type?.toLowerCase().includes(term) ||
                item.description?.toLowerCase().includes(term),
        };

        // Determine which data key to filter
        let dataKey = activeTab;
        if (activeTab === 'orgs') dataKey = 'organizations';
        if (activeTab === 'logs') dataKey = 'activityLogs';

        if (filters[dataKey] && data[dataKey]) {
            return {
                ...data,
                [dataKey]: data[dataKey].filter(filters[dataKey])
            };
        }
        return data;
    }, [data, searchTerm, activeTab]);


    if (loading) return <LoadingScreen />;

    return (
        <div className="flex h-screen bg-[#F3F4F6] font-sans overflow-hidden relative selection:bg-red-100 selection:text-red-900">

            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-200/40 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[100px]" />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
            )}

            {/* Sidebar (Floating & Reponsive) */}
            <div className={`
                fixed md:static inset-y-0 left-0 z-50 h-screen p-4 w-72 md:w-80 transition-transform duration-300 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <Sidebar activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); setSearchTerm(''); setSelectedOrg(null); setSelectedDonor(null); setSelectedReport(null); setIsMobileMenuOpen(false); }} handleLogout={handleLogout} />
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto z-10 flex flex-col relative w-full">
                {/* Mobile Header Toggle */}
                <div className="md:hidden p-4 flex items-center justify-between pb-0">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-700">
                        <i className="fas fa-bars text-xl"></i>
                    </button>
                    <span className="font-black text-gray-800 text-lg">eBloodBank Admin</span>
                    <div className="w-10"></div> {/* Spacer */}
                </div>

                <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8">

                    {/* Header with Search */}
                    {!selectedOrg && !selectedDonor && !selectedReport && (
                        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-in-down">
                            <div>
                                <h1 className="text-3xl font-black text-gray-800 tracking-tight">
                                    {activeTab === 'dashboard' && 'Overview'}
                                    {activeTab === 'donors' && 'Donors Database'}
                                    {activeTab === 'orgs' && 'Partners & Organizations'}
                                    {activeTab === 'inventory' && 'Blood Inventory'}
                                    {activeTab === 'requests' && 'Emergencies'}
                                    {activeTab === 'reports' && 'Reports History'}
                                    {activeTab === 'admins' && 'System Admins'}
                                    {activeTab === 'broadcast' && 'Broadcasts'}
                                    {activeTab === 'logs' && 'Platform Activity Logs'}
                                </h1>
                                <p className="text-gray-500 font-medium mt-1">Dashboard / {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</p>
                            </div>

                            {activeTab !== 'dashboard' && activeTab !== 'broadcast' && activeTab !== 'inventory' && activeTab !== 'requests' && activeTab !== 'reports' && activeTab !== 'admins' && activeTab !== 'logs' && (
                                <div className="relative w-full md:w-96 group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <i className="fas fa-search text-gray-400 group-focus-within:text-red-500 transition-colors"></i>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={`Search ${activeTab}...`}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 border-none rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/50 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all text-sm font-medium hover:shadow-md"
                                    />
                                </div>
                            )}
                        </header>
                    )}

                    {/* CONTENT VIEWS */}
                    <div className="animate-fade-in-up">
                        {activeTab === 'dashboard' && (
                            <DashboardHome stats={stats} data={data} setActiveTab={setActiveTab} />
                        )}

                        {activeTab === 'donors' && (
                            selectedDonor ? (
                                <DonorDetailView
                                    donor={selectedDonor}
                                    onBack={handleBackToDonorList}
                                />
                            ) : (
                                <DataTable
                                    columns={['Profile', 'Blood Group', 'Location', 'Status', 'Actions']}
                                    data={filteredData.donors}
                                    renderRow={(donor) => (
                                        <tr key={donor.id} onClick={() => handleViewDonor(donor.id)} className="cursor-pointer hover:bg-red-50/30 transition-all border-b border-gray-100 last:border-0 group">
                                            <td className="px-6 py-4 text-left">
                                                <div className="flex items-center justify-start gap-4">
                                                    <Avatar name={donor.full_name} className="shadow-md" />
                                                    <div className="text-left">
                                                        <div className="font-bold text-gray-900 group-hover:text-red-600 transition-colors">{toTitleCase(donor.full_name)}</div>
                                                        <div className="text-xs text-gray-500 font-medium">{donor.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center"><Badge type="blood">{donor.blood_type}</Badge></td>
                                            <td className="px-6 py-4 text-center text-sm font-medium text-gray-600">{donor.city}, {donor.district}, {donor.state}</td>
                                            <td className="px-6 py-4 text-center"><Badge status={donor.availability === 'Available' ? 'success' : 'warning'}>{donor.availability}</Badge></td>
                                            <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-center items-center gap-2">
                                                    <button
                                                        onClick={() => handleViewDonor(donor.id)}
                                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <i className="fas fa-eye"></i>
                                                    </button>
                                                    <DeleteButton onClick={() => handleDeleteDonor(donor.id)} />
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                />
                            )
                        )}

                        {activeTab === 'orgs' && (
                            selectedOrg ? (
                                <OrgDetailView
                                    org={selectedOrg}
                                    onBack={handleBackToOrgList}
                                    onVerify={() => handleVerifyOrg(selectedOrg.id)}
                                    onDelete={() => handleDeleteOrg(selectedOrg.id)}
                                />
                            ) : (
                                <DataTable
                                    columns={['Organization', 'Type', 'Location', 'Verification', 'Actions']}
                                    data={filteredData.organizations}
                                    renderRow={(org) => (
                                        <tr key={org.id} onClick={() => handleViewOrg(org.id)} className="cursor-pointer hover:bg-blue-50/30 transition-all border-b border-gray-100 last:border-0 group">
                                            <td className="px-6 py-4 text-left">
                                                <div className="flex items-center justify-start gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-blue-500 text-xl group-hover:scale-110 transition-transform duration-300">
                                                        <i className="fas fa-hospital-alt"></i>
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{toTitleCase(org.name)}</div>
                                                        <div className="text-xs text-gray-500 font-medium">{org.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-medium text-gray-600">{org.type}</td>
                                            <td className="px-6 py-4 text-center text-sm font-medium text-gray-600">{org.city}, {org.district}, {org.state}</td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge status={org.verified ? 'success' : 'pending'}>{org.verified ? 'Verified' : 'Pending'}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-center items-center gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleVerifyOrg(org.id); }}
                                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${org.verified ? 'bg-white border-red-200 text-red-600 hover:bg-red-50' : 'bg-green-500 text-white border-transparent hover:bg-green-600 shadow-md shadow-green-200'}`}
                                                    >
                                                        {org.verified ? 'Disable' : 'Enable'}
                                                    </button>
                                                    <DeleteButton onClick={(e) => { e.stopPropagation(); handleDeleteOrg(org.id); }} />
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                />
                            )
                        )}

                        {activeTab === 'admins' && (
                            <>
                                {user?.username === 'admin' && (
                                    <div className="mb-6 flex justify-end">
                                        <button
                                            onClick={() => setShowAddAdminModal(true)}
                                            className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition-all hover:shadow-lg shadow-gray-900/20 flex items-center gap-2 transform hover:-translate-y-0.5"
                                        >
                                            <i className="fas fa-plus"></i> <span className="ml-1">Add New Admin</span>
                                        </button>
                                    </div>
                                )}
                                <DataTable
                                    columns={['Admin User', 'Created At', 'Status', 'Actions']}
                                    data={filteredData.admins}
                                    renderRow={(admin) => (
                                        <tr key={admin.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0">
                                            <td className="px-6 py-4 text-left">
                                                <div className="flex items-center justify-start gap-4">
                                                    <Avatar name={admin.username} bg="bg-gray-900" text="text-white" />
                                                    <span className="font-bold text-gray-900">{admin.username}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-medium text-gray-500">
                                                {new Date(admin.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge status={admin.status === 'Active' ? 'success' : 'pending'}>
                                                    {admin.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {user?.username === 'admin' && (
                                                    <div className="flex justify-center items-center gap-3">
                                                        <button
                                                            onClick={() => handleToggleAdminStatus(admin.id)}
                                                            disabled={admin.username === 'admin'}
                                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${admin.username === 'admin' ? 'opacity-20 cursor-not-allowed hidden' : ''} ${admin.status === 'Active' ? 'bg-white border-red-200 text-red-600 hover:bg-red-50' : 'bg-green-500 text-white border-transparent hover:bg-green-600 shadow-md shadow-green-200'}`}
                                                        >
                                                            {admin.status === 'Active' ? 'Disable' : 'Enable'}
                                                        </button>
                                                        {admin.username !== 'admin' && (
                                                            <button
                                                                onClick={() => handleDeleteAdmin(admin.id)}
                                                                className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                {user?.username !== 'admin' && (
                                                    <span className="text-gray-400 text-xs italic font-medium">No Actions</span>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                />
                            </>
                        )}

                        {activeTab === 'broadcast' && (
                            <div className="max-w-3xl mx-auto mt-8">
                                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-10 border border-white relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-pink-500"></div>

                                    <div className="text-center mb-10">
                                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 text-3xl shadow-inner">
                                            <i className="fas fa-bullhorn"></i>
                                        </div>
                                        <h2 className="text-3xl font-black text-gray-800 mb-2">Broadcast Center</h2>
                                        <p className="text-gray-500 max-w-md mx-auto">Send mass notifications to your users. Please use this feature responsibly.</p>
                                    </div>

                                    <form onSubmit={handleBroadcast} className="space-y-8">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Target Audience</label>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {['all', 'donors', 'organizations', 'specific'].map(t => (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => setBroadcast({ ...broadcast, target: t })}
                                                        className={`py-3 rounded-xl text-sm font-bold border-2 transition-all
                                                            ${broadcast.target === t
                                                                ? 'bg-gray-900 text-white border-gray-900 shadow-lg transform scale-[1.02]'
                                                                : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:text-gray-700'
                                                            }`}
                                                    >
                                                        {t === 'all' ? 'Everyone' : t.charAt(0).toUpperCase() + t.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {broadcast.target === 'specific' && (
                                            <div className="space-y-6 animate-fade-in">
                                                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                                                    <label className="block text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Recipient Type</label>
                                                    <div className="flex gap-4">
                                                        {['Donor', 'Organization'].map(type => (
                                                            <button
                                                                key={type}
                                                                type="button"
                                                                onClick={() => setBroadcast({ ...broadcast, recipient_type: type, recipient_ids: [] })}
                                                                className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all
                                                                    ${broadcast.recipient_type === type
                                                                        ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-200'
                                                                        : 'bg-white text-gray-500 border-gray-200 hover:border-red-200 hover:text-red-500'
                                                                    }`}
                                                            >
                                                                {type}s
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">Select Recipients</label>
                                                        <span className="text-[10px] font-black bg-gray-200 text-gray-600 px-3 py-1 rounded-full uppercase">
                                                            {broadcast.recipient_ids.length} Selected
                                                        </span>
                                                    </div>

                                                    <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                                                        {(broadcast.recipient_type === 'Donor' ? data.donors : data.organizations).map(item => {
                                                            const isSelected = broadcast.recipient_ids.includes(item.id);
                                                            const name = item.full_name || item.name;
                                                            return (
                                                                <div
                                                                    key={item.id}
                                                                    onClick={() => {
                                                                        const ids = isSelected
                                                                            ? broadcast.recipient_ids.filter(id => id !== item.id)
                                                                            : [...broadcast.recipient_ids, item.id];
                                                                        setBroadcast({ ...broadcast, recipient_ids: ids });
                                                                    }}
                                                                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border-2 transition-all
                                                                        ${isSelected
                                                                            ? 'bg-white border-red-500 shadow-sm'
                                                                            : 'bg-white/50 border-transparent hover:border-gray-200'}`}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <Avatar name={name} size="w-8 h-8" />
                                                                        <div>
                                                                            <div className="text-sm font-bold text-gray-900">{toTitleCase(name)}</div>
                                                                            <div className="text-[10px] text-gray-500 font-medium">{item.email}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                                                                        ${isSelected ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300'}`}>
                                                                        {isSelected && <i className="fas fa-check text-[10px]"></i>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Subject</label>
                                                <input
                                                    type="text"
                                                    required
                                                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-red-500 focus:ring-0 transition-all font-medium"
                                                    placeholder="e.g. Urgent Blood Alert: O+"
                                                    value={broadcast.title}
                                                    onChange={(e) => setBroadcast({ ...broadcast, title: e.target.value })}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Message Body</label>
                                                <textarea
                                                    required
                                                    rows="5"
                                                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-red-500 focus:ring-0 transition-all resize-none font-medium"
                                                    placeholder="Type your important message here..."
                                                    value={broadcast.message}
                                                    onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })}
                                                ></textarea>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={sendingBroadcast}
                                            className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold py-4 rounded-xl shadow-xl shadow-red-500/30 hover:shadow-red-500/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 text-lg"
                                        >
                                            {sendingBroadcast ? (
                                                <i className="fas fa-spinner animate-spin"></i>
                                            ) : (
                                                <>
                                                    <i className="fas fa-paper-plane"></i> Send Broadcast
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Other tabs like Inventory and Requests can reuse DataTable or custom views */}
                        {activeTab === 'inventory' && (
                            <InventoryMatrixView inventory={data.inventory} allOrganizations={data.organizations} allData={data} />
                        )}

                        {activeTab === 'requests' && (
                            <DataTable
                                columns={['Org', 'Blood Group', 'Units', 'Status', 'Date']}
                                data={filteredData.requests}
                                renderRow={(req) => (
                                    <tr key={req.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0">
                                        <td className="px-6 py-4 font-bold text-gray-900 text-center">{req.org_name}</td>
                                        <td className="px-6 py-4 text-center"><span className="text-red-600 font-black">{req.blood_group}</span></td>
                                        <td className="px-6 py-4 text-center text-gray-700 font-bold">{req.units_required}</td>
                                        <td className="px-6 py-4 text-center"><Badge status={req.status === 'Active' ? 'warning' : 'success'}>{req.status}</Badge></td>
                                        <td className="px-6 py-4 text-center text-sm font-medium text-gray-500">{new Date(req.created_at).toLocaleDateString()}</td>
                                    </tr>
                                )}
                            />
                        )}

                        {activeTab === 'reports' && (
                            selectedReport ? (
                                <ReportDetailView
                                    report={selectedReport}
                                    onBack={handleBackToReportList}
                                />
                            ) : (
                                <DataTable
                                    columns={['Date', 'Donor', 'Blood Group', 'Org', 'Vitals', 'Actions']}
                                    data={filteredData.reports}
                                    renderRow={(report) => (
                                        <tr key={report.id} onClick={() => handleViewReport(report.id)} className="cursor-pointer hover:bg-gray-50 transition-all border-b border-gray-100 last:border-0">
                                            <td className="px-6 py-4 text-center text-sm font-medium text-gray-500">{new Date(report.test_date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="font-bold text-gray-900">{report.donor_name}</div>
                                                <div className="text-xs text-gray-400 font-medium">{report.donor_email}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-black text-red-600">{report.blood_type}</td>
                                            <td className="px-6 py-4 text-center text-sm font-medium text-gray-700">{report.org_name}</td>
                                            <td className="px-6 py-4 text-center text-xs font-semibold text-gray-500 space-y-1">
                                                <div className="flex justify-center gap-2"><span className="text-gray-400">BP:</span> {report.blood_pressure}</div>
                                                <div className="flex justify-center gap-2"><span className="text-gray-400">HB:</span> {report.hb_level}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleViewReport(report.id)}
                                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View Report"
                                                    >
                                                        <i className="fas fa-file-medical"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                />
                            ))}

                        {activeTab === 'logs' && (
                            <ActivityLogsView logs={data.activityLogs} />
                        )}
                    </div>
                </div>
            </main>

            {/* MODALS */}
            {showAddAdminModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-zoom-in relative">
                        <button onClick={() => setShowAddAdminModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <i className="fas fa-times text-xl"></i>
                        </button>
                        <h3 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2">
                            <span className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-lg"><i className="fas fa-user-shield"></i></span>
                            Create Admin
                        </h3>
                        <form onSubmit={handleAddAdmin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Username</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:ring-0 outline-none transition-all font-medium"
                                    value={newAdmin.username}
                                    onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Password</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:ring-0 outline-none transition-all font-medium"
                                    value={newAdmin.password}
                                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                />
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmittingAdmin}
                                    className={`w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black shadow-lg shadow-gray-200 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 ${isSubmittingAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isSubmittingAdmin ? (
                                        <>
                                            <i className="fas fa-circle-notch fa-spin"></i>
                                            Creating Account...
                                        </>
                                    ) : (
                                        'Create Admin Account'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ModernModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={modalConfig.onConfirm}
                title={modalConfig.title}
                message={modalConfig.message}
                confirmText={modalConfig.confirmText}
                type={modalConfig.type}
            />
        </div>
    );
}

// --- SUB-COMPONENTS ---

function OrgDetailView({ org, onBack, onVerify, onDelete }) {
    const [showAllMembers, setShowAllMembers] = useState(false);
    const [showAllInventory, setShowAllInventory] = useState(false);
    const [showAllRequests, setShowAllRequests] = useState(false);

    if (!org) return null;

    const displayedMembers = showAllMembers ? org.members : org.members?.slice(0, 5);
    const displayedInventory = showAllInventory ? org.inventory : org.inventory?.slice(0, 5);
    const displayedRequests = showAllRequests ? org.requests : org.requests?.slice(0, 5);

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header / Actions */}
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold bg-white px-5 py-2.5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all"
                    >
                        <i className="fas fa-arrow-left"></i> Back
                    </button>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Organization Details</h2>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={onVerify}
                        className={`px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all text-sm flex items-center gap-2
                             ${org.verified ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-green-500 text-white hover:bg-green-600 shadow-green-200'}`}
                    >
                        <i className={`fas ${org.verified ? 'fa-ban' : 'fa-check'}`}></i>
                        {org.verified ? 'Disable Access' : 'Enable Access'}
                    </button>
                    <button
                        onClick={onDelete}
                        className="px-5 py-2.5 bg-white border-2 border-red-50 text-red-500 rounded-xl hover:bg-red-50 hover:border-red-100 font-bold shadow-md shadow-red-500/10 transition-all"
                    >
                        <i className="fas fa-trash-alt mr-2"></i> Delete
                    </button>
                </div>
            </div>

            {/* Profile Header */}
            <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 overflow-hidden border border-white relative group">
                {/* Header Banner */}
                <div className="h-44 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 relative overflow-hidden">
                    <div className="absolute inset-0 bg-pattern opacity-10 mix-blend-overlay"></div>
                </div>

                {/* Profile Info */}
                <div className="px-10 pb-8 flex flex-col md:flex-row items-end -mt-12 gap-8 relative z-10">
                    <div className="w-40 h-40 bg-white rounded-[2.5rem] p-3 shadow-2xl shadow-blue-900/10 border border-gray-50 flex-shrink-0">
                        <div className="w-full h-full bg-blue-50 rounded-[2rem] flex items-center justify-center text-6xl text-blue-600 shadow-inner">
                            <i className="fas fa-hospital-alt"></i>
                        </div>
                    </div>
                    <div className="flex-1 pb-2">
                        <div className="flex flex-wrap items-center gap-4 mb-3">
                            <h2 className="text-4xl font-black text-gray-900 tracking-tight">{org.name}</h2>
                            {org.verified && (
                                <div className="bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30" title="Verified Organization">
                                    <i className="fas fa-check text-xs font-black"></i>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-gray-500 font-bold text-sm">
                            <span className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100/50">
                                <i className="fas fa-map-marker-alt text-red-500"></i> {org.city}, {org.district}, {org.state}
                            </span>
                            <span className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100/50">
                                <i className="fas fa-envelope text-blue-500"></i> {org.email}
                            </span>
                            <span className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100/50">
                                <i className="fas fa-phone text-green-500"></i> {org.phone}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Basic Info Row */}
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-white grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div>
                    <label className="text-gray-400 block text-[10px] font-bold uppercase tracking-widest mb-1">License Number</label>
                    <p className="font-mono text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 font-bold truncate">{org.license_number || 'N/A'}</p>
                </div>
                <div>
                    <label className="text-gray-400 block text-[10px] font-bold uppercase tracking-widest mb-1">Detailed Address</label>
                    <p className="text-gray-800 font-semibold line-clamp-2">{org.address || 'No address provided'}</p>
                </div>
                <div>
                    <label className="text-gray-400 block text-[10px] font-bold uppercase tracking-widest mb-1">Organization Type</label>
                    <div className="mt-1">
                        <Badge status="info">{org.type}</Badge>
                    </div>
                </div>
                <div>
                    <label className="text-gray-400 block text-[10px] font-bold uppercase tracking-widest mb-1">Registration Date</label>
                    <p className="text-gray-800 font-bold mt-1 text-sm">{new Date(org.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>

            {/* Associated Members (Full Width) */}
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-white overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-black text-gray-900 uppercase tracking-tight">Associated Members (Latest)</h3>
                    <Badge status="pending">{org.members?.length || 0} Total</Badge>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                                <th className="px-8 py-4 text-left">Donor Profile</th>
                                <th className="px-8 py-4 text-center">Contact Info</th>
                                <th className="px-8 py-4 text-center">Blood Type</th>
                                <th className="px-8 py-4 text-center">Location</th>
                                <th className="px-8 py-4 text-center">Role</th>
                                <th className="px-8 py-4 text-right">Joined Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {displayedMembers && displayedMembers.length > 0 ? (
                                displayedMembers.map(member => (
                                    <tr key={member.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <Avatar name={member.full_name} color="red" />
                                                <div className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{member.full_name}</div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="text-center">
                                                <div className="text-xs font-bold text-gray-800">{member.phone || 'No Phone'}</div>
                                                <div className="text-[10px] text-gray-400 font-medium">{member.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <Badge type="blood">{member.blood_type}</Badge>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="text-xs font-bold text-gray-600"><i className="fas fa-map-marker-alt text-gray-300 mr-1"></i>{member.city}</span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold border border-gray-200 truncate inline-block max-w-[100px]">{member.role}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right font-bold text-gray-500">
                                            {new Date(member.joined_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-8 py-16 text-center text-gray-400">
                                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <i className="fas fa-users text-2xl opacity-20"></i>
                                        </div>
                                        <p className="font-bold">No members attached to this organization</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {org.members?.length > 5 && (
                    <div className="p-4 bg-gray-50/50 border-t border-gray-100 text-center">
                        <button
                            onClick={() => setShowAllMembers(!showAllMembers)}
                            className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-2 mx-auto"
                        >
                            {showAllMembers ? 'Show Less' : `Show All ${org.members.length} Members`}
                            <i className={`fas fa-chevron-${showAllMembers ? 'up' : 'down'}`}></i>
                        </button>
                    </div>
                )}
            </div>

            {/* Inventory & Requests Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Live Inventory */}
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-white overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-black text-gray-900 uppercase tracking-tight">Live Inventory</h3>
                        <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                            <i className="fas fa-tint"></i>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <div className="p-6 space-y-3">
                            {displayedInventory && displayedInventory.length > 0 ? (
                                displayedInventory.map(item => (
                                    <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50/50 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-gray-100 group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-red-600 font-black text-xl group-hover:scale-110 transition-transform">
                                                {item.blood_group}
                                            </div>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Available Stock</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className={`font-black text-3xl ${item.units < 5 ? 'text-red-500' : 'text-gray-900'}`}>{item.units}</span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase">units</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-300"><i className="fas fa-box-open"></i></div>
                                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Out of Stock</p>
                                </div>
                            )}
                        </div>
                    </div>
                    {org.inventory?.length > 5 && (
                        <div className="p-4 bg-gray-50/50 border-t border-gray-100 text-center">
                            <button
                                onClick={() => setShowAllInventory(!showAllInventory)}
                                className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-2 mx-auto"
                            >
                                {showAllInventory ? 'Show Less' : 'Show More Data'}
                                <i className={`fas fa-chevron-${showAllInventory ? 'up' : 'down'}`}></i>
                            </button>
                        </div>
                    )}
                </div>

                {/* Request History */}
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-white overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-black text-gray-900 uppercase tracking-tight">Request History</h3>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
                            <i className="fas fa-history"></i>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <div className="p-6 space-y-3">
                            {displayedRequests && displayedRequests.length > 0 ? (
                                displayedRequests.map(req => (
                                    <div key={req.id} className="flex justify-between items-center p-4 bg-gray-50/50 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-gray-100 group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-900 font-black text-sm">
                                                {req.blood_group}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-800">{req.units_required} units</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase">{new Date(req.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge status={req.urgency_level === 'Critical' ? 'danger' : 'warning'}>{req.urgency_level}</Badge>
                                            <Badge status={req.status === 'Active' ? 'warning' : 'success'}>{req.status}</Badge>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-gray-400">
                                    <i className="fas fa-clipboard-list mb-2 text-2xl opacity-20 block"></i>
                                    <p className="font-bold uppercase tracking-widest text-[10px]">No History found</p>
                                </div>
                            )}
                        </div>
                    </div>
                    {org.requests?.length > 5 && (
                        <div className="p-4 bg-gray-50/50 border-t border-gray-100 text-center">
                            <button
                                onClick={() => setShowAllRequests(!showAllRequests)}
                                className="text-xs font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-2 mx-auto"
                            >
                                {showAllRequests ? 'Show Less' : 'Show More History'}
                                <i className={`fas fa-chevron-${showAllRequests ? 'up' : 'down'}`}></i>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function DashboardHome({ stats, data, setActiveTab }) {
    // Process Data for Charts
    const recentRegistrations = useMemo(() => {
        const allUsers = [
            ...data.donors.map(d => ({ ...d, type: 'Donor', name: d.full_name, city: d.city, state: d.state, created_at: d.created_at })),
            ...data.organizations.map(o => ({ ...o, type: 'Organization', name: o.name, city: o.city, state: o.state, created_at: o.created_at }))
        ];
        return allUsers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
    }, [data.donors, data.organizations]);

    const inventoryData = useMemo(() => {
        // Group by Blood Type
        const grouped = {};
        data.inventory.forEach(i => {
            grouped[i.blood_group] = (grouped[i.blood_group] || 0) + i.units;
        });
        return Object.keys(grouped).map(k => ({ name: k, value: grouped[k] }));
    }, [data.inventory]);

    const userStats = [
        { name: 'Donors', count: stats.donors, fill: '#ef4444' },
        { name: 'Orgs', count: stats.organizations, fill: '#3b82f6' }
    ];

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Donors" value={stats.donors} icon="users" color="from-blue-500 to-blue-600" shadow="shadow-blue-500/20" />
                <StatCard title="Partner Orgs" value={stats.organizations} icon="hospital" color="from-purple-500 to-purple-600" shadow="shadow-purple-500/20" />
                <StatCard title="Available Units" value={stats.bloodUnits} icon="tint" color="from-red-500 to-red-600" shadow="shadow-red-500/20" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Inventory Chart */}
                <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-white">
                    <h3 className="text-xl font-bold text-gray-800 mb-8 pl-2 border-l-4 border-red-500">Inventory Distribution</h3>
                    <div className="h-72">
                        {inventoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={inventoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {inventoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                        itemStyle={{ color: '#374151', fontWeight: 'bold' }}
                                    />
                                    <Legend iconType="circle" verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-gray-300 font-medium">No inventory data available</div>
                        )}
                    </div>
                </div>

                {/* User Stats Chart */}
                <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-white">
                    <h3 className="text-xl font-bold text-gray-800 mb-8 pl-2 border-l-4 border-blue-500">Platform Growth</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={userStats} barSize={60}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 'bold' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: '#f9fafb' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Bar dataKey="count" radius={[12, 12, 12, 12]}>
                                    {userStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Activity (Requests & Low Stock) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-white">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center"><i className="fas fa-clock"></i></span>
                            Recent Emergency Requests
                        </h3>
                        <button onClick={() => setActiveTab('requests')} className="text-xs font-bold text-gray-400 hover:text-red-600 transition-colors uppercase tracking-wider flex items-center gap-1 group/btn">
                            See All <i className="fas fa-arrow-right group-hover/btn:translate-x-1 transition-transform"></i>
                        </button>
                    </div>
                    <div className="space-y-4">
                        {data.requests.slice(0, 5).map(req => (
                            <div key={req.id} className="flex justify-between items-center p-4 hover:bg-gray-50 rounded-2xl transition-all border border-transparent hover:border-gray-100 group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-black text-sm">
                                        {req.blood_group}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 group-hover:text-red-600 transition-colors">{req.org_name}</p>
                                        <p className="text-xs text-gray-500 font-medium">{req.units_required} units needed • {new Date(req.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <Badge status={req.status === 'Active' ? 'warning' : 'success'}>{req.status}</Badge>
                            </div>
                        ))}
                        {data.requests.length === 0 && <p className="text-center text-gray-400 py-6 font-medium">No recent requests</p>}
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-white">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center"><i className="fas fa-user-plus"></i></span>
                        Recent Registrations
                    </h3>
                    <div className="space-y-3">
                        {recentRegistrations.map((user, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-all border border-transparent hover:border-gray-100 group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-md ${user.type === 'Donor' ? 'bg-gradient-to-br from-red-400 to-red-500' : 'bg-gradient-to-br from-blue-400 to-blue-500'}`}>
                                        <i className={`fas fa-${user.type === 'Donor' ? 'user' : 'hospital'}`}></i>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{user.name}</p>
                                        <p className="text-xs text-gray-500 font-medium capitalize flex items-center gap-1">
                                            {user.type} <span className="w-1 h-1 rounded-full bg-gray-300"></span> {user.city}, {user.district}, {user.state}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Joined</span>
                                    <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-md">{new Date(user.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                        {recentRegistrations.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                                <i className="fas fa-users-slash text-4xl text-gray-200 mb-3"></i>
                                <p className="font-medium">No recent registrations found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Sidebar({ activeTab, setActiveTab, handleLogout }) {
    return (
        <aside className="w-full h-full bg-white/90 backdrop-blur-2xl md:rounded-3xl border border-white/50 flex flex-col justify-between shadow-2xl shadow-gray-200/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-pink-500 to-blue-500"></div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-8 pb-6">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="bg-gradient-to-br from-red-500 to-pink-600 p-2.5 rounded-xl shadow-lg shadow-red-500/30">
                            <i className="fas fa-heartbeat text-2xl text-white"></i>
                        </div>
                        <div>
                            <span className="text-xl font-black tracking-tight text-gray-900 block leading-none">eBloodBank</span>
                            <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Admin Panel</span>
                        </div>
                    </div>

                    <nav className="space-y-1">
                        <div className="px-4 py-2">
                            <p className="text-xs font-bold text-gray-400/80 uppercase tracking-widest mb-3">Overview</p>
                            <SidebarItem label="Dashboard" icon="chart-pie" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                            <SidebarItem label="Broadcasts" icon="bullhorn" active={activeTab === 'broadcast'} onClick={() => setActiveTab('broadcast')} />
                        </div>

                        <div className="my-2 border-t border-gray-100 mx-4"></div>

                        <div className="px-4 py-2">
                            <p className="text-xs font-bold text-gray-400/80 uppercase tracking-widest mb-3">Database</p>
                            <SidebarItem label="Donors" icon="users" active={activeTab === 'donors'} onClick={() => setActiveTab('donors')} />
                            <SidebarItem label="Organizations" icon="hospital" active={activeTab === 'orgs'} onClick={() => setActiveTab('orgs')} />
                            <SidebarItem label="Inventory" icon="prescription-bottle-medical" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
                        </div>

                        <div className="my-2 border-t border-gray-100 mx-4"></div>

                        <div className="px-4 py-2">
                            <p className="text-xs font-bold text-gray-400/80 uppercase tracking-widest mb-3">Management</p>
                            <SidebarItem label="Emergencies" icon="ambulance" active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} />
                            <SidebarItem label="Reports" icon="file-medical-alt" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
                            <SidebarItem label="Activity Logs" icon="history" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
                            <SidebarItem label="Admins" icon="user-shield" active={activeTab === 'admins'} onClick={() => setActiveTab('admins')} />
                        </div>
                    </nav>
                </div>
            </div>

            <div className="p-4 border-t border-gray-50">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center p-4 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
                >
                    <i className="fas fa-sign-out-alt text-xl group-hover:rotate-180 transition-transform duration-300"></i>
                    <span className="ml-4 font-bold">Sign Out</span>
                </button>
            </div>
        </aside>
    );
}

function SidebarItem({ label, icon, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 text-sm font-bold mb-1 group relative overflow-hidden
                ${active
                    ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20 translate-x-1'
                    : 'text-gray-500 hover:bg-white hover:text-gray-900 hover:shadow-md hover:shadow-gray-100'
                }`}
        >
            <i className={`fas fa-${icon} w-5 text-center transition-colors ${active ? 'text-red-400' : 'text-gray-300 group-hover:text-red-500'}`}></i>
            <span className="relative z-10">{label}</span>
            {active && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-red-500 rounded-l-full"></div>}
        </button>
    );
}

function StatCard({ title, value, icon, color, shadow }) {
    return (
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-200/50 border border-white hover:-translate-y-2 transition-transform duration-300 group cursor-default">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
                    <h3 className="text-4xl font-black text-gray-800 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-gray-800 group-hover:to-gray-600 transition-all">{value}</h3>
                </div>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} ${shadow} flex items-center justify-center text-white shadow-lg transform group-hover:rotate-6 transition-transform duration-300`}>
                    <i className={`fas fa-${icon} text-2xl`}></i>
                </div>
            </div>
        </div>
    );
}

function LoadingScreen() {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-red-50/30"></div>
            <div className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 border-8 border-red-100 border-t-red-600 rounded-full animate-spin"></div>
                <h2 className="mt-8 text-2xl font-black text-gray-800 tracking-tight">eBloodBank</h2>
                <p className="text-gray-400 font-bold text-sm tracking-widest uppercase mt-2 animate-pulse">Loading Admin Panel...</p>
            </div>
        </div>
    );
}

function DataTable({ columns, data, renderRow }) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-16 text-center border border-white">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300 text-4xl animate-bounce-slow">
                    <i className="fas fa-folder-open"></i>
                </div>
                <h3 className="text-xl font-black text-gray-800 mb-2">No Records Found</h3>
                <p className="text-gray-500 font-medium max-w-xs mx-auto">It seems quiet here. Try adjusting your search or add new data to get started.</p>
            </div>
        );
    }
    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-white overflow-hidden animate-fade-in-up">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            {columns.map((col, i) => (
                                <th key={i} className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {data.map((item, index) => renderRow(item, index))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Avatar({ name, bg = "bg-gradient-to-br from-gray-100 to-gray-200", text = "text-gray-500", className = "", size = "w-12 h-12" }) {
    const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
    return (
        <div className={`${size} rounded-2xl ${bg} flex items-center justify-center ${text} text-sm font-black shadow-sm ${className}`}>
            {initials}
        </div>
    );
}

function Badge({ children, status, type }) {
    const styles = {
        success: 'bg-green-100 text-green-700 border-green-200',
        warning: 'bg-amber-100 text-amber-700 border-amber-200',
        danger: 'bg-red-100 text-red-700 border-red-200',
        info: 'bg-blue-100 text-blue-700 border-blue-200',
        pending: 'bg-gray-100 text-gray-600 border-gray-200',
        blood: 'bg-red-50 text-red-600 border-red-100 font-black',
    };

    const finalStatus = status || (type === 'blood' ? 'blood' : 'pending');

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${styles[finalStatus]} shadow-sm`}>
            {children}
        </span>
    );
}

function DeleteButton({ onClick }) {
    return (
        <button
            onClick={onClick}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
            title="Delete"
        >
            <i className="fas fa-trash-alt"></i>
        </button>
    );
}

function InventoryMatrixView({ inventory = [], allOrganizations = [], allData = {} }) {
    const bloodGroups = useMemo(() => {
        // Start with standard groups to ensure they are always first/present
        const standard = [
            'O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-',
            'A1+', 'A1-', 'A1B+', 'A1B-', 'A2+', 'A2-', 'A2B+', 'A2B-',
            'Bombay Blood Group', 'INRA'
        ];
        const discovered = new Set(standard);

        // Scan all data for any other groups
        inventory.forEach(i => i.blood_group && discovered.add(i.blood_group));
        allData.donors?.forEach(d => d.blood_type && discovered.add(d.blood_type));
        allData.requests?.forEach(r => r.blood_group && discovered.add(r.blood_group));

        // Convert to array, maintaining standard order first, then discovered ones
        const list = Array.from(discovered);
        return list.sort((a, b) => {
            const indexA = standard.indexOf(a);
            const indexB = standard.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });
    }, [inventory, allData]);

    const groupedData = useMemo(() => {
        const groups = {};

        // Initialize with ALL organizations
        allOrganizations.forEach(org => {
            groups[org.name] = {
                name: org.name,
                total: 0,
                last_updated: org.created_at, // Fallback to registration date
                counts: {}
            };
            bloodGroups.forEach(bg => groups[org.name].counts[bg] = 0);
        });

        // Fill with actual inventory data
        inventory.forEach(item => {
            if (groups[item.org_name]) {
                groups[item.org_name].counts[item.blood_group] = item.units;
                groups[item.org_name].total += item.units;

                if (new Date(item.last_updated) > new Date(groups[item.org_name].last_updated)) {
                    groups[item.org_name].last_updated = item.last_updated;
                }
            }
        });

        return Object.values(groups);
    }, [inventory, allOrganizations]);

    const totals = useMemo(() => {
        const counts = {};
        bloodGroups.forEach(bg => counts[bg] = 0);
        inventory.forEach(item => {
            counts[item.blood_group] = (counts[item.blood_group] || 0) + item.units;
        });
        return counts;
    }, [inventory, bloodGroups]);

    if (!allOrganizations || allOrganizations.length === 0) {
        return (
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-16 text-center border border-white">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300 text-4xl animate-bounce-slow">
                    <i className="fas fa-box-open"></i>
                </div>
                <h3 className="text-xl font-black text-gray-800 mb-2">No Organizations Found</h3>
                <p className="text-gray-500 font-medium max-w-xs mx-auto">Add organizations to start tracking blood inventory.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Global Inventory Summary */}
            <div className="flex flex-wrap gap-4">
                {bloodGroups.map(bg => (
                    <div key={bg} className="bg-white p-4 rounded-2xl shadow-sm border border-white hover:shadow-md transition-all group flex-1 min-w-[120px]">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1 group-hover:text-red-500 transition-colors">{bg}</label>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-gray-800">{totals[bg] || 0}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Units</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-white overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <i className="fas fa-list-ul text-blue-500"></i>
                        Inventory Matrix
                    </h3>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Total Units: <span className="text-gray-900">{Object.values(totals).reduce((a, b) => a + b, 0)}</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-5 text-center text-xs font-bold text-gray-400 uppercase tracking-widest sticky left-0 bg-gray-50 z-10 w-64 border-r border-gray-100">Organization</th>
                                {bloodGroups.map(bg => (
                                    <th key={bg} className="px-b py-5 text-center text-xs font-bold text-red-500 uppercase tracking-widest">{bg}</th>
                                ))}
                                <th className="px-6 py-5 text-center text-xs font-bold text-gray-400 uppercase tracking-widest border-l border-gray-100">Total</th>
                                <th className="px-6 py-5 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Last Updated</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {groupedData.map((org, index) => (
                                <tr key={index} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-gray-900 sticky left-0 bg-white group-hover:bg-blue-50/30 transition-colors z-10 border-r border-gray-100 text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center text-xs">
                                                <i className="fas fa-hospital"></i>
                                            </div>
                                            {org.name}
                                        </div>
                                    </td>
                                    {bloodGroups.map(bg => {
                                        const count = org.counts[bg];
                                        const isLow = count < 5;
                                        const isZero = count === 0;
                                        return (
                                            <td key={bg} className="px-4 py-4 text-center">
                                                <span className={`
                                                inline-block w-8 h-8 leading-8 rounded-lg text-sm font-bold transition-all
                                                ${isZero ? 'text-gray-300 bg-gray-50' :
                                                        isLow ? 'text-red-600 bg-red-100 shadow-sm shadow-red-200 animate-pulse-slow' :
                                                            'text-gray-800 bg-white border border-gray-100'}
                                            `}>
                                                    {count}
                                                </span>
                                            </td>
                                        );
                                    })}
                                    <td className="px-6 py-4 text-center border-l border-gray-100 bg-gray-50/30">
                                        <span className="font-black text-gray-900 bg-gray-200/50 px-3 py-1 rounded-full text-sm">
                                            {org.total}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm font-medium text-gray-500">
                                        {new Date(org.last_updated).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function DonorDetailView({ donor, onBack }) {
    if (!donor) return null;

    // Filter actual donations (where units_donated > 0)
    const actualDonations = donor.donations?.filter(d => d.units_donated > 0) || [];

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-2">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold bg-white px-5 py-2.5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all"
                >
                    <i className="fas fa-arrow-left"></i> Back to Donors
                </button>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden border border-white relative group">
                {/* Enhanced Header Banner */}
                <div className="h-52 bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 relative overflow-hidden">
                    <div className="absolute inset-0 bg-pattern opacity-10 mix-blend-overlay"></div>
                </div>

                {/* Profile Info Wrapper */}
                <div className="px-10 pb-10 flex flex-col md:flex-row items-center -mt-10 gap-8 relative z-10">
                    <div className="relative transform transition-transform duration-500 hover:scale-105 flex-shrink-0">
                        <Avatar name={donor.full_name} size="w-40 h-40" className="border-8 border-white shadow-2xl rounded-[2.5rem]" />
                        <div className="absolute -bottom-2 -right-2 bg-red-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl border-4 border-white">
                            {donor.blood_type}
                        </div>
                    </div>
                    <div className="flex-1 pt-12 md:pt-10">
                        <div className="flex flex-wrap items-center gap-4 mb-4">
                            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight drop-shadow-sm">{toTitleCase(donor.full_name)}</h2>
                            <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm ${donor.availability === 'Available' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {donor.availability}
                            </span>
                        </div>

                        {/* Contact & Location Info */}
                        <div className="flex flex-wrap items-center gap-3 text-gray-500 font-bold text-sm mb-3">
                            <span className="flex items-center gap-2.5 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100/50 hover:bg-white transition-colors"><i className="fas fa-envelope text-red-500"></i> {donor.email}</span>
                            <span className="flex items-center gap-2.5 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100/50 hover:bg-white transition-colors"><i className="fas fa-phone text-green-500"></i> {donor.phone || 'No phone'}</span>
                            <span className="flex items-center gap-2.5 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100/50 hover:bg-white transition-colors">
                                <i className="fas fa-map-marker-alt text-blue-500"></i>
                                {[donor.city, donor.district, donor.state].filter(Boolean).join(', ')}
                            </span>
                        </div>

                        {/* DOB & Gender Info */}
                        <div className="flex flex-wrap items-center gap-3 text-gray-500 font-bold text-sm">
                            <span className="flex items-center gap-2.5 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100/50 hover:bg-white transition-colors">
                                <i className="fas fa-birthday-cake text-purple-500"></i>
                                {donor.dob ? new Date(donor.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                            </span>
                            <span className="flex items-center gap-2.5 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100/50 hover:bg-white transition-colors capitalize">
                                <i className={`fas fa-${donor.gender === 'male' ? 'mars' : donor.gender === 'female' ? 'venus' : 'genderless'} text-indigo-500`}></i>
                                {donor.gender || 'Not specified'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Donations Summary */}
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-white overflow-hidden">
                    <div className="p-8 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <i className="fas fa-tint text-red-500"></i>
                            Donation Summary
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                            {actualDonations.length} total donation{actualDonations.length !== 1 ? 's' : ''} recorded
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="px-8 py-4 text-center">#</th>
                                    <th className="px-8 py-4 text-left">Date</th>
                                    <th className="px-8 py-4 text-center">Organization</th>
                                    <th className="px-8 py-4 text-center">Units Donated</th>
                                    <th className="px-8 py-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {actualDonations.length > 0 ? (
                                    actualDonations.map((don, idx) => (
                                        <tr key={don.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-8 py-5 text-center">
                                                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 text-white flex items-center justify-center font-black text-sm mx-auto">
                                                    {idx + 1}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-sm font-bold text-gray-700">
                                                {new Date(don.test_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="px-8 py-5 text-center text-sm font-bold text-gray-800">{don.org_name}</td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="inline-flex items-center gap-1 font-black text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-100">
                                                    <i className="fas fa-tint text-xs"></i>
                                                    {don.units_donated}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <Badge status="success">Completed</Badge>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-12 text-center text-gray-400">
                                            <i className="fas fa-inbox text-3xl text-gray-200 mb-2 block"></i>
                                            No donations found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Medical Reports */}
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-white overflow-hidden">
                    <div className="p-8 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <i className="fas fa-file-medical text-blue-500"></i>
                            Medical Reports & Test Results
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                            All medical examinations and screening results ({donor.donations?.length || 0} total records)
                        </p>
                    </div>
                    <div className="p-8 space-y-4">
                        {donor.donations && donor.donations.length > 0 ? (
                            donor.donations.map((report, idx) => (
                                <DonationReportCard key={report.id} report={report} index={idx} />
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <i className="fas fa-clipboard-list text-4xl text-gray-200 mb-3"></i>
                                <p className="text-gray-400 font-medium">No medical reports found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ReportDetailView({ report, onBack }) {
    if (!report) return null;

    const downloadPDF = async () => {
        const { default: jsPDF } = await import('jspdf');
        const html2canvas = (await import('html2canvas')).default;

        const reportElement = document.getElementById('medical-report-content');
        const canvas = await html2canvas(reportElement, {
            scale: 2,
            useCORS: true,
            logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Medical_Report_${report.id}_${report.donor_name}.pdf`);
        toast.success('Report downloaded successfully');
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-2">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold bg-white px-5 py-2.5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all"
                >
                    <i className="fas fa-arrow-left"></i> Back to Reports
                </button>
                <button
                    onClick={downloadPDF}
                    className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black shadow-lg shadow-gray-900/20 transition-all transform hover:-translate-y-0.5"
                >
                    <i className="fas fa-download"></i> Download PDF
                </button>
            </div>

            <div id="medical-report-content" className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden max-w-4xl mx-auto p-12">
                {/* Report Header */}
                <div className="border-b-4 border-red-600 pb-8 mb-10 flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 mb-2">Medical Report</h1>
                        <p className="text-gray-500 font-bold">Ref ID: #REP-{report.id.toString().padStart(6, '0')}</p>
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
                            <p className="text-xl font-black text-gray-800">{report.donor_name}</p>
                            <p className="text-gray-600 font-medium">{report.donor_email}</p>
                            <p className="text-gray-600 font-medium">{report.donor_phone || 'N/A'}</p>
                            <div className="pt-2">
                                <span style={{
                                    color: '#334155',
                                    fontWeight: '800',
                                    fontSize: '14px',
                                    display: 'block',
                                    lineHeight: '1.5'
                                }}>Blood Group: {report.donor_blood_type}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Organization</h3>
                        <div className="space-y-2">
                            <p className="text-xl font-black text-gray-800">{report.org_name}</p>
                            <p className="text-gray-600 font-medium">{report.org_email}</p>
                            <p className="text-sm text-gray-500">{report.org_address}</p>
                            <p className="text-gray-600 font-medium">Date: {new Date(report.test_date).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                {/* Vitals Grid */}
                <div className="bg-gray-50 rounded-3xl p-8 mb-10 border border-gray-100">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Medical Vitals</h3>
                    <div className="grid grid-cols-3 gap-8">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">HB Level</label>
                            <p className="text-2xl font-black text-gray-800">{report.hb_level} <span className="text-xs text-gray-400 uppercase">g/dL</span></p>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Blood Pressure</label>
                            <p className="text-2xl font-black text-gray-800">{report.blood_pressure} <span className="text-xs text-gray-400 uppercase">mmHg</span></p>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Pulse Rate</label>
                            <p className="text-2xl font-black text-gray-800">{report.pulse_rate || '--'} <span className="text-xs text-gray-400 uppercase">bpm</span></p>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Weight</label>
                            <p className="text-2xl font-black text-gray-800">{report.weight} <span className="text-xs text-gray-400 uppercase">kg</span></p>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Temperature</label>
                            <p className="text-2xl font-black text-gray-800">{report.temperature || '--'} <span className="text-xs text-gray-400 uppercase">°C</span></p>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Units Donated</label>
                            <p className="text-2xl font-black text-red-600">{report.units_donated} <span className="text-xs text-gray-400 uppercase">Unit</span></p>
                        </div>
                    </div>
                </div>

                {/* Test Results */}
                <div className="mb-10">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Screening Results</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'HIV Status', val: report.hiv_status },
                            { label: 'Hepatitis B', val: report.hepatitis_b },
                            { label: 'Hepatitis C', val: report.hepatitis_c },
                            { label: 'Syphilis', val: report.syphilis },
                            { label: 'Malaria', val: report.malaria }
                        ].map((test, idx) => (
                            <div key={idx} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                <span className="font-bold text-gray-700">{test.label}</span>
                                <span className={`font-black uppercase px-3 py-1 rounded-lg text-xs ${test.val === 'Negative' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                    {test.val || 'Not Tested'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Medical Notes</h3>
                    <p className="text-gray-700 font-medium leading-relaxed bg-blue-50/30 p-6 rounded-2xl border border-blue-100/50">
                        {report.notes || 'No medical complications noted during this donation session.'}
                    </p>
                </div>

                {/* Footer Signature */}
                <div className="mt-16 pt-8 border-t border-gray-100 flex justify-between items-end">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        System Generated Report • eBloodBank Admin
                    </div>
                    <div className="text-center w-48">
                        <div className="h-0.5 bg-gray-200 mb-2"></div>
                        <p className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Medical Officer Signature</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DonationReportCard({ report, index }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-all">
            {/* Collapsed View */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-6 bg-gradient-to-r from-gray-50 to-white cursor-pointer hover:from-gray-100 hover:to-gray-50 transition-all"
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 text-white flex items-center justify-center font-black shadow-lg">
                            #{index + 1}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h4 className="font-black text-gray-900">{report.org_name}</h4>
                                <span className="text-xs font-bold text-gray-400">•</span>
                                <span className="text-sm font-bold text-gray-600">{new Date(report.test_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                                <span className="flex items-center gap-1">
                                    <i className="fas fa-tint text-red-500"></i>
                                    {report.units_donated} unit{report.units_donated !== 1 ? 's' : ''}
                                </span>
                                <span className="flex items-center gap-1">
                                    <i className="fas fa-heartbeat text-pink-500"></i>
                                    HB: {report.hb_level}
                                </span>
                                <span className="flex items-center gap-1">
                                    <i className="fas fa-stethoscope text-blue-500"></i>
                                    BP: {report.blood_pressure}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-all">
                        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-sm`}></i>
                    </button>
                </div>
            </div>

            {/* Expanded View */}
            {isExpanded && (
                <div className="p-6 bg-white border-t border-gray-100 animate-fade-in-up">
                    {/* Vitals Grid */}
                    <div className="mb-6">
                        <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Medical Vitals</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-xl border border-red-100">
                                <label className="text-[10px] font-bold text-red-400 uppercase block mb-1">HB Level</label>
                                <p className="text-2xl font-black text-red-600">{report.hb_level} <span className="text-xs text-gray-400">g/dL</span></p>
                            </div>
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                                <label className="text-[10px] font-bold text-blue-400 uppercase block mb-1">Blood Pressure</label>
                                <p className="text-2xl font-black text-blue-600">{report.blood_pressure} <span className="text-xs text-gray-400">mmHg</span></p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-xl border border-purple-100">
                                <label className="text-[10px] font-bold text-purple-400 uppercase block mb-1">Weight</label>
                                <p className="text-2xl font-black text-purple-600">{report.weight} <span className="text-xs text-gray-400">kg</span></p>
                            </div>
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100">
                                <label className="text-[10px] font-bold text-amber-400 uppercase block mb-1">Pulse Rate</label>
                                <p className="text-2xl font-black text-amber-600">{report.pulse_rate || '--'} <span className="text-xs text-gray-400">bpm</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Screening Results */}
                    <div className="mb-6">
                        <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Disease Screening</h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {[
                                { label: 'HIV', value: report.hiv_status },
                                { label: 'Hepatitis B', value: report.hepatitis_b },
                                { label: 'Hepatitis C', value: report.hepatitis_c },
                                { label: 'Syphilis', value: report.syphilis },
                                { label: 'Malaria', value: report.malaria }
                            ].map((test, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <span className="text-sm font-bold text-gray-700">{test.label}</span>
                                    <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-lg ${test.value === 'Negative'
                                        ? 'bg-green-100 text-green-700'
                                        : test.value === 'Positive'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-gray-100 text-gray-500'
                                        }`}>
                                        {test.value || 'N/A'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Medical Notes */}
                    {report.notes && (
                        <div>
                            <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Medical Notes</h5>
                            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                                <p className="text-sm text-gray-700 font-medium leading-relaxed">{report.notes}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ActivityLogsView({ logs }) {
    return (
        <DataTable
            columns={['Time', 'Actor', 'Action', 'Description']}
            data={logs}
            renderRow={(log, idx) => {
                const typeColors = {
                    'Donor': 'bg-red-50 text-red-600 border-red-100',
                    'Organization': 'bg-blue-50 text-blue-600 border-blue-100',
                    'Admin': 'bg-gray-900 text-white border-gray-900 shadow-sm'
                };
                const typeIcons = {
                    'Donor': 'fa-user',
                    'Organization': 'fa-hospital',
                    'Admin': 'fa-user-shield'
                };

                return (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0">
                        <td className="px-6 py-4 text-center">
                            <div className="text-sm font-bold text-gray-900">
                                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                {new Date(log.created_at).toLocaleDateString()}
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-[10px] ${typeColors[log.entity_type]}`}>
                                    <i className={`fas ${typeIcons[log.entity_type]}`}></i>
                                </div>
                                <div>
                                    <div className="text-sm font-black text-gray-900 leading-tight">{log.origin_name}</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{log.entity_type}</div>
                                </div>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black border border-gray-200 uppercase tracking-widest">
                                {log.action_type.replace(/_/g, ' ')}
                            </span>
                        </td>
                        <td className="px-6 py-4">
                            <p className="text-sm font-bold text-gray-700 leading-relaxed italic border-l-2 border-red-100 pl-3">
                                {log.description}
                                {log.entity_name && (
                                    <span className="text-red-500 not-italic ml-1"> • {log.entity_name}</span>
                                )}
                            </p>
                        </td>
                    </tr>
                );
            }}
        />
    );
}
