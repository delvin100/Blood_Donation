import React from 'react';
import { Link } from 'react-router-dom';

export default function OrgPendingApproval() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50/30 flex items-center justify-center p-6 font-sans">
            <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_32px_80px_rgba(0,0,0,0.08)] p-12 text-center border border-white/50 relative overflow-hidden">
                {/* Decorative Background */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -ml-16 -mb-16"></div>

                <div className="relative z-10">
                    <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500 text-4xl mb-8 mx-auto shadow-sm ring-4 ring-amber-50/50">
                        <i className="fas fa-clock-rotate-left"></i>
                    </div>

                    <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Approval Pending</h1>

                    <div className="space-y-4 mb-10 text-gray-600 font-medium leading-relaxed">
                        <p>
                            Thank you for registering your facility with <span className="text-red-600 font-bold">eBloodBank</span>.
                        </p>
                        <p>
                            To maintain the integrity of our network, all professional accounts undergo manual verification by our administration team.
                        </p>
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm italic">
                            Usually takes 24 hours.
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Link
                            to="/"
                            className="block w-full bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-red-600 transition-all shadow-xl shadow-gray-200 active:scale-[0.98]"
                        >
                            Back to Home
                        </Link>

                        <div className="pt-6 border-t border-gray-50">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Need immediate assistance?</p>
                            <a href="mailto:ebloodbankoriginal@gmail.com" className="text-sm font-bold text-gray-900 hover:text-red-600 transition-colors">
                                ebloodbankoriginal@gmail.com
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
