import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function OrgDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('inventory');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user');
        sessionStorage.clear();
        toast.success("Logged out successfully");
        setTimeout(() => navigate('/organization/login'), 1000);
    };

    const navItems = [
        { id: 'inventory', label: 'Blood Inventory', icon: 'fa-burn' },
        { id: 'emergency', label: 'Emergency Requests', icon: 'fa-ambulance' },
        { id: 'verification', label: 'Donor Verification', icon: 'fa-user-check' },
        { id: 'reports', label: 'Reports & Analytics', icon: 'fa-chart-pie' },
    ];

    return (
        <div className="flex h-screen bg-gray-100">

            {/* Sidebar */}
            <aside
                className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 flex flex-col shadow-xl z-20`}
            >
                <div className="h-20 flex items-center justify-center border-b border-gray-800">
                    {sidebarOpen ? (
                        <h1 className="text-xl font-bold tracking-wider text-red-500">ORG PORTAL</h1>
                    ) : (
                        <i className="fas fa-hospital text-red-500 text-2xl"></i>
                    )}
                </div>

                <nav className="flex-1 py-6 space-y-2 px-2">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 group
                ${activeTab === item.id
                                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/50'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`}
                        >
                            <div className={`w-8 flex justify-center ${activeTab === item.id ? 'text-white' : 'group-hover:text-red-400'}`}>
                                <i className={`fas ${item.icon} text-lg`}></i>
                            </div>
                            {sidebarOpen && <span className="ml-3 font-medium">{item.label}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center p-3 rounded-lg bg-gray-800 hover:bg-red-900 text-gray-400 hover:text-white transition-colors"
                    >
                        <i className="fas fa-sign-out-alt"></i>
                        {sidebarOpen && <span className="ml-3">Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header */}
                <header className="h-20 bg-white shadow-sm flex items-center justify-between px-8 z-10">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        <i className="fas fa-bars text-xl"></i>
                    </button>

                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                            <i className="fas fa-bell text-gray-400 text-xl hover:text-gray-600 cursor-pointer"></i>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold border-2 border-gray-100">
                            HP
                        </div>
                    </div>
                </header>

                {/* Dynamic Content Area */}
                <main className="flex-1 overflow-auto p-8 bg-gray-50">
                    <div className="max-w-7xl mx-auto">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 capitalize">{activeTab.replace('-', ' ')}</h2>

                        {/* Placeholder Content for Tabs */}
                        {activeTab === 'inventory' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(type => (
                                    <div key={type} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-bold text-lg border border-red-100">
                                                {type}
                                            </div>
                                            <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">Normal</span>
                                        </div>
                                        <h3 className="text-3xl font-bold text-gray-800 mb-1">24 <span className="text-sm font-normal text-gray-500">units</span></h3>
                                        <div className="flex gap-2 mt-4">
                                            <button className="flex-1 text-sm bg-gray-900 text-white py-2 rounded hover:bg-black transition-colors">Update</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'emergency' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <i className="fas fa-bullhorn text-3xl text-red-500"></i>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Create Emergency Request</h3>
                                <p className="text-gray-500 max-w-md mx-auto mb-8">Broadcast an urgent blood requirement to all nearby verified donors instantly.</p>
                                <button className="bg-red-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-red-700 shadow-lg shadow-red-200 transition-all hover:-translate-y-1">
                                    Post New Request
                                </button>
                            </div>
                        )}

                        {activeTab === 'verification' && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800">Recent Verifications</h3>
                                    <div className="relative">
                                        <input type="text" placeholder="Search Donor ID..." className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500" />
                                        <i className="fas fa-search absolute left-3 top-3 text-gray-400 text-xs"></i>
                                    </div>
                                </div>
                                <div className="p-12 text-center text-gray-400">
                                    <i className="fas fa-clipboard-list text-4xl mb-4 text-gray-200"></i>
                                    <p>No recent verifications found.</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'reports' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-xl shadow-sm h-64 flex items-center justify-center border border-gray-100">
                                    <p className="text-gray-400 font-medium">Monthly Donation Stats Chart</p>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm h-64 flex items-center justify-center border border-gray-100">
                                    <p className="text-gray-400 font-medium">Inventory Usage Chart</p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
