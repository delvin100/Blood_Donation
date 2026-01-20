import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';

/**
 * MedicalReports Component
 * Handles viewing donor clinical history and digitizing new lab collections.
 * Features: Instant loading, professional PDF generation, and medical-grade validations.
 */
const MedicalReports = ({ selectedDonor, onClose, orgDetails }) => {
    const [donorReports, setDonorReports] = useState([]);
    const [reportsLoading, setReportsLoading] = useState(true);
    const [reportForm, setReportForm] = useState({
        hb_level: '', blood_pressure: '', pulse_rate: '', temperature: '', weight: '', units_donated: '1.0',
        blood_group: 'A+', rh_factor: 'Positive',
        hiv_status: 'Negative', hepatitis_b: 'Negative', hepatitis_c: 'Negative',
        syphilis: 'Negative', malaria: 'Negative', notes: ''
    });
    const [formErrors, setFormErrors] = useState({});

    // Sync reports when donor changes
    useEffect(() => {
        if (selectedDonor) {
            fetchDonorReports();
        }
    }, [selectedDonor]);

    const fetchDonorReports = async () => {
        setReportsLoading(true);
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await axios.get(`/api/organization/member/${selectedDonor.donor_id}/reports`, {
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

        if (!reportForm.hb_level || reportForm.hb_level < 5 || reportForm.hb_level > 25)
            errors.hb_level = "Invalid Hb (5-25 g/dL)";
        if (!reportForm.blood_pressure || !bpRegex.test(reportForm.blood_pressure))
            errors.blood_pressure = "Use format 120/80";
        if (!reportForm.pulse_rate || reportForm.pulse_rate < 40 || reportForm.pulse_rate > 200)
            errors.pulse_rate = "Invalid Pulse (40-200)";
        if (!reportForm.temperature || reportForm.temperature < 35 || reportForm.temperature > 42)
            errors.temperature = "Invalid Temp (35-42°C)";
        if (!reportForm.weight || reportForm.weight < 30 || reportForm.weight > 250)
            errors.weight = "Invalid Weight (30-250kg)";
        if (!reportForm.units_donated || reportForm.units_donated < 0.1 || reportForm.units_donated > 5.0)
            errors.units_donated = "Units (0.1-5.0)";

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleAddReport = async (e) => {
        e.preventDefault();
        if (!validateMedicalForm()) {
            return toast.error("Please correct the clinical indicators");
        }

        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            await axios.post(`/api/organization/member/${selectedDonor.donor_id}/reports`, reportForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Clinical Record Authenticated");

            // Reset form for next entry
            setReportForm(prev => ({
                ...prev, hb_level: '', blood_pressure: '', pulse_rate: '', temperature: '', weight: '', units_donated: '1.0', notes: ''
            }));
            setFormErrors({});

            // Refresh history
            fetchDonorReports();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to add report");
        }
    };

    const generateClinicalPDF = (report) => {
        const doc = new jsPDF();
        const dateStr = new Date(report.test_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

        // --- THEMED HEADER ---
        doc.setFillColor(15, 23, 42); // slate-900 (Darker Header)
        doc.rect(0, 0, 210, 50, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(28);
        doc.setFont("helvetica", "bold");
        doc.text("MEDICAL CLINICAL REPORT", 20, 25);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Authenticated Digital Health Record | ${selectedDonor.donor_tag || 'Verified Member'}`, 20, 35);
        doc.text(`Ref: ${report.donor_tag || selectedDonor.donor_tag || 'DH-00' + selectedDonor.id}`, 190, 35, { align: "right" });

        // --- DONOR SUMMARY BOX ---
        doc.setFillColor(248, 250, 252);
        doc.rect(20, 60, 170, 45, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(20, 60, 170, 45, 'S');

        doc.setTextColor(71, 85, 105);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("DONOR INFORMATION", 25, 70);

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.text(`Name: ${selectedDonor.full_name}`, 25, 80);
        doc.text(`Donor ID: #DH-00${selectedDonor.id}`, 25, 88);
        doc.text(`Blood Group: ${report.blood_group} ${report.rh_factor}`, 110, 80);
        doc.text(`Units Donated: ${report.units_donated || '1.0'}`, 110, 88);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Date of Verification: ${dateStr}`, 25, 98);
        doc.text(`Facility: ${orgDetails?.name || "Verified Medical Center"}`, 110, 98);

        // --- VITALS SECTION ---
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("CLINICAL VITALS & BIOMETRICS", 20, 120);
        doc.setDrawColor(79, 70, 229); // indigo-600
        doc.setLineWidth(1);
        doc.line(20, 123, 50, 123);

        const vGridY = 135;
        const vitals = [
            { label: "Hemoglobin", value: `${report.hb_level} g/dL`, unit: "g/dL" },
            { label: "Blood Pressure", value: report.blood_pressure, unit: "mmHg" },
            { label: "Pulse Rate", value: `${report.pulse_rate} BPM`, unit: "BPM" },
            { label: "Temperature", value: `${report.temperature} °C`, unit: "Celsius" },
            { label: "Weight", value: `${report.weight} kg`, unit: "Kilograms" },
            { label: "Clinical Status", value: "Fit to Donate", unit: "Screened" }
        ];

        vitals.forEach((v, i) => {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const x = 20 + (col * 60);
            const y = vGridY + (row * 35);

            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(241, 245, 249);
            doc.roundedRect(x, y, 50, 28, 2, 2, 'FD');

            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(v.label.toUpperCase(), x + 25, y + 8, { align: "center" });

            doc.setFontSize(12);
            doc.setTextColor(79, 70, 229);
            doc.setFont("helvetica", "bold");
            doc.text(v.value, x + 25, y + 18, { align: "center" });

            doc.setFontSize(6);
            doc.setTextColor(148, 163, 184);
            doc.setFont("helvetica", "normal");
            doc.text(v.unit, x + 25, y + 24, { align: "center" });
        });

        // --- LABORATORY SCREENING ---
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("LABORATORY SCREENING RESULTS", 20, 215);
        doc.line(20, 218, 50, 218);

        const screeningTests = [
            { name: "HIV (Type I & II Antibody)", status: report.hiv_status },
            { name: "Hepatitis B Surface Antigen (HBsAg)", status: report.hepatitis_b },
            { name: "Hepatitis C Virus Antibody (HCV)", status: report.hepatitis_c },
            { name: "Syphilis (Treponema pallidum)", status: report.syphilis },
            { name: "Malaria (Antigen Screening)", status: report.malaria }
        ];

        screeningTests.forEach((s, i) => {
            const y = 230 + (i * 10);
            doc.setFontSize(9);
            doc.setTextColor(51, 65, 85);
            doc.setFont("helvetica", "normal");
            doc.text(s.name, 25, y);

            const isNeg = s.status === 'Negative';
            if (isNeg) {
                doc.setTextColor(16, 185, 129);
                doc.text("NEGATIVE (PASSED)", 185, y, { align: "right" });
            } else {
                doc.setTextColor(244, 63, 94);
                doc.text("POSITIVE (ALERT)", 185, y, { align: "right" });
            }

            doc.setDrawColor(241, 245, 249);
            doc.line(20, y + 3, 190, y + 3);
        });

        if (report.notes) {
            doc.addPage();
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, 210, 20, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.text("CLINICAL ANNOTATIONS & NOTES", 20, 13);

            doc.setTextColor(71, 85, 105);
            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            const splitNotes = doc.splitTextToSize(report.notes, 170);
            doc.text(splitNotes, 20, 40);
        }

        // --- FOOTER ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setTextColor(148, 163, 184);
            doc.setFontSize(8);
            doc.text(`Digitally Authenticated Health Record | Generated on ${new Date().toLocaleString()}`, 105, 285, { align: "center" });
            doc.text(`Page ${i} of ${pageCount}`, 190, 285, { align: "right" });
        }

        doc.save(`Medical_Report_${selectedDonor.full_name.replace(' ', '_')}_#${report.id}.pdf`);
        toast.success("Medical Report Downloaded");
    };

    return (
        <div className="fixed inset-0 z-[200] bg-[#f8fafc] flex flex-col animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
            {/* Header Section */}
            <div className="px-8 lg:px-12 py-6 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-10">
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center justify-center group border border-slate-100"
                        title="Close Archive"
                    >
                        <i className="fas fa-times group-hover:rotate-180 transition-transform duration-500"></i>
                    </button>

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
                                <p className="text-sm font-semibold">{selectedDonor?.full_name}</p>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <p className="text-xs font-medium uppercase tracking-widest text-indigo-600">{selectedDonor?.donor_tag}</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50">
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
                                                            { label: 'Units Donated', value: report.units_donated || '1.0', unit: 'Units', highlight: true },
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
                                                            { label: 'HIV (I & II)', status: report.hiv_status },
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

                        {/* RIGHT COLUMN: Lab Collection Form */}
                        <div className="xl:col-span-7">
                            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 lg:p-12 shadow-sm sticky top-32">
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
                                                    type="number" step="0.1" value={reportForm.hb_level}
                                                    onChange={e => setReportForm({ ...reportForm, hb_level: e.target.value })}
                                                    className={`w-full bg-slate-50 border-2 ${formErrors.hb_level ? 'border-rose-400 ring-4 ring-rose-50' : 'border-slate-100'} rounded-2xl px-6 py-4 font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all`}
                                                    placeholder="g/dL"
                                                />
                                                {formErrors.hb_level && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{formErrors.hb_level}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">B. Pressure</label>
                                                <input
                                                    type="text" value={reportForm.blood_pressure}
                                                    onChange={e => setReportForm({ ...reportForm, blood_pressure: e.target.value })}
                                                    className={`w-full bg-slate-50 border-2 ${formErrors.blood_pressure ? 'border-rose-400 ring-4 ring-rose-50' : 'border-slate-100'} rounded-2xl px-6 py-4 font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all`}
                                                    placeholder="120/80"
                                                />
                                                {formErrors.blood_pressure && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{formErrors.blood_pressure}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Units (Blood)</label>
                                                <input
                                                    type="number" step="0.1" value={reportForm.units_donated}
                                                    onChange={e => setReportForm({ ...reportForm, units_donated: e.target.value })}
                                                    className={`w-full bg-slate-50 border-2 ${formErrors.units_donated ? 'border-rose-400 ring-4 ring-rose-50' : 'border-slate-100'} rounded-2xl px-6 py-4 font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all`}
                                                    placeholder="1.0"
                                                />
                                                {formErrors.units_donated && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{formErrors.units_donated}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Weight (kg)</label>
                                                <input
                                                    type="number" value={reportForm.weight}
                                                    onChange={e => setReportForm({ ...reportForm, weight: e.target.value })}
                                                    className={`w-full bg-slate-50 border-2 ${formErrors.weight ? 'border-rose-400 ring-4 ring-rose-50' : 'border-slate-100'} rounded-2xl px-6 py-4 font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all`}
                                                    placeholder="kg"
                                                />
                                                {formErrors.weight && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{formErrors.weight}</p>}
                                            </div>
                                        </div>

                                        {/* Other Vitals Section */}
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Pulse Rate</label>
                                                <input
                                                    type="number" value={reportForm.pulse_rate}
                                                    onChange={e => setReportForm({ ...reportForm, pulse_rate: e.target.value })}
                                                    className={`w-full bg-slate-50 border-2 ${formErrors.pulse_rate ? 'border-rose-400 ring-4 ring-rose-50' : 'border-slate-100'} rounded-2xl px-5 py-4 font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all`}
                                                    placeholder="BPM"
                                                />
                                                {formErrors.pulse_rate && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{formErrors.pulse_rate}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Temperature</label>
                                                <input
                                                    type="number" step="0.1" value={reportForm.temperature}
                                                    onChange={e => setReportForm({ ...reportForm, temperature: e.target.value })}
                                                    className={`w-full bg-slate-50 border-2 ${formErrors.temperature ? 'border-rose-400 ring-4 ring-rose-50' : 'border-slate-100'} rounded-2xl px-5 py-4 font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all`}
                                                    placeholder="°C"
                                                />
                                                {formErrors.temperature && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{formErrors.temperature}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Blood Group</label>
                                                <select
                                                    value={reportForm.blood_group}
                                                    onChange={e => setReportForm({ ...reportForm, blood_group: e.target.value })}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all cursor-pointer"
                                                >
                                                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <option key={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Rh Factor</label>
                                                <select
                                                    value={reportForm.rh_factor}
                                                    onChange={e => setReportForm({ ...reportForm, rh_factor: e.target.value })}
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all cursor-pointer"
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

                                        <button
                                            type="submit"
                                            className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-lg hover:bg-black hover:shadow-2xl hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-4 group shadow-xl"
                                        >
                                            <span>Securely Record Result</span>
                                            <i className="fas fa-shield-alt text-indigo-400 group-hover:rotate-12 transition-transform"></i>
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MedicalReports;
