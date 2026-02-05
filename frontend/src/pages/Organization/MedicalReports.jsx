import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';

/**
 * MedicalReports Component
 * Handles viewing donor clinical history and digitizing new lab collections.
 * Features: Instant loading, professional PDF generation, and medical-grade validations.
 */
const MedicalReports = ({ selectedDonor, onClose, orgDetails, refreshData }) => {
    const [donorReports, setDonorReports] = useState([]);
    const [reportsLoading, setReportsLoading] = useState(true);
    const [localDonor, setLocalDonor] = useState(selectedDonor);
    const [reportForm, setReportForm] = useState({
        hb_level: '', blood_pressure: '', pulse_rate: '', temperature: '', weight: '', units_donated: '1',
        blood_group: 'A+', rh_factor: 'Positive',
        hiv_status: 'Negative', hepatitis_b: 'Negative', hepatitis_c: 'Negative',
        syphilis: 'Negative', malaria: 'Negative', notes: ''
    });
    const [formErrors, setFormErrors] = useState({});
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeReportForPDF, setActiveReportForPDF] = useState(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // Sync reports when donor changes
    useEffect(() => {
        if (selectedDonor) {
            setLocalDonor(selectedDonor);
            fetchDonorReports();

            // Auto-populate blood group and rh factor from donor data
            if (selectedDonor.blood_type) {
                const type = selectedDonor.blood_type;
                const rh = type.endsWith('+') ? 'Positive' : (type.endsWith('-') ? 'Negative' : 'Positive');
                setReportForm(prev => ({
                    ...prev,
                    blood_group: type,
                    rh_factor: rh
                }));
            }
        }
    }, [selectedDonor]);

    const fetchDonorReports = async () => {
        setReportsLoading(true);
        try {
            const donorId = localDonor?.donor_id || localDonor?.id;
            if (!donorId) return;
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await axios.get(`/api/organization/member/${donorId}/reports`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDonorReports(res.data);
        } catch (err) {
            toast.error("Failed to fetch medical records");
        } finally {
            setReportsLoading(false);
        }
    };

    const validateMedicalForm = () => {
        let errors = {};
        const bpRegex = /^\d{2,3}\/\d{2,3}$/;

        if (!reportForm.hb_level || reportForm.hb_level < 7 || reportForm.hb_level > 18)
            errors.hb_level = "Invalid Hb (7-18 g/dL)";
        if (!reportForm.blood_pressure || !bpRegex.test(reportForm.blood_pressure)) {
            errors.blood_pressure = "Use format 120/80";
        } else {
            const [sys, dia] = reportForm.blood_pressure.split('/').map(Number);
            if (sys < 90 || sys > 180 || dia < 60 || dia > 120) {
                errors.blood_pressure = "BP Out of Range (90/60 - 180/120)";
            }
        }
        if (!reportForm.pulse_rate || reportForm.pulse_rate < 40 || reportForm.pulse_rate > 140)
            errors.pulse_rate = "Invalid Pulse (40-140)";
        if (!reportForm.temperature || reportForm.temperature < 35 || reportForm.temperature > 40)
            errors.temperature = "Invalid Temp (35-40°C)";
        if (!reportForm.weight || reportForm.weight < 30 || reportForm.weight > 200)
            errors.weight = "Invalid Weight (30-200kg)";

        if (reportForm.units_donated === '' || reportForm.units_donated < 0 || reportForm.units_donated > 1.0)
            errors.units_donated = "Units (0.0 or 1.0)";

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleAddReport = async (e) => {
        e.preventDefault();
        if (!validateMedicalForm()) {
            return toast.error("Please correct the clinical indicators");
        }
        setShowConfirmation(true);
    };

    const confirmSubmission = async (isDonation) => {
        setIsSubmitting(true);
        const submitToast = toast.loading(isDonation ? "Recording donation..." : "Saving clinical record...");
        try {
            const donorId = localDonor.donor_id || localDonor.id;
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');

            await axios.post(`/api/organization/member/${donorId}/reports`,
                { ...reportForm, isDonation },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (isDonation) {
                toast.success("Donation Success: Donor now restricted for 90 days", { id: submitToast });
                // Update local donor state to trigger UI changes immediately
                setLocalDonor(prev => ({ ...prev, availability: 'Unavailable' }));
            } else {
                toast.success("Clinical Record Authenticated", { id: submitToast });
            }

            // Reset form for next entry
            setReportForm(prev => ({
                ...prev, hb_level: '', blood_pressure: '', pulse_rate: '', temperature: '', weight: '', units_donated: '1', notes: ''
            }));
            setFormErrors({});
            setShowConfirmation(false);

            // Refresh history in the modal
            fetchDonorReports();

            // Notify parent to refresh lists
            if (refreshData) refreshData();

        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to process request", { id: submitToast });
        } finally {
            setIsSubmitting(false);
        }
    };


    const generateClinicalPDF = async (report) => {
        setIsGeneratingPDF(true);
        setActiveReportForPDF(report);

        // Short delay to ensure state update and template rendering
        setTimeout(async () => {
            try {
                const html2canvas = (await import('html2canvas')).default;
                const template = document.getElementById('medical-report-template');

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
                pdf.save(`Medical_Report_${report.id || 'DR'}_${localDonor.full_name.replace(/\s+/g, '_')}.pdf`);
                toast.success('Professional Report Exported');
            } catch (err) {
                console.error("PDF Export failed", err);
                toast.error("Failed to generate professional PDF");
            } finally {
                setIsGeneratingPDF(false);
                setActiveReportForPDF(null);
            }
        }, 100);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-[#f8fafc] animate-in fade-in zoom-in-95 duration-500 overflow-y-auto">
            {/* Header Section */}
            <div className="px-8 lg:px-12 py-6 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                        <i className="fas fa-dna text-2xl"></i>
                    </div>
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Verified Medical Archive</h3>
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100/50">Secure File</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500">
                            <p className="text-sm font-semibold">{localDonor?.full_name}</p>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <p className="text-xs font-medium uppercase tracking-widest text-indigo-600">{localDonor?.donor_tag}</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center justify-center group border border-slate-100"
                    title="Close Archive"
                >
                    <i className="fas fa-times group-hover:rotate-180 transition-transform duration-500"></i>
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="bg-slate-50/50 min-h-screen">
                <div className="max-w-[1700px] mx-auto p-8 lg:p-16">
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 lg:gap-16">

                        {/* LEFT COLUMN: Clinical Entry Log */}
                        <div className="xl:col-span-5 space-y-8">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-1 h-8 bg-slate-900 rounded-full"></div>
                                    <h4 className="text-xl font-bold text-slate-900 tracking-tight">Clinical Entry Log</h4>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white border border-slate-200 px-3 py-1 rounded-lg">
                                    {donorReports.length} Established Records
                                </p>
                            </div>

                            {reportsLoading ? (
                                <div className="py-24 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-3xl">
                                    <div className="w-10 h-10 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                    <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Records...</p>
                                </div>
                            ) : donorReports.length === 0 ? (
                                <div className="p-16 bg-white border border-slate-200 rounded-3xl text-center space-y-6">
                                    <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-200">
                                        <i className="fas fa-clipboard-list text-3xl"></i>
                                    </div>
                                    <div className="space-y-2">
                                        <h5 className="text-lg font-bold text-slate-900">No Historical Data</h5>
                                        <p className="text-sm text-slate-500 max-w-xs mx-auto">This donor has no established clinical entries in the digital archive yet.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {donorReports.map((report, idx) => (
                                        <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300">
                                            <div className="flex justify-between items-start mb-8">
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-slate-900">Clinical Verification</p>
                                                    <p className="text-xs font-medium text-slate-400">{new Date(report.test_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-3">
                                                    <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-black border border-indigo-100/50">
                                                        {report.blood_group} {report.rh_factor}
                                                    </span>
                                                    <button
                                                        onClick={() => generateClinicalPDF(report)}
                                                        className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-colors"
                                                    >
                                                        <i className="fas fa-file-pdf"></i>
                                                        Download PDF
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                {/* Vitals Breakdown */}
                                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <div className="flex items-center gap-2 mb-6">
                                                        <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
                                                            <i className="fas fa-heartbeat text-indigo-600 text-xs"></i>
                                                        </div>
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Clinical Vitals</p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                                        {[
                                                            { label: 'Hemoglobin', value: report.hb_level, unit: 'g/dL' },
                                                            { label: 'Pulse Rate', value: report.pulse_rate, unit: 'BPM' },
                                                            { label: 'Blood Pressure', value: report.blood_pressure, unit: 'mmHg' },
                                                            { label: 'Temperature', value: report.temperature, unit: '°C' },
                                                            { label: 'Units Donated', value: report.units_donated || '1', unit: 'Units', highlight: true },
                                                            { label: 'Weight', value: report.weight, unit: 'kg' }
                                                        ].map((item, i) => (
                                                            <div key={i} className="flex flex-col gap-1">
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                                                                <div className="flex items-baseline gap-1.5">
                                                                    <span className={`text-base font-black ${item.highlight ? "text-indigo-600" : "text-slate-900"}`}>{item.value}</span>
                                                                    <span className="text-[9px] font-bold text-slate-400 lowercase">{item.unit}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Screening Panel */}
                                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <div className="flex items-center gap-2 mb-6">
                                                        <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                                                            <i className="fas fa-shield-virus text-emerald-600 text-xs"></i>
                                                        </div>
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Safety Panel</p>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {[
                                                            { label: 'HIV', status: report.hiv_status },
                                                            { label: 'Hepatitis B', status: report.hepatitis_b },
                                                            { label: 'Hepatitis C', status: report.hepatitis_c },
                                                            { label: 'Syphilis', status: report.syphilis },
                                                            { label: 'Malaria', status: report.malaria }
                                                        ].map((test, i) => (
                                                            <div key={i} className="flex justify-between items-center text-[11px] font-bold px-4 py-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                                                <span className="text-slate-600">{test.label}</span>
                                                                <span className={test.status === 'Negative' ? "text-emerald-600" : "text-rose-600"}>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-1.5 h-1.5 rounded-full ${test.status === 'Negative' ? "bg-emerald-500" : "bg-rose-500"}`}></div>
                                                                        <span className="uppercase tracking-tighter">{test.status}</span>
                                                                    </div>
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {report.notes && (
                                                <div className="mt-8 p-5 bg-white border border-slate-200 rounded-2xl relative overflow-hidden group">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-indigo-500 transition-colors"></div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <i className="fas fa-comment-medical text-indigo-500"></i>
                                                        Clinical Observations
                                                    </p>
                                                    <p className="text-sm text-slate-600 font-medium leading-relaxed italic">"{report.notes}"</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="xl:col-span-7">
                            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 lg:p-12 shadow-sm">
                                <div className="space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                                            <i className="fas fa-microscope text-xl"></i>
                                        </div>
                                        <div>
                                            <h4 className="text-2xl font-bold text-slate-900">Digitalize Lab Collection</h4>
                                            <p className="text-sm text-slate-500 font-medium tracking-tight">Capture real-time clinical indicators for biological verification.</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleAddReport} className="space-y-10">
                                        {/* Physical Vitals Section */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Hemoglobin (Hb)</label>
                                                <input
                                                    type="number" step="0.1" min="7" max="18" value={reportForm.hb_level}
                                                    onChange={e => setReportForm({ ...reportForm, hb_level: e.target.value })}
                                                    className={`w-full bg-slate-50 border-2 ${formErrors.hb_level ? 'border-red-400 ring-4 ring-red-50' : 'border-slate-100'} rounded-2xl px-6 py-4 font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all`}
                                                    placeholder="7.0 - 18.0"
                                                />

                                                {formErrors.hb_level && <p className="text-[11px] text-red-600 font-bold mt-1.5 ml-1">{formErrors.hb_level}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">B. Pressure</label>
                                                <input
                                                    type="text"
                                                    pattern="[0-9]{2,3}/[0-9]{2,3}"
                                                    value={reportForm.blood_pressure}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/[^0-9/]/g, '');
                                                        setReportForm({ ...reportForm, blood_pressure: val });
                                                    }}
                                                    className={`w-full bg-slate-50 border-2 ${formErrors.blood_pressure ? 'border-red-400 ring-4 ring-red-50' : 'border-slate-100'} rounded-2xl px-6 py-4 font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all`}
                                                    placeholder="120/80"
                                                />
                                                {formErrors.blood_pressure && <p className="text-[11px] text-red-600 font-bold mt-1.5 ml-1">{formErrors.blood_pressure}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Units (Blood)</label>
                                                <input
                                                    type="number" step="1" min="0" max="1" value={reportForm.units_donated}
                                                    onKeyDown={(e) => {
                                                        const allowedKeys = ['0', '1', 'Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Enter'];
                                                        if (!allowedKeys.includes(e.key)) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (val === '0' || val === '1' || val === '') {
                                                            setReportForm({ ...reportForm, units_donated: val });
                                                        }
                                                    }}
                                                    className={`w-full bg-slate-50 border-2 ${formErrors.units_donated ? 'border-red-400 ring-4 ring-red-50' : 'border-slate-100'} rounded-2xl px-6 py-4 font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all`}
                                                    placeholder="1"
                                                />
                                                {formErrors.units_donated && <p className="text-[11px] text-red-600 font-bold mt-1.5 ml-1">{formErrors.units_donated}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Weight (kg)</label>
                                                <input
                                                    type="number" min="30" max="200" value={reportForm.weight}
                                                    onChange={e => setReportForm({ ...reportForm, weight: e.target.value })}
                                                    className={`w-full bg-slate-50 border-2 ${formErrors.weight ? 'border-red-400 ring-4 ring-red-50' : 'border-slate-100'} rounded-2xl px-6 py-4 font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all`}
                                                    placeholder="30 - 200"
                                                />

                                                {formErrors.weight && <p className="text-[11px] text-red-600 font-bold mt-1.5 ml-1">{formErrors.weight}</p>}
                                            </div>
                                        </div>

                                        {/* Other Vitals Section */}
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Pulse Rate</label>
                                                <input
                                                    type="number" min="40" max="140" value={reportForm.pulse_rate}
                                                    onChange={e => setReportForm({ ...reportForm, pulse_rate: e.target.value })}
                                                    className={`w-full bg-slate-50 border-2 ${formErrors.pulse_rate ? 'border-red-400 ring-4 ring-red-50' : 'border-slate-100'} rounded-2xl px-5 py-4 font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all`}
                                                    placeholder="40 - 140"
                                                />

                                                {formErrors.pulse_rate && <p className="text-[11px] text-red-600 font-bold mt-1.5 ml-1">{formErrors.pulse_rate}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Temperature</label>
                                                <input
                                                    type="number" step="0.1" min="35" max="40" value={reportForm.temperature}
                                                    onChange={e => setReportForm({ ...reportForm, temperature: e.target.value })}
                                                    className={`w-full bg-slate-50 border-2 ${formErrors.temperature ? 'border-red-400 ring-4 ring-red-50' : 'border-slate-100'} rounded-2xl px-5 py-4 font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all`}
                                                    placeholder="35.0 - 40.0"
                                                />

                                                {formErrors.temperature && <p className="text-[11px] text-red-600 font-bold mt-1.5 ml-1">{formErrors.temperature}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Blood Group</label>
                                                <select
                                                    disabled
                                                    value={reportForm.blood_group}
                                                    onChange={e => setReportForm({ ...reportForm, blood_group: e.target.value })}
                                                    className="w-full bg-slate-100 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-500 outline-none transition-all cursor-not-allowed appearance-none"
                                                >
                                                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <option key={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Rh Factor</label>
                                                <select
                                                    disabled
                                                    value={reportForm.rh_factor}
                                                    onChange={e => setReportForm({ ...reportForm, rh_factor: e.target.value })}
                                                    className="w-full bg-slate-100 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-500 outline-none transition-all cursor-not-allowed appearance-none"
                                                >
                                                    <option>Positive</option>
                                                    <option>Negative</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Security Screenings Panel */}
                                        <div className="pt-6 border-t border-slate-100">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Infectious Disease Safety Panel</p>
                                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                                {['hiv_status', 'hepatitis_b', 'hepatitis_c', 'syphilis', 'malaria'].map(test => (
                                                    <div key={test} className="space-y-2">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase truncate block ml-1">{test.replace('_', ' ')}</label>
                                                        <select
                                                            value={reportForm[test]}
                                                            onChange={e => setReportForm({ ...reportForm, [test]: e.target.value })}
                                                            className={`w-full ${reportForm[test] === 'Negative' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'} border rounded-xl px-4 py-3 font-bold text-[11px] outline-none transition-all cursor-pointer`}
                                                        >
                                                            <option>Negative</option>
                                                            <option>Positive</option>
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Clinical Observations</label>
                                            <textarea
                                                value={reportForm.notes}
                                                onChange={e => setReportForm({ ...reportForm, notes: e.target.value })}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all min-h-[120px]"
                                                placeholder="Enter any medical observations or patient history notes..."
                                            />
                                        </div>

                                        {!showConfirmation ? (
                                            <button
                                                type="submit"
                                                className="w-full py-6 rounded-[2rem] font-black text-lg transition-all flex items-center justify-center gap-4 group shadow-xl bg-slate-900 text-white hover:bg-black hover:shadow-indigo-500/20"
                                            >
                                                <span>Securely Record Result</span>
                                                <i className="fas fa-shield-alt text-indigo-400 group-hover:rotate-12 transition-transform"></i>
                                            </button>
                                        ) : (
                                            <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                                                <p className="text-center text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Confirm Collection Status</p>
                                                <div className="flex flex-col sm:flex-row gap-4">
                                                    <button
                                                        type="button"
                                                        disabled={isSubmitting}
                                                        onClick={() => {
                                                            if (localDonor.availability !== 'Available') {
                                                                toast.error("Currently not available for donation");
                                                                return;
                                                            }
                                                            confirmSubmission(true);
                                                        }}
                                                        className={`flex-1 py-5 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${localDonor.availability === 'Available'
                                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20'
                                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                                            }`}
                                                    >
                                                        <i className="fas fa-check-circle"></i>
                                                        Mark Eligible
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isSubmitting}
                                                        onClick={() => confirmSubmission(false)}
                                                        className="flex-1 py-5 bg-rose-600 text-white rounded-2xl font-black text-sm hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/20 active:scale-95 flex items-center justify-center gap-2"
                                                    >
                                                        <i className="fas fa-times-circle"></i>
                                                        Mark Ineligible
                                                    </button>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmation(false)}
                                                    className="w-full py-3 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors"
                                                >
                                                    Back to Form
                                                </button>
                                            </div>
                                        )}
                                        {localDonor.availability !== 'Available' && !showConfirmation && (
                                            <p className="text-center text-[11px] font-bold text-rose-500 uppercase tracking-widest mt-4">
                                                <i className="fas fa-exclamation-triangle mr-2"></i>
                                                This donor is currently restricted from new collection entries.
                                            </p>
                                        )}
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* HIDDEN PDF TEMPLATE - Standardized across platform */}
            <div className="fixed -left-[9999px] top-0">
                <div id="medical-report-template" className="bg-white p-12 w-[800px]">
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
                                <p className="text-xl font-black text-gray-800">{localDonor?.full_name}</p>
                                <p className="text-gray-600 font-medium">{localDonor?.email}</p>
                                <p className="text-gray-600 font-medium">{localDonor?.phone || 'N/A'}</p>
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
                                <p className="text-sm text-gray-400 font-medium">Date: {activeReportForPDF?.test_date ? new Date(activeReportForPDF.test_date).toLocaleDateString('en-GB') : 'N/A'}</p>

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
    );
};

export default MedicalReports;
