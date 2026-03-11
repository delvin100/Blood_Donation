import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import "../../assets/css/home.css";
import BackToTop from "../../components/common/BackToTop";
import { stateDistrictMapping, cityToDistrictMapping } from "../../utils/locationData";

// Location data imported from ../../utils/locationData

const OrganizationSearch = () => {
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [district, setDistrict] = useState("");
    const [type, setType] = useState("All");
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isFetchingLoc, setIsFetchingLoc] = useState(false);
    const [emergencyRequests, setEmergencyRequests] = useState([]);
    const [showEmergencies, setShowEmergencies] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState(null);
    const pendingDistrictRef = React.useRef(null);

    const navigate = useNavigate();

    useEffect(() => {
        handleSearch();
    }, []);

    // Apply GPS-detected district AFTER the state's district options are rendered in the DOM
    useEffect(() => {
        if (state && pendingDistrictRef.current) {
            const districts = stateDistrictMapping[state] || [];
            const pending = pendingDistrictRef.current;
            pendingDistrictRef.current = null;
            // Check the value is actually a valid option for this state
            if (districts.includes(pending)) {
                setDistrict(pending);
                console.log(`Applied pending district: ${pending} for state: ${state}`);
            } else {
                console.warn(`Pending district "${pending}" not found in options for state "${state}"`);
            }
        }
    }, [state]);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);

        try {
            // Case 1: Proximity Search via City Geocoding
            if (city.trim()) {
                try {
                    const query = `${city}, ${district}, ${state}, India`.replace(/, , /g, ", ").replace(/^, /, "");
                    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`).then(r => r.json());

                    if (geoRes && geoRes.length > 0) {
                        const { lat, lon } = geoRes[0];
                        const res = await axios.get("/api/home/organizations/nearby", {
                            params: { lat, lng: lon, type: type !== 'All' ? type : undefined }
                        });

                        // ONLY exit if we actually found something nearby
                        if (res.data && res.data.length > 0) {
                            setOrganizations(res.data);
                            toast.success(`Hospitals found around ${city}`);
                            return;
                        }
                        console.log("No nearby results, falling back to exact match...");
                    }
                } catch (geoErr) {
                    console.warn("City geocoding failed, falling back to exact match:", geoErr);
                }
            }

            // Case 2: Exact Match Search (Fallback or Default)
            const res = await axios.get("/api/home/organizations/search", {
                params: { city, state, district, type }
            });
            setOrganizations(res.data);
            if (res.data.length > 0 && city) {
                toast.success(`Hospitals found in ${city}`);
            }

        } catch (err) {
            console.error("Search error:", err);
            toast.error("Failed to fetch organizations");
        } finally {
            setLoading(false);
        }
    };

    const fetchByLocation = async () => {
        if (!navigator.geolocation) return toast.error("Geolocation not supported");
        setIsFetchingLoc(true);

        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;

            try {
                // Phase 1: Primary Nearby Search (Critical)
                const nearRes = await axios.get("/api/home/organizations/nearby", {
                    params: { lat: latitude, lng: longitude }
                });
                setOrganizations(nearRes.data);

                // If search succeeded, show count immediately
                toast.success(`Found ${nearRes.data.length} organizations nearby`);

                // Phase 2: Reverse Geocode (Optional/Enhancement)
                // We wrap this in a separate try block to prevent external API failures 
                // from breaking the primary search flow.
                try {
                    const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
                        headers: {
                            'Accept-Language': 'en-US,en;q=0.9',
                        }
                    }).then(r => r.json());

                    if (geoRes && geoRes.address) {
                        const addr = geoRes.address;

                        // Comprehensive address detection
                        const dState = (addr.state || addr.province || addr.state_district || "").trim();
                        const dDistrict = (addr.state_district || addr.county || addr.district || addr.city_district || "").trim();
                        const dCity = (addr.city || addr.town || addr.village || addr.suburb || addr.hamlet || addr.neighbourhood || addr.quarter || "").trim();

                        const normalize = (s) => s.toLowerCase().replace(/ district| state| division| territory| region/g, '').trim();

                        // Match State
                        let matchedState = "";
                        if (dState) {
                            const normalizedDetectedState = normalize(dState);
                            matchedState = Object.keys(stateDistrictMapping).find(s =>
                                normalize(s) === normalizedDetectedState ||
                                normalizedDetectedState.includes(normalize(s)) ||
                                normalize(s).includes(normalizedDetectedState)
                            ) || "";
                        }

                        if (matchedState) {
                            setState(matchedState);

                            // Match District within State
                            let finalDistrict = "";
                            if (dDistrict) {
                                const normalizedDetectedDistrict = normalize(dDistrict);
                                finalDistrict = stateDistrictMapping[matchedState].find(d =>
                                    normalize(d) === normalizedDetectedDistrict ||
                                    normalizedDetectedDistrict.includes(normalize(d)) ||
                                    normalize(d).includes(normalizedDetectedDistrict)
                                ) || "";
                            }

                            // City Fallback for District
                            if (!finalDistrict && dCity) {
                                const cityMatch = Object.keys(cityToDistrictMapping).find(c => c.toLowerCase() === dCity.toLowerCase());
                                if (cityMatch) finalDistrict = cityToDistrictMapping[cityMatch];
                            }

                            // Handle district assignment: 
                            // If the state remains the same, we can set the district directly.
                            if (finalDistrict) {
                                if (matchedState === state) {
                                    setDistrict(finalDistrict);
                                    console.log(`Applied district "${finalDistrict}" directly (state unchanged)`);
                                } else {
                                    console.log(`Queuing district "${finalDistrict}" for state "${matchedState}"`);
                                    pendingDistrictRef.current = finalDistrict;
                                }
                            }
                        }

                        if (dCity) setCity(dCity);

                        // Detailed Feedback
                        const displayLoc = dCity || dDistrict || matchedState;
                        if (displayLoc) {
                            toast.success(`Location identified: ${displayLoc}`, {
                                icon: '📍',
                                duration: 4000
                            });
                        }
                    }
                } catch (geoErr) {
                    console.warn("Auto-fill geocoding skipped:", geoErr.message);
                }

            } catch (err) {
                console.error("Nearby search error:", err);
                toast.error("Nearby organization search failed. Please try a manual search.");
            } finally {
                setIsFetchingLoc(false);
            }
        }, (error) => {
            setIsFetchingLoc(false);
            const msg = error.code === 1 ? "Location access denied" : "Position unavailable";
            toast.error(msg);
        }, { timeout: 10000 });
    };

    const fetchEmergencies = async (org) => {
        setSelectedOrg(org);
        try {
            const res = await axios.get(`/api/home/organizations/${org.id}/emergencies`);
            setEmergencyRequests(res.data);
            setShowEmergencies(true);
        } catch (err) {
            toast.error("Failed to load urgent needs");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Back Button */}
            <a
                href="/#org-search-section"
                className="back-chip"
                aria-label="Back to landing page section"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                        d="M15 5 8 12l7 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </a>

            <header className="fixed top-0 w-full z-50 bg-gradient-to-r from-red-700 to-red-600 px-8 py-6 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate("/")}>
                    <i className="fas fa-heart text-white text-3xl"></i>
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-black text-white leading-tight">eBloodBank</h1>
                        <p className="text-xs font-bold text-red-100 leading-tight">Connecting Donors, Saving Lives</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-6 pt-40 pb-20">
                <div className="max-w-4xl mx-auto text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-black text-gray-800 mb-4 tracking-tight">
                        Find Partner <span className="text-red-500">Organizations</span>
                    </h2>
                    <p className="text-gray-500 font-medium">Search for hospitals, clinics, and blood banks near you.</p>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-white mb-16 relative overflow-hidden">
                    {/* Premium GPS Highlight Background */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>

                    <form onSubmit={handleSearch} className="space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Type Dropdown with specialized styling */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Organization Type</label>
                                <div className="relative group">
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                        className="w-full bg-white border-2 border-red-400/50 rounded-2xl py-4 px-5 text-sm font-black text-slate-800 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all shadow-sm h-[60px] appearance-none"
                                    >
                                        <option value="All">All Types</option>
                                        <option value="Hospital">Hospital</option>
                                        <option value="Blood Bank">Blood Bank</option>
                                        <option value="Clinic">Clinic</option>
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <i className="fas fa-chevron-down text-xs"></i>
                                    </div>
                                </div>
                            </div>

                            {/* State */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">State</label>
                                <div className="relative">
                                    <select
                                        value={state}
                                        onChange={(e) => { setState(e.target.value); setDistrict(""); }}
                                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-red-500 transition-all shadow-sm h-[60px] appearance-none"
                                    >
                                        <option value="">Select State</option>
                                        {Object.keys(stateDistrictMapping).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <i className="fas fa-chevron-down text-xs"></i>
                                    </div>
                                </div>
                            </div>

                            {/* District */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">District</label>
                                <div className="relative">
                                    <select
                                        value={district}
                                        onChange={(e) => setDistrict(e.target.value)}
                                        disabled={!state}
                                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-red-500 transition-all shadow-sm h-[60px] appearance-none disabled:opacity-50"
                                    >
                                        <option value="">Select District</option>
                                        {state && stateDistrictMapping[state].map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <i className="fas fa-chevron-down text-xs"></i>
                                    </div>
                                </div>
                            </div>

                            {/* City/Town */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">City/Town</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Enter city"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-red-500 transition-all shadow-sm h-[60px]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-gray-50 gap-6">
                            {/* Re-designed Premium GPS Button */}
                            <button
                                type="button"
                                onClick={fetchByLocation}
                                disabled={isFetchingLoc}
                                className="group relative flex items-center gap-4 bg-red-50 hover:bg-red-100/80 px-8 py-4 rounded-3xl transition-all duration-300"
                            >
                                <div className="relative">
                                    <div className={`w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-200 transition-transform group-hover:scale-110 ${isFetchingLoc ? '' : 'animate-pulse'}`}>
                                        <i className={`fas ${isFetchingLoc ? 'fa-spinner fa-spin' : 'fa-location-crosshairs'} text-lg`}></i>
                                    </div>
                                    {/* Rotating outer ring animation */}
                                    <div className="absolute -inset-1 border-2 border-red-500/20 rounded-full animate-[spin_4s_linear_infinite]"></div>
                                </div>
                                <div className="text-left">
                                    <span className="block text-[10px] font-black text-red-400 uppercase tracking-widest mb-0.5">Instant Discovery</span>
                                    <span className="block text-sm font-black text-red-600 uppercase tracking-tight">Use Precise GPS Location</span>
                                </div>
                            </button>

                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-gray-900 text-white font-black py-5 px-14 rounded-2xl hover:bg-black transition-all shadow-2xl shadow-gray-200 flex items-center gap-4 uppercase tracking-[0.2em] text-[10px] h-[64px] min-w-[240px] justify-center"
                            >
                                {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-search-plus text-xs"></i> Explore Hospitals</>}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {organizations.map(org => (
                        <div key={org.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-gray-200 transition-all duration-500 border border-gray-100 group">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${org.type === 'Blood Bank' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                    {org.type}
                                </div>
                                {org.active_emergencies > 0 && (
                                    <div className="bg-red-500 text-white px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse flex items-center gap-1.5 shadow-lg shadow-red-200">
                                        <i className="fas fa-exclamation-circle"></i> {org.active_emergencies} Urgent
                                    </div>
                                )}
                                {org.distance && (
                                    <div className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-gray-200 flex items-center gap-1.5">
                                        <i className="fas fa-map-marker-alt"></i> {parseFloat(org.distance).toFixed(1)} km
                                    </div>
                                )}
                            </div>

                            <h3 className="text-2xl font-black text-gray-800 mb-2 group-hover:text-red-600 transition-colors uppercase tracking-tight">{org.name}</h3>
                            <p className="text-sm text-gray-500 font-medium mb-6 line-clamp-2 italic">
                                <i className="fas fa-map-marker-alt mr-2 text-red-400"></i>
                                {org.address}, {org.city}, {org.district}
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                <a
                                    href={`tel:${org.phone}`}
                                    className="bg-gray-900 text-white py-4 rounded-2xl text-[10px] font-black flex items-center justify-center gap-2 hover:bg-black transition-all uppercase tracking-widest"
                                >
                                    <i className="fas fa-phone"></i> {org.phone}
                                </a>
                                <button
                                    onClick={() => fetchEmergencies(org)}
                                    className="bg-red-500 text-white py-4 rounded-2xl text-[10px] font-black flex items-center justify-center gap-2 hover:bg-red-600 transition-all uppercase tracking-widest shadow-lg shadow-red-100"
                                >
                                    <i className="fas fa-bullhorn"></i> Urgent Needs
                                </button>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(org.name + ' ' + org.city)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="col-span-2 bg-gray-50 text-gray-600 py-4 rounded-2xl text-[10px] font-black flex items-center justify-center gap-2 hover:bg-gray-100 transition-all border border-gray-100 uppercase tracking-widest"
                                >
                                    <i className="fas fa-directions"></i> Get Directions
                                </a>
                            </div>
                        </div>
                    ))}
                </div>

                {organizations.length === 0 && !loading && (
                    <div className="text-center py-32 bg-white rounded-[3rem] shadow-sm border-2 border-dashed border-gray-100">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                            <i className="fas fa-search-location text-4xl"></i>
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 mb-2 uppercase tracking-tight">No Organizations Found</h3>
                        <p className="text-gray-500 font-medium">Try broadening your search criteria or location.</p>
                    </div>
                )}
            </main>

            {/* Urgent Needs Modal */}
            {showEmergencies && (
                <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden relative animate-in zoom-in-95 duration-300 border border-white">
                        <div className="bg-gradient-to-r from-red-600 to-red-500 p-10 text-white relative overflow-hidden">
                            {/* Animated Pulse Orbs in Header */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 animate-pulse"></div>

                            <button
                                onClick={() => setShowEmergencies(false)}
                                className="absolute top-8 right-8 w-12 h-12 bg-white shadow-2xl hover:bg-gray-100 rounded-full flex items-center justify-center transition-all z-[110] text-red-600 active:scale-90"
                                aria-label="Close modal"
                            >
                                <i className="fas fa-times text-xl"></i>
                            </button>

                            <div className="relative z-10 mb-2 flex items-center gap-3">
                                <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Live Feed</span>
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                            </div>

                            <h3 className="text-3xl font-black uppercase tracking-tight mb-2 leading-none">{selectedOrg?.name}</h3>
                            <p className="text-red-100 text-xs font-bold uppercase tracking-[0.3em] flex items-center gap-2">
                                <i className="fas fa-triangle-exclamation"></i> Critical Requirement List
                            </p>
                        </div>

                        <div className="p-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {emergencyRequests && emergencyRequests.length > 0 ? (
                                <div className="space-y-6">
                                    {emergencyRequests.map((req, idx) => {
                                        const isCritical = req.priority === 'Critical' || req.priority === 'High';
                                        return (
                                            <div key={idx} className={`p-6 rounded-[2.5rem] border ${isCritical ? 'bg-red-50/50 border-red-100' : 'bg-gray-50/50 border-gray-100'} transition-all hover:scale-[1.02] duration-300`}>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm ${isCritical ? 'bg-red-500 text-white' : 'bg-white text-gray-800'}`}>
                                                            {req.blood_group}
                                                        </div>
                                                        <div>
                                                            <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isCritical ? 'text-red-600' : 'text-gray-400'}`}>
                                                                {req.priority} Priority
                                                            </div>
                                                            <div className="text-lg font-black text-gray-900 leading-tight">
                                                                {req.units} <span className="text-sm text-gray-500 font-bold uppercase ml-1">Units Required</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {req.description && (
                                                    <p className="text-sm text-gray-600 font-medium bg-white/60 p-4 rounded-2xl italic border border-gray-50">
                                                        "{req.description}"
                                                    </p>
                                                )}
                                                <div className="mt-4 text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                                    <i className="far fa-clock"></i> Posted {new Date(req.created_at).toLocaleDateString()} at {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-200">
                                        <i className="fas fa-check-circle text-5xl"></i>
                                    </div>
                                    <h4 className="text-xl font-black text-gray-800 mb-2 uppercase tracking-tight">Status: Stable</h4>
                                    <p className="text-gray-500 font-bold">No active emergency requests found for this facility.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <footer className="bg-white border-t border-gray-100 py-12 mt-auto">
                <div className="container mx-auto px-6 text-center">
                    <div className="flex items-center justify-center space-x-3 mb-6 grayscale opacity-50">
                        <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                            <i className="fas fa-heart text-white text-sm"></i>
                        </div>
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">eBloodBank</h3>
                    </div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">Connecting Communities &bull; Saving Lives</p>
                </div>
            </footer>

            <BackToTop />
        </div >
    );
};

export default OrganizationSearch;
