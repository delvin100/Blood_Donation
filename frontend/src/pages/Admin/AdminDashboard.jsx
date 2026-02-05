import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import BackToTop from '../../components/common/BackToTop';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

// --- COLORS & THEME ---
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];

export default function AdminDashboard() {
    // --- STATE ---
    const [stats, setStats] = useState({ donors: 0, organizations: 0, bloodUnits: 0 });
    const [data, setData] = useState({
        donors: [],
        organizations: [],
        inventory: [],
        requests: [],
        reports: [],
        admins: []
    });
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddAdminModal, setShowAddAdminModal] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ username: '', password: '' });
    const [broadcast, setBroadcast] = useState({ target: 'all', title: '', message: '' });
    const [sendingBroadcast, setSendingBroadcast] = useState(false);
    const [selectedDonor, setSelectedDonor] = useState(null);
    const [selectedReport, setSelectedReport] = useState(null);
    const [selectedOrg, setSelectedOrg] = useState(null); // For Detail View
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile Menu State

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

            const [statsRes, donorsRes, orgsRes, invRes, reqRes, repRes, adminsRes] = await Promise.all([
                axios.get(`${baseUrl}/stats`, config),
                axios.get(`${baseUrl}/donors`, config),
                axios.get(`${baseUrl}/organizations`, config),
                axios.get(`${baseUrl}/inventory`, config),
                axios.get(`${baseUrl}/requests`, config),
                axios.get(`${baseUrl}/reports`, config),
                axios.get(`${baseUrl}/admins`, config)
            ]);

            setStats(statsRes.data);
            setData({
                donors: donorsRes.data,
                organizations: orgsRes.data,
                inventory: invRes.data,
                requests: reqRes.data,
                reports: repRes.data,
                admins: adminsRes.data
            });
            setLoading(false);
        } catch (err) {
            console.error(err);
            if (err.response?.status === 403 || err.response?.status === 401) {
                toast.error('Session expired');
                navigate('/admin/login');
            } else {
                toast.error('Failed to update dashboard');
            }
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/');
    };

    // --- ACTIONS ---

    const handleDeleteDonor = async (id) => {
        if (!window.confirm('Are you sure?')) return;
        try {
            await axios.delete(`/api/admin/donors/${id}`, getAuthConfig());
            toast.success('Donor deleted');
            fetchAllData();
        } catch (error) { toast.error('Failed to delete'); }
    };

    const handleDeleteOrg = async (id) => {
        if (!window.confirm('Delete Organization?')) return;
        try {
            await axios.delete(`/api/admin/organizations/${id}`, getAuthConfig());
            toast.success('Organization deleted');
            if (selectedOrg?.id === id) setSelectedOrg(null);
            fetchAllData();
        } catch (error) { toast.error('Failed to delete'); }
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
        } catch (error) { toast.error('Failed to update'); }
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
        try {
            await axios.post('/api/admin/admins', newAdmin, getAuthConfig());
            toast.success('Admin added successfully');
            setShowAddAdminModal(false);
            setNewAdmin({ username: '', password: '' });
            fetchAllData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to add admin');
        }
    };

    const handleDeleteAdmin = async (id) => {
        if (!window.confirm('Delete this admin?')) return;
        try {
            await axios.delete(`/api/admin/admins/${id}`, getAuthConfig());
            toast.success('Admin deleted');
            fetchAllData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete');
        }
    };

    const handleBroadcast = async (e) => {
        e.preventDefault();
        setSendingBroadcast(true);
        try {
            await axios.post('/api/admin/notifications', broadcast, getAuthConfig());
            toast.success('Broadcast sent successfully!');
            setBroadcast({ target: 'all', title: '', message: '' });
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
            donors: (item) => item.full_name.toLowerCase().includes(term) || item.email.toLowerCase().includes(term),
            organizations: (item) => item.name.toLowerCase().includes(term) || item.email.toLowerCase().includes(term),
            admins: (item) => item.username.toLowerCase().includes(term),
            inventory: (item) => item.blood_group.toLowerCase().includes(term) || item.org_name.toLowerCase().includes(term),
            requests: (item) => item.blood_group.toLowerCase().includes(term) || item.org_name.toLowerCase().includes(term),
            reports: (item) => item.donor_name.toLowerCase().includes(term) || item.org_name.toLowerCase().includes(term),
        };

        if (filters[activeTab]) {
            return { ...data, [activeTab]: data[activeTab].filter(filters[activeTab]) };
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
                <Sidebar activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); setSelectedOrg(null); setSelectedDonor(null); setSelectedReport(null); setIsMobileMenuOpen(false); }} handleLogout={handleLogout} />
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
                                </h1>
                                <p className="text-gray-500 font-medium mt-1">Dashboard / {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</p>
                            </div>

                            {activeTab !== 'dashboard' && activeTab !== 'broadcast' && (
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
                            <DashboardHome stats={stats} data={data} />
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
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <Avatar name={donor.full_name} className="shadow-md" />
                                                    <div>
                                                        <div className="font-bold text-gray-900 group-hover:text-red-600 transition-colors">{donor.full_name}</div>
                                                        <div className="text-xs text-gray-500 font-medium">{donor.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center"><Badge type="blood">{donor.blood_type}</Badge></td>
                                            <td className="px-6 py-4 text-center text-sm font-medium text-gray-600">{donor.city}, {donor.state}</td>
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
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-blue-500 text-xl group-hover:scale-110 transition-transform duration-300">
                                                        <i className="fas fa-hospital-alt"></i>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{org.name}</div>
                                                        <div className="text-xs text-gray-500 font-medium">{org.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-medium text-gray-600">{org.type}</td>
                                            <td className="px-6 py-4 text-center text-sm font-medium text-gray-600">{org.city}, {org.state}</td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge status={org.verified ? 'success' : 'pending'}>{org.verified ? 'Verified' : 'Pending'}</Badge>
                                            </td>
                                            <td className="px-6 py-4 text-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-center items-center gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleVerifyOrg(org.id); }}
                                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${org.verified ? 'bg-white border-red-200 text-red-600 hover:bg-red-50' : 'bg-green-500 text-white border-transparent hover:bg-green-600 shadow-md shadow-green-200'}`}
                                                    >
                                                        {org.verified ? 'Revoke' : 'Approve'}
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
                                <div className="mb-6 flex justify-end">
                                    <button
                                        onClick={() => setShowAddAdminModal(true)}
                                        className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition-all hover:shadow-lg shadow-gray-900/20 flex items-center gap-2 transform hover:-translate-y-0.5"
                                    >
                                        <i className="fas fa-plus"></i> <span className="ml-1">Add New Admin</span>
                                    </button>
                                </div>
                                <DataTable
                                    columns={['Admin User', 'Created At', 'Actions']}
                                    data={filteredData.admins}
                                    renderRow={(admin) => (
                                        <tr key={admin.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <Avatar name={admin.username} bg="bg-gray-900" text="text-white" />
                                                    <span className="font-bold text-gray-900">{admin.username}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-medium text-gray-500">
                                                {new Date(admin.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center">
                                                    <DeleteButton onClick={() => handleDeleteAdmin(admin.id)} />
                                                </div>
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
                                            <div className="grid grid-cols-3 gap-4">
                                                {['all', 'donors', 'organizations'].map(t => (
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
                                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

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
                            <InventoryMatrixView inventory={filteredData.inventory} />
                        )}

                        {activeTab === 'requests' && (
                            <DataTable
                                columns={['Org', 'Blood Group', 'Units', 'Urgency', 'Status', 'Date']}
                                data={filteredData.requests}
                                renderRow={(req) => (
                                    <tr key={req.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0">
                                        <td className="px-6 py-4 font-bold text-gray-900">{req.org_name}</td>
                                        <td className="px-6 py-4 text-center"><span className="text-red-600 font-black">{req.blood_group}</span></td>
                                        <td className="px-6 py-4 text-center text-gray-700 font-bold">{req.units_required}</td>
                                        <td className="px-6 py-4 text-center"><Badge status={req.urgency_level === 'Critical' ? 'danger' : req.urgency_level === 'High' ? 'warning' : 'info'}>{req.urgency_level}</Badge></td>
                                        <td className="px-6 py-4 text-center"><Badge status={req.status === 'Active' ? 'warning' : 'success'}>{req.status}</Badge></td>
                                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-500">{new Date(req.created_at).toLocaleDateString()}</td>
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
                                            <td className="px-6 py-4 text-sm font-medium text-gray-500">{new Date(report.test_date).toLocaleDateString()}</td>
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
                            )
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
                                    className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black shadow-lg shadow-gray-900/20 transition-all transform hover:-translate-y-0.5"
                                >
                                    Create Admin Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- SUB-COMPONENTS ---

function OrgDetailView({ org, onBack, onVerify, onDelete }) {
    if (!org) return null;

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header / Actions */}
            <div className="flex justify-between items-center mb-2">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold bg-white px-5 py-2.5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all"
                >
                    <i className="fas fa-arrow-left"></i> Back
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={onVerify}
                        className={`px-5 py-2.5 rounded-xl font-bold shadow-sm transition-all text-sm flex items-center gap-2
                             ${org.verified ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-green-500 text-white hover:bg-green-600 shadow-green-200'}`}
                    >
                        <i className={`fas ${org.verified ? 'fa-ban' : 'fa-check'}`}></i>
                        {org.verified ? 'Revoke Verification' : 'Verify Organization'}
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
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden border border-white relative group">
                {/* Enhanced Header Banner */}
                <div className="h-52 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 relative overflow-hidden">
                    <div className="absolute inset-0 bg-pattern opacity-10 mix-blend-overlay"></div>
                    <div className="absolute -top-10 -left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl opacity-20"></div>
                </div>

                {/* Profile Info Wrapper - Optimized overlap and vertical alignment */}
                <div className="px-10 pb-10 flex flex-col md:flex-row items-center -mt-10 gap-8 relative z-10">
                    <div className="w-40 h-40 bg-white rounded-[2.5rem] p-3 shadow-2xl shadow-blue-900/10 transform transition-transform duration-500 hover:scale-105 border border-gray-50 flex-shrink-0">
                        <div className="w-full h-full bg-blue-50 rounded-[2rem] flex items-center justify-center text-6xl text-blue-600 shadow-inner">
                            <i className="fas fa-hospital-alt"></i>
                        </div>
                    </div>
                    <div className="flex-1 pt-12 md:pt-10">
                        <div className="flex flex-wrap items-center gap-4 mb-4">
                            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight drop-shadow-sm">{org.name}</h2>
                            {org.verified && (
                                <div className="bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30" title="Verified Organization">
                                    <i className="fas fa-check text-sm font-black"></i>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-gray-500 font-bold text-sm">
                            <span className="flex items-center gap-2.5 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100/50 hover:bg-white transition-colors"><i className="fas fa-map-marker-alt text-red-500"></i> {org.city}, {org.state}</span>
                            <span className="flex items-center gap-2.5 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100/50 hover:bg-white transition-colors"><i className="fas fa-envelope text-blue-500"></i> {org.email}</span>
                            <span className="flex items-center gap-2.5 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100/50 hover:bg-white transition-colors"><i className="fas fa-phone text-green-500"></i> {org.phone}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Info & Stats */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-white">
                        <h3 className="font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100 flex items-center gap-2">
                            <i className="fas fa-info-circle text-gray-400"></i> Organization Details
                        </h3>
                        <div className="space-y-5">
                            <div>
                                <label className="text-gray-400 block text-xs font-bold uppercase tracking-widest mb-1">License Number</label>
                                <p className="font-mono text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100 inline-block">{org.license_number || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-gray-400 block text-xs font-bold uppercase tracking-widest mb-1">Address</label>
                                <p className="text-gray-800 font-medium leading-relaxed">{org.address || 'No address provided'}</p>
                            </div>
                            <div>
                                <label className="text-gray-400 block text-xs font-bold uppercase tracking-widest mb-1">Joined On</label>
                                <p className="text-gray-800 font-medium">{new Date(org.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-white">
                        <h3 className="font-bold text-gray-900 mb-6 flex justify-between items-center">
                            <span>Live Inventory</span>
                            <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full">Total Units</span>
                        </h3>
                        <div className="space-y-3">
                            {org.inventory && org.inventory.length > 0 ? (
                                org.inventory.map(item => (
                                    <div key={item.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-default">
                                        <div className="flex items-center gap-3">
                                            <Badge type="blood">{item.blood_group}</Badge>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className={`font-black text-xl ${item.units < 5 ? 'text-red-500' : 'text-gray-800'}`}>{item.units}</span>
                                            <span className="text-xs font-bold text-gray-400 uppercase">units</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-300"><i className="fas fa-box-open"></i></div>
                                    <p className="text-gray-400 text-sm font-medium">No inventory records</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Members & History */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Members Table */}
                    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-white overflow-hidden">
                        <div className="p-8 border-b border-gray-100 bg-white">
                            <h3 className="font-bold text-gray-900">Associated Members</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider text-xs">
                                    <tr>
                                        <th className="px-8 py-4 text-left">Member Profile</th>
                                        <th className="px-8 py-4 text-center">Role</th>
                                        <th className="px-8 py-4 text-right">Joined Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {org.members && org.members.length > 0 ? (
                                        org.members.map(member => (
                                            <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-sm text-gray-500 font-bold border-2 border-white shadow-sm">
                                                            {member.full_name[0]}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-800">{member.full_name}</div>
                                                            <div className="text-xs text-gray-400 font-medium">{member.phone || 'No Phone'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100">{member.role}</span>
                                                </td>
                                                <td className="px-8 py-5 text-right text-gray-500 font-medium">
                                                    {new Date(member.joined_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="px-8 py-12 text-center text-gray-400">
                                                <i className="fas fa-users mb-2 text-2xl opacity-20 block"></i>
                                                No members attached to this organization
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recent Requests */}
                    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-white overflow-hidden">
                        <div className="p-8 border-b border-gray-100 bg-white">
                            <h3 className="font-bold text-gray-900">Request History</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider text-xs">
                                    <tr>
                                        <th className="px-8 py-4 text-left">Blood Info</th>
                                        <th className="px-8 py-4 text-center">Urgency</th>
                                        <th className="px-8 py-4 text-center">Status</th>
                                        <th className="px-8 py-4 text-right">Date Created</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {org.requests && org.requests.length > 0 ? (
                                        org.requests.map(req => (
                                            <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xl font-black text-red-500">{req.blood_group}</span>
                                                        <div className="h-4 w-px bg-gray-200"></div>
                                                        <span className="text-gray-600 font-bold">{req.units_required} Units</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <Badge status={req.urgency_level === 'Critical' ? 'danger' : 'warning'}>{req.urgency_level}</Badge>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <Badge status={req.status === 'Active' ? 'warning' : 'success'}>{req.status}</Badge>
                                                </td>
                                                <td className="px-8 py-5 text-right text-gray-500 font-medium">
                                                    {new Date(req.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-8 py-12 text-center text-gray-400">
                                                <i className="fas fa-clipboard-list mb-2 text-2xl opacity-20 block"></i>
                                                No service requests found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DashboardHome({ stats, data }) {
    // Process Data for Charts
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
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center"><i className="fas fa-clock"></i></span>
                        Recent Emergency Requests
                    </h3>
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
                        <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center"><i className="fas fa-exclamation-triangle"></i></span>
                        Low Stock Alerts
                    </h3>
                    <div className="space-y-3">
                        {data.inventory.filter(i => i.units < 5).slice(0, 5).map(item => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-red-50/50 rounded-2xl border border-red-100/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-red-500 font-black shadow-sm">
                                        {item.blood_group}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">{item.org_name}</p>
                                        <p className="text-xs text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded-full inline-block mt-1">Critical Level</p>
                                    </div>
                                </div>
                                <div className="text-2xl font-black text-red-500">{item.units} <span className="text-xs font-bold text-gray-400">units</span></div>
                            </div>
                        ))}
                        {data.inventory.filter(i => i.units < 5).length === 0 && (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                                <i className="fas fa-check-circle text-4xl text-green-200 mb-3"></i>
                                <p className="font-medium">Inventory levels are healthy</p>
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
                            <SidebarItem label="Admins" icon="user-shield" active={activeTab === 'admins'} onClick={() => setActiveTab('admins')} />
                        </div>
                    </nav>
                </div>
            </div>

            <div className="p-4 bg-gray-50/80 border-t border-gray-100">
                <button onClick={handleLogout} className="w-full group flex items-center justify-center gap-3 text-sm font-bold text-gray-600 hover:text-red-600 py-3.5 px-4 rounded-xl transition-all hover:bg-white hover:shadow-lg hover:shadow-gray-200/50 border border-transparent hover:border-gray-100">
                    <i className="fas fa-sign-out-alt group-hover:translate-x-1 transition-transform"></i>
                    <span>Sign Out</span>
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
                                <th key={i} className={`px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest ${i === 0 ? 'text-left' : 'text-center'}`}>{col}</th>
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

function Avatar({ name, bg = "bg-gradient-to-br from-gray-100 to-gray-200", text = "text-gray-500", className = "" }) {
    const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
    return (
        <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center ${text} text-sm font-black shadow-sm ${className}`}>
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

function InventoryMatrixView({ inventory }) {
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    const groupedData = useMemo(() => {
        const groups = {};

        inventory.forEach(item => {
            if (!groups[item.org_name]) {
                groups[item.org_name] = {
                    name: item.org_name,
                    total: 0,
                    last_updated: item.last_updated,
                    counts: {}
                };
                bloodGroups.forEach(bg => groups[item.org_name].counts[bg] = 0);
            }

            groups[item.org_name].counts[item.blood_group] = item.units;
            groups[item.org_name].total += item.units;

            if (new Date(item.last_updated) > new Date(groups[item.org_name].last_updated)) {
                groups[item.org_name].last_updated = item.last_updated;
            }
        });

        return Object.values(groups);
    }, [inventory]);

    if (!inventory || inventory.length === 0) {
        return (
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-16 text-center border border-white">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300 text-4xl animate-bounce-slow">
                    <i className="fas fa-box-open"></i>
                </div>
                <h3 className="text-xl font-black text-gray-800 mb-2">Inventory Empty</h3>
                <p className="text-gray-500 font-medium max-w-xs mx-auto">No blood units found in the system at the moment.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-white overflow-hidden animate-fade-in-up">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-6 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-widest sticky left-0 bg-gray-50 z-10 w-64 border-r border-gray-100">Organization</th>
                            {bloodGroups.map(bg => (
                                <th key={bg} className="px-4 py-5 text-center text-xs font-bold text-red-500 uppercase tracking-widest">{bg}</th>
                            ))}
                            <th className="px-6 py-5 text-center text-xs font-bold text-gray-400 uppercase tracking-widest border-l border-gray-100">Total</th>
                            <th className="px-6 py-5 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Last Updated</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {groupedData.map((org, index) => (
                            <tr key={index} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-6 py-4 font-bold text-gray-900 sticky left-0 bg-white group-hover:bg-blue-50/30 transition-colors z-10 border-r border-gray-100">
                                    <div className="flex items-center gap-3">
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
                                <td className="px-6 py-4 text-right text-sm font-medium text-gray-500">
                                    {new Date(org.last_updated).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function DonorDetailView({ donor, onBack }) {
    if (!donor) return null;

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

                {/* Profile Info Wrapper - Optimized overlap and vertical alignment */}
                <div className="px-10 pb-10 flex flex-col md:flex-row items-center -mt-10 gap-8 relative z-10">
                    <div className="relative transform transition-transform duration-500 hover:scale-105 flex-shrink-0">
                        <Avatar name={donor.full_name} size="w-40 h-40" className="border-8 border-white shadow-2xl rounded-[2.5rem]" />
                        <div className="absolute -bottom-2 -right-2 bg-red-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl border-4 border-white">
                            {donor.blood_type}
                        </div>
                    </div>
                    <div className="flex-1 pt-12 md:pt-10">
                        <div className="flex flex-wrap items-center gap-4 mb-4">
                            <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight drop-shadow-sm">{donor.full_name}</h2>
                            <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm ${donor.availability === 'Available' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {donor.availability}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-gray-500 font-bold text-sm">
                            <span className="flex items-center gap-2.5 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100/50 hover:bg-white transition-colors"><i className="fas fa-envelope text-red-500"></i> {donor.email}</span>
                            <span className="flex items-center gap-2.5 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100/50 hover:bg-white transition-colors"><i className="fas fa-phone text-green-500"></i> {donor.phone || 'No phone'}</span>
                            <span className="flex items-center gap-2.5 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100/50 hover:bg-white transition-colors"><i className="fas fa-map-marker-alt text-blue-500"></i> {donor.city}, {donor.state}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-white">
                        <h3 className="font-bold text-gray-900 mb-6 pb-4 border-b border-gray-100 uppercase tracking-widest text-xs">Personal Information</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-gray-400 block text-[10px] font-bold uppercase tracking-widest mb-1">Gender</label>
                                <p className="text-gray-800 font-bold capitalize">{donor.gender || 'Not specified'}</p>
                            </div>
                            <div>
                                <label className="text-gray-400 block text-[10px] font-bold uppercase tracking-widest mb-1">Date of Birth</label>
                                <p className="text-gray-800 font-bold">{donor.dob ? new Date(donor.dob).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-gray-400 block text-[10px] font-bold uppercase tracking-widest mb-1">Status</label>
                                <Badge status={donor.availability === 'Available' ? 'success' : 'warning'}>{donor.availability}</Badge>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-white overflow-hidden">
                        <div className="p-8 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900">Donation History</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50/50 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th className="px-8 py-4 text-left">Date</th>
                                        <th className="px-8 py-4 text-center">Organization</th>
                                        <th className="px-8 py-4 text-center">Units</th>
                                        <th className="px-8 py-4 text-right">Vitals</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {donor.donations && donor.donations.length > 0 ? (
                                        donor.donations.map(don => (
                                            <tr key={don.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-5 text-sm font-medium text-gray-600">{new Date(don.test_date).toLocaleDateString()}</td>
                                                <td className="px-8 py-5 text-center text-sm font-bold text-gray-800">{don.org_name}</td>
                                                <td className="px-8 py-5 text-center font-black text-red-600">{don.units_donated}</td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="text-[10px] font-bold text-gray-400">HB: {don.hb_level} | BP: {don.blood_pressure}</div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-8 py-12 text-center text-gray-400">No donations found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
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
