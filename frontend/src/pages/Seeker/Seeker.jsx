import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from 'react-hot-toast';
import { stateDistrictMapping, cityToDistrictMapping } from '../../utils/locationData';
import "../../assets/css/home.css";
import BackToTop from "../../components/common/BackToTop";

// Location mappings moved to src/utils/locationData.js

// City fallbacks moved to src/utils/locationData.js

const normalizeString = (str) => {
    return str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
};

const Seeker = () => {
    const [bloodType, setBloodType] = useState("");
    const [state, setState] = useState("");
    const [district, setDistrict] = useState("");
    const [city, setCity] = useState("");
    const [donors, setDonors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const [isCompatibilityModalOpen, setIsCompatibilityModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [selectedDonor, setSelectedDonor] = useState(null);
    const [lat, setLat] = useState(null);
    const [lng, setLng] = useState(null);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [locationError, setLocationError] = useState("");
    const ignoreGeocodeRef = React.useRef(false);
    const pendingDistrictRef = React.useRef(null);

    // DEBUG LOGS for Phase 5
    useEffect(() => {
        console.log("Seeker State Update:", { state, district, city, lat, lng });
    }, [state, district, city, lat, lng]);

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


    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const bloodGroups = [
        "A+", "A-", "A1+", "A1-", "A1B+", "A1B-",
        "A2+", "A2-", "A2B+", "A2B-", "AB+", "AB-",
        "B+", "B-", "Bombay Blood Group", "INRA", "O+", "O-"
    ];

    const compatibilityData = {
        "A+": { give: ["A+", "AB+"], receive: ["A+", "A-", "O+", "O-"] },
        "O+": { give: ["O+", "A+", "B+", "AB+"], receive: ["O+", "O-"] },
        "B+": { give: ["B+", "AB+"], receive: ["B+", "B-", "O+", "O-"] },
        "AB+": { give: ["AB+"], receive: ["Everyone"] },
        "A-": { give: ["A+", "A-", "AB+", "AB-"], receive: ["A-", "O-"] },
        "O-": { give: ["Everyone"], receive: ["O-"] },
        "B-": { give: ["B+", "B-", "AB+", "AB-"], receive: ["B-", "O-"] },
        "AB-": { give: ["AB+", "AB-"], receive: ["AB-", "A-", "B-", "O-"] },
        "A1+": { give: ["A1+", "A1B+", "A1B-"], receive: ["A1+", "A1-", "O+", "O-"] },
        "A1B+": { give: ["A1B+"], receive: ["Everyone"] },
        "A2+": { give: ["A2+", "A1+", "A1B+"], receive: ["A2+", "A2-", "O+", "O-"] },
        "A2B+": { give: ["A2B+"], receive: ["Everyone"] },
        "A1-": { give: ["A1+", "A1-", "A1B+", "A1B-"], receive: ["A1-", "O-"] },
        "A1B-": { give: ["A1B+", "A1B-"], receive: ["A1B-", "A1-", "B-", "O-"] },
        "A2-": { give: ["A2+", "A2-", "A1+", "A1B+"], receive: ["A2-", "O-"] },
        "A2B-": { give: ["A2B+", "A2B-"], receive: ["A2B-", "A2-", "B-", "O-"] },
        "Bombay Blood Group": { give: ["Everyone"], receive: ["Bombay Blood Group"] },
        "INRA": { give: ["INRA"], receive: ["INRA"] }
    };

    const fetchLocation = async () => {
        setIsFetchingLocation(true);
        setLocationError("");

        try {
            if (!navigator.geolocation) {
                throw new Error("Geolocation is not supported by your browser");
            }

            const getPosition = (options) => {
                return new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, options);
                });
            };

            let position;
            try {
                position = await getPosition({
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 0
                });
            } catch (err) {
                position = await getPosition({
                    enableHighAccuracy: false,
                    timeout: 20000,
                    maximumAge: 0
                });
            }

            const { latitude, longitude } = position.coords;

            let locationData = null;

            try {
                const nominatimResponse = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
                    {
                        headers: {
                            "User-Agent": "BloodDonationApp/1.0"
                        }
                    }
                );

                if (nominatimResponse.ok) {
                    const nominatimData = await nominatimResponse.json();
                    if (nominatimData.address) {
                        const addr = nominatimData.address;
                        locationData = {
                            state: addr.state,
                            district: addr.state_district || addr.county || addr.district,
                            city: addr.city || addr.town || addr.village || addr.suburb || addr.municipality,
                            fullAddress: addr // Phase 2: deep scan
                        };
                    }
                }
            } catch (err) {
                console.warn("Nominatim failed:", err);
            }

            if (!locationData) {
                try {
                    const bigDataResponse = await fetch(
                        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                    );

                    if (bigDataResponse.ok) {
                        const bigData = await bigDataResponse.json();
                        locationData = {
                            state: bigData.principalSubdivision,
                            district: bigData.localityInfo?.administrative?.[2]?.name || bigData.locality,
                            city: bigData.city || bigData.locality,
                            fullAddress: bigData.localityInfo?.administrative?.reduce((acc, curr) => ({ ...acc, [curr.order]: curr.name }), {}) || {}
                        };
                    }
                } catch (err) {
                    console.warn("BigDataCloud failed:", err);
                }
            }

            if (!locationData || !locationData.state) {
                console.error("No location data found in response:", locationData);
                throw new Error("Unable to determine location from coordinates");
            }

            const stateKeys = Object.keys(stateDistrictMapping);

            // Helper: Find state match
            const findStateMatch = (input) => {
                if (!input) return null;
                const normalizedInput = normalizeString(input);
                return stateKeys.find(s => {
                    const normalizedS = normalizeString(s);
                    return normalizedS === normalizedInput ||
                        normalizedS.includes(normalizedInput) ||
                        normalizedInput.includes(normalizedS);
                });
            };

            // 1. Primary state match
            let matchedState = findStateMatch(locationData.state);

            // 2. Deep state scan
            if (!matchedState && locationData.fullAddress) {
                for (const key in locationData.fullAddress) {
                    const val = locationData.fullAddress[key];
                    if (typeof val === 'string') {
                        matchedState = findStateMatch(val);
                        if (matchedState) break;
                    }
                }
            }

            if (!matchedState) {
                throw new Error(`State "${locationData.state}" not found in our database`);
            }

            let matchedDistrict = null;
            const districts = stateDistrictMapping[matchedState] || [];

            // Phase 3: Aggressive matching
            const findDistrictMatch = (searchStr) => {
                if (!searchStr) return null;
                const normalizedSearch = normalizeString(searchStr);
                return districts.find(d => {
                    const normalizedDist = normalizeString(d);
                    return normalizedDist === normalizedSearch ||
                        normalizedDist.includes(normalizedSearch) ||
                        normalizedSearch.includes(normalizedDist);
                });
            };

            // 1. Try primary district field
            matchedDistrict = findDistrictMatch(locationData.district);

            // 2. Try city fallback
            if (!matchedDistrict && locationData.city) {
                const searchCity = locationData.city;
                const normalizedSearchCity = normalizeString(searchCity);
                const cityKey = Object.keys(cityToDistrictMapping).find(
                    c => normalizeString(c) === normalizedSearchCity
                );
                if (cityKey) {
                    matchedDistrict = cityToDistrictMapping[cityKey];
                } else {
                    matchedDistrict = findDistrictMatch(searchCity);
                }
            }

            // 3. Deep scan
            if (!matchedDistrict && locationData.fullAddress) {
                for (const key in locationData.fullAddress) {
                    const val = locationData.fullAddress[key];
                    if (typeof val === 'string') {
                        // Skip state since we already matched it
                        if (normalizeString(val) === normalizeString(locationData.state)) continue;
                        matchedDistrict = findDistrictMatch(val);
                        if (matchedDistrict) break;
                    }
                }
            }

            // Flag to ignore the subsequent useEffect trigger
            ignoreGeocodeRef.current = true;

            // Perform unified updates to prevent separate render cycles from clearing the district
            setState(matchedState);
            if (locationData.city) setCity(locationData.city);
            setLat(latitude);
            setLng(longitude);

            if (matchedDistrict) {
                if (matchedState === state) {
                    // If state hasn't changed, we can set district immediately
                    setDistrict(matchedDistrict);
                    console.log(`Phase 6: State Unchanged (${matchedState}), applied district: ${matchedDistrict}`);
                } else {
                    // Queue for the useEffect after state transition
                    pendingDistrictRef.current = matchedDistrict;
                    console.log(`Phase 6: Queuing district: ${matchedDistrict} for state: ${matchedState}`);
                }
            }

            console.log("Location detection results (Phase 5):", {
                detected: { state: locationData.state, district: locationData.district, city: locationData.city },
                matched: { state: matchedState, district: matchedDistrict }
            });

            toast.success(`Location detected: ${locationData.city || matchedDistrict || matchedState}`);

        } catch (err) {
            console.error("Location fetch error:", err);
            setLocationError(err.message || "Failed to fetch location. Please enter manually.");
            toast.error(err.message || "Location detection failed");
        } finally {
            setIsFetchingLocation(false);
        }
    };

    // Dynamic Geocoding for Manual Search
    useEffect(() => {
        const geocodeManualLocation = async () => {
            if (!city || !district || !state) return;

            if (ignoreGeocodeRef.current) {
                ignoreGeocodeRef.current = false;
                return;
            }

            // Avoid re-geocoding if coordinates were already set by GPS for this exact location
            // But if city changes, we should geocode
            setIsFetchingLocation(true);
            try {
                const query = `${city}, ${district}, ${state}, India`;
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
                    {
                        headers: { "User-Agent": "BloodDonationApp/1.0" }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0) {
                        setLat(parseFloat(data[0].lat));
                        setLng(parseFloat(data[0].lon));
                        console.log(`Geocoded manual entry: ${query} -> ${data[0].lat}, ${data[0].lon}`);
                    }
                }
            } catch (err) {
                console.error("Manual geocoding failed:", err);
            } finally {
                setIsFetchingLocation(false);
            }
        };

        const timeoutId = setTimeout(() => {
            geocodeManualLocation();
        }, 1500); // 1.5s debounce

        return () => clearTimeout(timeoutId);
    }, [city, district, state]);

    // Reset coordinates if state/district changes and GPS wasn't used
    useEffect(() => {
        // If the user manually changes these without getting geocoded results yet
        // or to ensure fresh geocoding triggers
        if (!isFetchingLocation) {
            // No reset needed here as the geocodeManualLocation effect handles it
        }
    }, [state, district]);

    const resultsRef = React.useRef(null);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setSearched(true);
        try {
            // Use the Smart-Match API for AI-powered ranking
            const response = await axios.get(`/api/seeker/smart-match`, {
                params: {
                    blood_type: bloodType,
                    lat: lat,
                    lng: lng,
                    city: city,
                    district: district
                }
            });
            setDonors(response.data);
            // Scroll to results with an offset so it doesn't go too far down
            setTimeout(() => {
                if (resultsRef.current) {
                    const yOffset = -100; // Keep more context visible
                    const y = resultsRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                }
            }, 100);
        } catch (error) {
            console.error("Error fetching donors:", error);
            toast.error("Failed to fetch donors. Please try again.");
        } finally {
            setLoading(false);
        }
    };



    const SkeletonCard = () => (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse">
            <div className="flex justify-between mb-4">
                <div className="h-6 w-32 bg-gray-200 rounded"></div>
                <div className="h-6 w-12 bg-gray-200 rounded-full"></div>
            </div>
            <div className="h-4 w-48 bg-gray-100 rounded mb-6"></div>
            <div className="flex gap-3">
                <div className="h-10 flex-1 bg-gray-200 rounded-xl"></div>
                <div className="h-10 flex-1 bg-gray-200 rounded-xl"></div>
            </div>
        </div>
    );

    const ScoreLegend = () => (
        <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6 mb-8 relative overflow-hidden">

            <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                <i className="fas fa-book-open text-blue-500"></i> How to read these scores?
            </h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Match %</span>
                    <p className="text-xs font-medium text-gray-600">
                        <span className="text-green-600 font-bold">100%</span> = Exact blood type.<br />
                        <span className="text-yellow-600 font-bold">80%</span> = Safe/Compatible.
                    </p>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Score</span>
                    <p className="text-xs font-medium text-gray-600">
                        Overall donor quality (0-100) based on distance & history.
                    </p>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Dist.</span>
                    <p className="text-xs font-medium text-gray-600">
                        Distance from your searched location (KM).
                    </p>
                </div>
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">AI Chance</span>
                    <p className="text-xs font-medium text-gray-600">
                        Likelihood of this donor saying "Yes" to your request.
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-gray-50 min-h-screen relative">
            {/* Floating Back Button */}
            <a
                href="/#seeker-section"
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

            {/* Header */}
            <header className="gradient-bg text-white shadow-lg sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate("/")}>
                        <div className="pulse-heart">
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold leading-tight">eBloodBank</h1>
                            <p className="text-red-100 text-xs font-medium">Connecting Donors, Saving Lives</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-6">
                        <button onClick={() => setIsCompatibilityModalOpen(true)} className="text-sm font-bold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition-all flex items-center gap-2">
                            <i className="fas fa-info-circle"></i>
                            <span className="hidden sm:inline">Compatibility Guide</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative py-20 overflow-hidden">
                <div className="absolute inset-0 hero-gradient opacity-10"></div>
                <div className="container mx-auto px-6 relative z-10 text-center">
                    <h2 className="text-5xl md:text-6xl font-black text-gray-800 mb-6 drop-shadow-sm">
                        Find a <span className="text-gradient">Life Saver</span>
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Search through our verified network of donors to find immediate help.
                    </p>
                </div>
            </section>

            <main className="container mx-auto px-6 pb-20">
                {/* Mobile App Banner - Stylish Redesign */}
                <div className="max-w-4xl mx-auto mb-16 px-4">
                    <div className="bg-[#dc2626] rounded-[3rem] p-8 md:p-10 shadow-2xl shadow-red-500/10 relative overflow-hidden group border border-white/10">
                        {/* Subtle Background Accents */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-[80px]"></div>
                        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black/10 rounded-full blur-[80px]"></div>
                        
                        <div className="relative z-10 text-center">
                            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-white/20 text-white">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></span>
                                Mobile App is Live
                            </div>
                            <h3 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-4 leading-tight">
                                Download eBloodBank App
                            </h3>
                            <p className="text-red-50/80 font-bold text-base mb-8 leading-relaxed max-w-xl mx-auto opacity-90">
                                Get instant donor matching & GPS tracking in your pocket.
                            </p>
                            <button 
                                onClick={() => setIsDownloadModalOpen(true)}
                                className="bg-white text-[#dc2626] px-12 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-gray-50 transition-all hover:scale-105 active:scale-95 group/btn flex items-center justify-center gap-3 mx-auto"
                            >
                                <span>Get the App</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div id="search-panel" className="max-w-6xl mx-auto">
                    {/* Search Panel */}
                    <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl shadow-gray-200/50 mb-16 border border-white/60">
                        {/* Search Header */}
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 gradient-bg rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3">
                                <i className="fas fa-search text-xl"></i>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-800 tracking-tight">Search for Donors</h2>
                                <p className="text-sm text-gray-500 font-medium tracking-wide">Enter blood group and location to find matches</p>
                            </div>
                        </div>

                        {/* Quick Location Banner */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8 p-4 bg-blue-50/50 rounded-3xl border border-blue-100/50 group hover:bg-blue-50 transition-all duration-300">
                            <div className="w-14 h-14 bg-white text-blue-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                <i className="fas fa-location-arrow text-xl"></i>
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <h4 className="text-base font-black text-gray-800">Fast Location Detection</h4>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">Skip the typing – use GPS to find donors near you instantly</p>
                            </div>
                            <button
                                type="button"
                                onClick={fetchLocation}
                                disabled={isFetchingLocation}
                                className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isFetchingLocation ? (
                                    <><i className="fas fa-spinner fa-spin"></i> Detecting...</>
                                ) : (
                                    <><i className="fas fa-crosshairs"></i> Detect My Location</>
                                )}
                            </button>
                        </div>

                        <form onSubmit={handleSearch} className="space-y-6">
                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Blood Group</label>
                                    <div className="relative">
                                        <select
                                            id="blood-group-select"
                                            value={bloodType}
                                            onChange={(e) => setBloodType(e.target.value)}
                                            required
                                            className="w-full pl-5 pr-10 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-red-500 transition-all font-bold text-gray-700 appearance-none shadow-sm h-[60px]"
                                        >
                                            <option value="">Select Group</option>
                                            {bloodGroups.map((group) => (
                                                <option key={group} value={group}>{group}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <i className="fas fa-chevron-down text-xs"></i>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">State</label>
                                    <div className="relative">
                                        <select
                                            id="state-select"
                                            value={state}
                                            onChange={(e) => { setState(e.target.value); setDistrict(""); }}
                                            required
                                            className="w-full pl-5 pr-10 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-red-500 transition-all font-bold text-gray-700 appearance-none shadow-sm h-[60px]"
                                        >
                                            <option value="">Select State</option>
                                            {Object.keys(stateDistrictMapping).map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <i className="fas fa-chevron-down text-xs"></i>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">District</label>
                                    <div className="relative">
                                        <select
                                            id="district-select"
                                            value={district}
                                            onChange={(e) => setDistrict(e.target.value)}
                                            disabled={!state}
                                            required
                                            className="w-full pl-5 pr-10 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-red-500 transition-all font-bold text-gray-700 appearance-none shadow-sm h-[60px] disabled:opacity-50"
                                        >
                                            <option value="">Select District</option>
                                            {(stateDistrictMapping[state] || []).map((d) => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <i className="fas fa-chevron-down text-xs"></i>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">City/Town</label>
                                    <div className="relative">
                                        <input
                                            id="city-input"
                                            type="text"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            placeholder="Enter city"
                                            required
                                            className="w-full pl-5 pr-10 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-red-500 transition-all font-bold text-gray-700 shadow-sm h-[60px]"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center pt-12 pb-8">
                                <button
                                    id="search-button"
                                    type="submit"
                                    disabled={loading || !bloodType || !state || !district || !city}
                                    className="w-full md:w-auto min-w-[280px] gradient-bg text-white font-black py-5 px-12 rounded-2xl hover:opacity-90 transition-all shadow-2xl shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-3 h-[70px] text-lg"
                                >
                                    {loading ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <i className="fas fa-search"></i>
                                            Search Donors
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Results Section */}
                <div ref={resultsRef} className="space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-2xl font-bold text-gray-800">
                            {searched ? `Found ${donors.length} Potential Heroes` : "Featured Donors"}
                        </h3>

                    </div>

                    {loading ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                        </div>
                    ) : donors.length > 0 ? (
                        <>
                            <ScoreLegend />
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {donors.map((donor) => (
                                    <div key={donor.id} className="group bg-white p-7 rounded-[2rem] shadow-sm hover:shadow-2xl hover:shadow-gray-200 transition-all duration-500 border border-gray-50 hover:-translate-y-2 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <i className="fas fa-heart text-6xl text-red-500"></i>
                                        </div>
                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div className="bg-red-50 p-3 rounded-2xl">
                                                <span className="text-2xl font-black text-red-600">{donor.blood_group}</span>
                                            </div>
                                            {donor.compatibility_score === 100 ? (
                                                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-200">
                                                    Exact Match
                                                </div>
                                            ) : (
                                                <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-yellow-200">
                                                    Compatible
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-xl font-black text-gray-800 mb-2 truncate group-hover:text-red-600 transition-colors uppercase tracking-tight">{donor.name}</h3>
                                        <div className="flex items-center gap-2 text-gray-500 mb-4 font-medium">
                                            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-xs">
                                                <i className="fas fa-location-dot"></i>
                                            </div>
                                            <span className="text-sm">{donor.city}, {donor.district}</span>
                                        </div>

                                        {/* AI Smart Stats */}
                                        <div className="grid grid-cols-4 gap-2 mb-8 bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50">
                                            <div className="text-center">
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Match</span>
                                                <span className={`text-sm font-black ${donor.compatibility_score === 100 ? 'text-green-600' : 'text-yellow-600'}`}>
                                                    {donor.compatibility_score}%
                                                </span>
                                            </div>
                                            <div className="text-center border-l border-gray-200">
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Score</span>
                                                <span className="text-sm font-black text-blue-600">{donor.suitability_score}</span>
                                            </div>
                                            <div className="text-center border-l border-gray-200">
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Dist.</span>
                                                <span className="text-sm font-black text-gray-700">{(donor.distance === null || donor.distance === Infinity) ? 'N/A' : `${donor.distance}km`}</span>
                                            </div>
                                            <div className="text-center border-l border-gray-200">
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">AI</span>
                                                <span className="text-sm font-black text-red-600">{Math.round(donor.ai_confidence * 100)}%</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 relative z-10">
                                            <a
                                                href={`tel:${donor.phone}`}
                                                className="bg-gray-900 text-white py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-red-600 transition-all uppercase tracking-widest"
                                            >
                                                <i className="fas fa-phone"></i> Call
                                            </a>
                                            <button
                                                onClick={() => { setSelectedDonor(donor); setIsDetailsModalOpen(true); }}
                                                className="bg-red-500 text-white py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-red-600 transition-all uppercase tracking-widest"
                                            >
                                                <i className="fas fa-info-circle"></i> Details
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : searched ? (
                        <div className="text-center py-20 bg-white rounded-[3rem] shadow-inner border border-dashed border-gray-200">
                            <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl text-gray-300">
                                <i className="fas fa-search"></i>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Matches Found</h3>
                            <p className="text-gray-500 max-w-sm mx-auto">We couldn't find any donors matching your criteria. Try expanding your search area.</p>

                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8 items-center bg-white p-12 rounded-[2.5rem] shadow-sm border border-gray-100">
                            <div>
                                <h4 className="text-3xl font-black text-gray-800 mb-4 tracking-tight">Search Smart. <br /><span className="text-red-500 italic">Save Lives Faster.</span></h4>
                                <p className="text-gray-500 mb-8 font-medium leading-relaxed">Enter a blood group and city to see available donors in your vicinity. Our network includes thousands of verified volunteers ready to help.</p>
                                <div className="flex gap-4">
                                    <div className="bg-red-50 p-4 rounded-2xl flex-1 text-center">
                                        <span className="block text-2xl font-black text-red-600">18</span>
                                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Blood Types</span>
                                    </div>
                                    <div className="bg-blue-50 p-4 rounded-2xl flex-1 text-center">
                                        <span className="block text-2xl font-black text-blue-600">24/7</span>
                                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Availability</span>
                                    </div>
                                </div>
                            </div>
                            <div className="relative">
                                <img
                                    src="https://img.freepik.com/free-vector/world-blood-donor-day-illustration_23-2148544917.jpg"
                                    alt="Helping each other"
                                    className="rounded-3xl w-full grayscale-[0.2] contrast-125"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent rounded-3xl"></div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Emergency Modal */}


            {/* Compatibility Modal */}
            {
                isCompatibilityModalOpen && (
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl overflow-hidden relative">
                            <button onClick={() => setIsCompatibilityModalOpen(false)} className="absolute top-6 right-6 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all z-10 text-xl">
                                <i className="fas fa-times"></i>
                            </button>
                            <div className="p-10 max-h-[90vh] overflow-y-auto">
                                <h3 className="text-3xl font-black mb-8 tracking-tight">Blood <span className="text-red-500 italic">Compatibility Guide</span></h3>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {Object.entries(compatibilityData).map(([type, data]) => (
                                        <div key={type} className="bg-gray-50 p-6 rounded-3xl border border-gray-100 hover:border-red-200 transition-colors">
                                            <div className="text-2xl font-black text-red-600 mb-4">{type}</div>
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="text-[10px] uppercase font-black text-gray-400 block tracking-widest mb-1">Can Give To</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {data.give.map(t => <span key={t} className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{t}</span>)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] uppercase font-black text-gray-400 block tracking-widest mb-1">Can Receive From</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {data.receive.map(t => <span key={t} className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{t}</span>)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Mobile App Download Modal */}
            {isDownloadModalOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden relative animate-in zoom-in-95 duration-300">
                        <button 
                            onClick={() => setIsDownloadModalOpen(false)}
                            className="absolute top-8 right-8 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all z-10 text-xl"
                        >
                            <i className="fas fa-times"></i>
                        </button>

                        <div className="p-8 lg:p-12">
                            <div className="flex flex-col md:flex-row items-center gap-10">
                                {/* Left Side: Mockup */}
                                <div className="md:w-1/2 flex justify-center">
                                    <div className="relative group/mockup">
                                        <div className="absolute inset-0 bg-red-500/10 blur-[80px] rounded-full group-hover/mockup:bg-red-500/20 transition-all duration-700"></div>
                                        <img 
                                            src="/images/app-mockup.png" 
                                            alt="App Mockup" 
                                            className="w-72 md:w-96 relative z-10 drop-shadow-[0_40px_80px_rgba(0,0,0,0.4)] animate-float" 
                                        />
                                    </div>
                                </div>

                                {/* Right Side: Links & QR */}
                                <div className="md:w-1/2 text-center">
                                    <h3 className="text-4xl font-black text-gray-900 tracking-tight mb-4 leading-none">
                                        <span className="uppercase tracking-tighter">Download</span> <br />
                                        <span className="text-red-600 italic">eBloodBank</span> <span className="uppercase tracking-tighter">App</span>
                                    </h3>
                                    <p className="text-gray-500 font-bold text-sm mb-8">Scan to download or use the store buttons.</p>
                                    
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border border-gray-100 hover:scale-105 transition-transform group/qr shrink-0">
                                            <img src="/images/qr-code.png" alt="QR Code" className="w-40 h-40 md:w-48 md:h-48" />
                                            <div className="text-center mt-3">
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Scan for Instant Access</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3 w-full">
                                            <button className="w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-black text-white px-6 py-4 rounded-2xl transition-all shadow-xl shadow-gray-200 font-black text-xs uppercase tracking-widest group/btn">
                                                <i className="fab fa-apple text-xl"></i>
                                                <span>App Store</span>
                                            </button>
                                            <button className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 hover:border-red-500 hover:bg-red-50 text-gray-900 px-6 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest group/btn">
                                                <i className="fab fa-google-play text-lg text-red-500"></i>
                                                <span>Play Store</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Donor Details Modal */}
            {selectedDonor && isDetailsModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden relative animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setIsDetailsModalOpen(false)}
                            className="absolute top-6 right-6 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all z-10"
                        >
                            <i className="fas fa-times"></i>
                        </button>

                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
                                    <span className="text-3xl font-black text-red-600">{selectedDonor.blood_group}</span>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">{selectedDonor.name}</h3>
                                    <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Verified Donor</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
                                        <i className="fas fa-location-dot"></i>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Location Details</span>
                                        <p className="font-bold text-gray-700">{selectedDonor.city}, {selectedDonor.district}</p>
                                        <p className="text-sm text-gray-500 font-medium">{selectedDonor.state}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600 flex-shrink-0">
                                        <i className="fas fa-phone"></i>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Contact Number</span>
                                        <p className="font-bold text-gray-700">{selectedDonor.phone}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 flex-shrink-0">
                                        <i className="fas fa-envelope"></i>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Email Address</span>
                                        <p className="font-bold text-gray-700 break-all">{selectedDonor.email || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-3">Compatibility Quick View</span>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-[9px] font-bold text-green-600 uppercase block mb-1">Can Donate To</span>
                                            <div className="flex flex-wrap gap-1">
                                                {compatibilityData[selectedDonor.blood_group]?.give.slice(0, 3).map(t => (
                                                    <span key={t} className="text-[10px] font-bold bg-white text-gray-700 px-2 py-0.5 rounded-lg border border-gray-100">{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-bold text-blue-600 uppercase block mb-1">Can Receive From</span>
                                            <div className="flex flex-wrap gap-1">
                                                {compatibilityData[selectedDonor.blood_group]?.receive.slice(0, 3).map(t => (
                                                    <span key={t} className="text-[10px] font-bold bg-white text-gray-700 px-2 py-0.5 rounded-lg border border-gray-100">{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <a
                                    href={`tel:${selectedDonor.phone}`}
                                    className="w-full gradient-bg text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-red-100 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-sm"
                                >
                                    <i className="fas fa-phone"></i> {selectedDonor.phone}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <footer className="bg-black text-white py-12">
                <div className="container mx-auto px-6 text-center">
                    <div className="flex items-center justify-center space-x-3 mb-6">
                        <div className="pulse-heart"><i className="fas fa-heart text-2xl"></i></div>
                        <h3 className="text-xl font-bold">eBloodBank</h3>
                    </div>
                    <p className="text-gray-500 text-sm max-w-md mx-auto mb-8">Saving lives through community-driven blood donation. Join our mission today and be someone's hero.</p>
                    <div className="border-t border-gray-900 pt-8 text-[10px] text-gray-600 uppercase font-bold tracking-[0.2em]">
                        &copy; 2026 eBloodBank. Built with passion for humanity.
                    </div>
                </div>
            </footer>

            <BackToTop />
        </div >
    );
};

export default Seeker;
