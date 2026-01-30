import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ donors: 0, organizations: 0, bloodUnits: 0 });
    const [data, setData] = useState({
        donors: [],
        organizations: [],
        inventory: [],
        requests: [],
        reports: []
    });
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchAllData = async () => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            navigate('/admin/login');
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const baseUrl = 'http://localhost:4000/api/admin';

            const [statsRes, donorsRes, orgsRes, invRes, reqRes, repRes] = await Promise.all([
                axios.get(`${baseUrl}/stats`, config),
                axios.get(`${baseUrl}/donors`, config),
                axios.get(`${baseUrl}/organizations`, config),
                axios.get(`${baseUrl}/inventory`, config),
                axios.get(`${baseUrl}/requests`, config),
                axios.get(`${baseUrl}/reports`, config)
            ]);

            setStats(statsRes.data);
            setData({
                donors: donorsRes.data,
                organizations: orgsRes.data,
                inventory: invRes.data,
                requests: reqRes.data,
                reports: repRes.data
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

    const getAuthConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } });

    // --- ACTIONS ---

    const handleDeleteDonor = async (id) => {
        if (!window.confirm('Are you sure you want to delete this donor?')) return;
        try {
            await axios.delete(`http://localhost:4000/api/admin/donors/${id}`, getAuthConfig());
            toast.success('Donor deleted');
            fetchAllData();
        } catch (error) {
            toast.error('Failed to delete donor');
        }
    };

    const handleDeleteOrg = async (id) => {
        if (!window.confirm('Delete this organization? All related data will be removed.')) return;
        try {
            await axios.delete(`http://localhost:4000/api/admin/organizations/${id}`, getAuthConfig());
            toast.success('Organization deleted');
            fetchAllData();
        } catch (error) {
            toast.error('Failed to delete organization');
        }
    };

    const handleVerifyOrg = async (id) => {
        try {
            await axios.put(`http://localhost:4000/api/admin/organizations/${id}/verify`, {}, getAuthConfig());
            toast.success('Organization status updated');
            fetchAllData();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };


    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500 font-medium">Loading Dashboard...</p>
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-50 font-sans overflow-hidden relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-red-200 blur-3xl mix-blend-multiply filter animate-blob"></div>
                <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-orange-200 blur-3xl mix-blend-multiply filter animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-pink-200 blur-3xl mix-blend-multiply filter animate-blob animation-delay-4000"></div>
            </div>

            <style>
                {`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob { animation: blob 7s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
                .glass-panel {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                }
                `}
            </style>

            {/* Sidebar */}
            <aside className="w-72 bg-white/80 backdrop-blur-xl border-r border-gray-100 flex flex-col justify-between shadow-xl z-20">
                <div>
                    <div className="p-8 pb-4">
                        <div className="flex items-center gap-3 text-red-600 mb-8">
                            <div className="bg-red-50 p-2 rounded-lg">
                                <i className="fas fa-heartbeat text-2xl"></i>
                            </div>
                            <span className="text-xl font-bold tracking-tight text-gray-800">LifeLink Admin</span>
                        </div>
                    </div>

                    <nav className="px-4 space-y-1">
                        <SidebarItem label="Overview" icon="chart-pie" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                        <SidebarItem label="Donors" icon="users" active={activeTab === 'donors'} onClick={() => setActiveTab('donors')} />
                        <SidebarItem label="Organizations" icon="hospital" active={activeTab === 'orgs'} onClick={() => setActiveTab('orgs')} />
                        <SidebarItem label="Inventory" icon="prescription-bottle-medical" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
                        <SidebarItem label="Emergency Requests" icon="ambulance" active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} />
                        <SidebarItem label="Medical Reports" icon="file-medical-alt" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
                    </nav>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    <button onClick={handleLogout} className="w-full group flex items-center justify-center gap-3 text-sm font-medium text-gray-600 hover:text-red-600 py-3 px-4 rounded-xl transition-all hover:bg-red-50">
                        <i className="fas fa-sign-out-alt group-hover:translate-x-1 transition-transform"></i>
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto z-10 p-8 pt-6">

                {/* Header */}
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">
                            {activeTab === 'dashboard' && 'Dashboard Overview'}
                            {activeTab === 'donors' && 'Donor Database'}
                            {activeTab === 'orgs' && 'Organization Partners'}
                            {activeTab === 'reports' && 'Donation History'}
                            {activeTab === 'inventory' && 'Blood Stock Levels'}
                            {activeTab === 'requests' && 'Emergency Requests'}
                        </h1>
                        <p className="text-gray-500 mt-1">Manage and monitor the blood donation network</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="bg-white/50 backdrop-blur-sm p-2 px-4 rounded-full border border-white/60 shadow-sm text-sm font-medium text-gray-600">
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-2"></span>
                            System Operational
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-700 to-gray-900 text-white flex items-center justify-center shadow-md border-2 border-white">
                            <i className="fas fa-user-shield"></i>
                        </div>
                    </div>
                </header>

                {/* Dashboard View */}
                {activeTab === 'dashboard' && (
                    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard title="Total Donors" value={stats.donors} icon="users" color="from-blue-500 to-blue-600" shadow="shadow-blue-500/20" />
                            <StatCard title="Partner Orgs" value={stats.organizations} icon="hospital" color="from-purple-500 to-purple-600" shadow="shadow-purple-500/20" />
                            <StatCard title="Available Units" value={stats.bloodUnits} icon="tint" color="from-red-500 to-red-600" shadow="shadow-red-500/20" />
                        </div>

                        {/* Recent Activity Section could go here */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="glass-panel p-6 rounded-2xl shadow-sm">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <i className="fas fa-clock text-gray-400"></i> Recent Requests
                                </h3>
                                {/* Mini Table for requests */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                                            <tr>
                                                <th className="px-4 py-3 rounded-l-lg">Org</th>
                                                <th className="px-4 py-3">Group</th>
                                                <th className="px-4 py-3 rounded-r-lg">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.requests.slice(0, 5).map(req => (
                                                <tr key={req.id} className="border-b border-gray-100 last:border-0">
                                                    <td className="px-4 py-3 font-medium text-gray-700">{req.org_name}</td>
                                                    <td className="px-4 py-3"><span className="font-bold text-red-500">{req.blood_group}</span></td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${req.status === 'Active' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                            {req.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="glass-panel p-6 rounded-2xl shadow-sm">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <i className="fas fa-warehouse text-gray-400"></i> Low Stock Alerts
                                </h3>
                                <div className="space-y-3">
                                    {data.inventory.filter(i => i.units < 5).slice(0, 5).map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-red-500 font-bold shadow-sm">
                                                    {item.blood_group}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800">{item.org_name}</p>
                                                    <p className="text-xs text-red-600">Critical Level</p>
                                                </div>
                                            </div>
                                            <div className="text-lg font-bold text-red-600">{item.units} <span className="text-xs font-normal text-gray-500">units</span></div>
                                        </div>
                                    ))}
                                    {data.inventory.filter(i => i.units < 5).length === 0 && (
                                        <p className="text-gray-500 text-sm text-center py-4">No low stock alerts.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Donors View */}
                {activeTab === 'donors' && (
                    <TableCard>
                        <table className="min-w-full">
                            <thead>
                                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                                    <th className="px-6 py-4">Donor Profile</th>
                                    <th className="px-6 py-4">Blood Group</th>
                                    <th className="px-6 py-4">Location</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.donors.map((donor) => (
                                    <tr key={donor.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 text-lg">
                                                    <i className="fas fa-user"></i>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900">{donor.full_name}</div>
                                                    <div className="text-xs text-gray-500">{donor.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                {donor.blood_type || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{donor.city}, {donor.state}</td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={donor.availability === 'Available' ? 'success' : 'warning'}>
                                                {donor.availability}
                                            </StatusBadge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteDonor(donor.id)}
                                                className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
                                                title="Delete Donor"
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </TableCard>
                )}

                {/* Organizations View */}
                {activeTab === 'orgs' && (
                    <TableCard>
                        <table className="min-w-full">
                            <thead>
                                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                                    <th className="px-6 py-4">Organization</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Location</th>
                                    <th className="px-6 py-4">Verification</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.organizations.map((org) => (
                                    <tr key={org.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 text-lg">
                                                    <i className="fas fa-building"></i>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-900">{org.name}</div>
                                                    <div className="text-xs text-gray-500">{org.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{org.type}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{org.city}, {org.state}</td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={org.verified ? 'success' : 'pending'}>
                                                {org.verified ? 'Verified' : 'Pending'}
                                            </StatusBadge>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleVerifyOrg(org.id)}
                                                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${org.verified ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                            >
                                                {org.verified ? 'Revoke' : 'Approve'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteOrg(org.id)}
                                                className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </TableCard>
                )}

                {/* Inventory View */}
                {activeTab === 'inventory' && (
                    <TableCard>
                        <table className="min-w-full">
                            <thead>
                                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                                    <th className="px-6 py-4">Organization</th>
                                    <th className="px-6 py-4">Blood Group</th>
                                    <th className="px-6 py-4">Units Available</th>
                                    <th className="px-6 py-4">Last Updated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.inventory.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.org_name}</td>
                                        <td className="px-6 py-4">
                                            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-xs shadow-sm">
                                                {item.blood_group}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-sm font-bold ${item.units < 5 ? 'text-red-600' : 'text-gray-700'}`}>
                                                {item.units}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(item.last_updated).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </TableCard>
                )}

                {/* Requests View */}
                {activeTab === 'requests' && (
                    <TableCard>
                        <table className="min-w-full">
                            <thead>
                                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                                    <th className="px-6 py-4">Requesting Org</th>
                                    <th className="px-6 py-4">Blood Group</th>
                                    <th className="px-6 py-4">Units Needed</th>
                                    <th className="px-6 py-4">Urgency</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Created At</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{req.org_name}</td>
                                        <td className="px-6 py-4 text-red-600 font-bold">{req.blood_group}</td>
                                        <td className="px-6 py-4 text-gray-700">{req.units_required}</td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={req.urgency_level === 'Critical' ? 'danger' : req.urgency_level === 'High' ? 'warning' : 'info'}>
                                                {req.urgency_level}
                                            </StatusBadge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs font-medium px-2 py-1 rounded-md border ${req.status === 'Active' ? 'bg-white border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'
                                                }`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(req.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </TableCard>
                )}

                {/* Reports View */}
                {activeTab === 'reports' && (
                    <TableCard>
                        <table className="min-w-full">
                            <thead>
                                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Donor</th>
                                    <th className="px-6 py-4">Blood Group</th>
                                    <th className="px-6 py-4">Collected By</th>
                                    <th className="px-6 py-4">Vitals</th>
                                    <th className="px-6 py-4">Units</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(report.test_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{report.donor_name}</div>
                                            <div className="text-xs text-gray-400">{report.donor_email}</div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-red-600">{report.blood_type}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{report.org_name}</td>
                                        <td className="px-6 py-4 text-xs text-gray-500 space-y-1">
                                            <div>BP: {report.blood_pressure || '-'}</div>
                                            <div>HB: {report.hb_level || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-gray-700">{report.units_donated}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </TableCard>
                )}

            </main>
        </div>
    );
}

// --- COMPONENTS ---

function SidebarItem({ label, icon, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium mb-1
                ${active
                    ? 'bg-red-50 text-red-600 shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
        >
            <i className={`fas fa-${icon} w-5 text-center ${active ? 'text-red-500' : 'text-gray-400'}`}></i>
            {label}
        </button>
    );
}

function StatCard({ title, value, icon, color, shadow }) {
    return (
        <div className="bg-white rounded-2xl p-6 shadow-xl shadow-gray-200/50 border border-white hover:-translate-y-1 transition-transform duration-300">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
                    <h3 className="text-3xl font-extrabold text-gray-800 mt-2">{value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} ${shadow} flex items-center justify-center text-white shadow-lg`}>
                    <i className={`fas fa-${icon} text-lg`}></i>
                </div>
            </div>
        </div>
    );
}

function TableCard({ children }) {
    return (
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-white overflow-hidden">
            <div className="overflow-x-auto">
                {children}
            </div>
        </div>
    );
}

function StatusBadge({ children, status }) {
    const styles = {
        success: 'bg-green-100 text-green-700 border-green-200',
        warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        danger: 'bg-red-100 text-red-700 border-red-200',
        info: 'bg-blue-100 text-blue-700 border-blue-200',
        pending: 'bg-gray-100 text-gray-600 border-gray-200',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
            {children}
        </span>
    );
}
