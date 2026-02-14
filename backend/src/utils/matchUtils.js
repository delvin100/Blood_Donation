const { getMLMatchProbability } = require('./mlUtils');

/**
 * Calculates the distance between two points in kilometers using the Haversine formula.
 * 
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} - Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;

    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const INDIA_COORDINATES = {
    // === METROS & MAJOR HUBS ===
    "delhi": { lat: 28.6139, lng: 77.2090 },
    "new delhi": { lat: 28.6139, lng: 77.2090 },
    "mumbai": { lat: 19.0760, lng: 72.8777 },
    "bombay": { lat: 19.0760, lng: 72.8777 },
    "kolkata": { lat: 22.5726, lng: 88.3639 },
    "calcutta": { lat: 22.5726, lng: 88.3639 },
    "bengaluru": { lat: 12.9716, lng: 77.5946 },
    "bangalore": { lat: 12.9716, lng: 77.5946 },
    "chennai": { lat: 13.0827, lng: 80.2707 },
    "madras": { lat: 13.0827, lng: 80.2707 },
    "hyderabad": { lat: 17.3850, lng: 78.4867 },
    "ahmedabad": { lat: 23.0225, lng: 72.5714 },
    "pune": { lat: 18.5204, lng: 73.8567 },
    "surat": { lat: 21.1702, lng: 72.8311 },
    "lucknow": { lat: 26.8467, lng: 80.9462 },
    "jaipur": { lat: 26.9124, lng: 75.7873 },
    "kanpur": { lat: 26.4499, lng: 80.3319 },
    "nagpur": { lat: 21.1458, lng: 79.0882 },
    "indore": { lat: 22.7196, lng: 75.8577 },
    "thane": { lat: 19.2183, lng: 72.9633 },
    "bhopal": { lat: 23.2599, lng: 77.4126 },
    "visakhapatnam": { lat: 17.6868, lng: 83.2185 },
    "patna": { lat: 25.5941, lng: 85.1376 },
    "vadodara": { lat: 22.3072, lng: 73.1812 },
    "ghaziabad": { lat: 28.6692, lng: 77.4538 },
    "ludhiana": { lat: 30.9010, lng: 75.8534 },
    "agra": { lat: 27.1767, lng: 78.0081 },
    "nashik": { lat: 19.9975, lng: 73.7898 },
    "faridabad": { lat: 28.4089, lng: 77.3178 },
    "meerut": { lat: 28.9845, lng: 77.7064 },
    "rajkot": { lat: 22.3039, lng: 70.8022 },
    "varanasi": { lat: 25.3176, lng: 82.9739 },
    "srinagar": { lat: 34.0837, lng: 74.7973 },
    "amritsar": { lat: 31.6340, lng: 74.8723 },
    "ranchi": { lat: 23.3441, lng: 85.3096 },
    "howrah": { lat: 22.5958, lng: 88.2636 },
    "jabalpur": { lat: 23.1815, lng: 79.9864 },
    "gwalior": { lat: 26.2124, lng: 78.1772 },
    "vijayawada": { lat: 16.5062, lng: 80.6480 },
    "jodhpur": { lat: 26.2389, lng: 73.0243 },
    "madurai": { lat: 9.9252, lng: 78.1198 },
    "raipur": { lat: 21.2514, lng: 81.6296 },
    "guwahati": { lat: 26.1158, lng: 91.7086 },
    "chandigarh": { lat: 30.7333, lng: 76.7794 },
    "bhubaneswar": { lat: 20.2961, lng: 85.8245 },
    "dehradun": { lat: 30.3165, lng: 78.0322 },
    "jammu": { lat: 32.7266, lng: 74.8570 },

    // === KERALA SPECIFIC (Retained and Expanded) ===
    "thiruvananthapuram": { lat: 8.5241, lng: 76.9366 },
    "trivandrum": { lat: 8.5241, lng: 76.9366 },
    "kollam": { lat: 8.8932, lng: 76.6141 },
    "pathanamthitta": { lat: 9.2648, lng: 76.7870 },
    "alappuzha": { lat: 9.4981, lng: 76.3329 },
    "kottayam": { lat: 9.5916, lng: 76.5221 },
    "idukki": { lat: 9.8500, lng: 76.9167 },
    "ernakulam": { lat: 9.9312, lng: 76.2673 },
    "kochi": { lat: 9.9312, lng: 76.2673 },
    "thrissur": { lat: 10.5276, lng: 76.2144 },
    "palakkad": { lat: 10.7867, lng: 76.6547 },
    "malappuram": { lat: 11.0510, lng: 76.0711 },
    "kozhikode": { lat: 11.2588, lng: 75.7804 },
    "wayanad": { lat: 11.6103, lng: 76.0828 },
    "kannur": { lat: 11.8745, lng: 75.3704 },
    "kasaragod": { lat: 12.5103, lng: 74.9852 },
    "pala": { lat: 9.7100, lng: 76.6800 },
    "changanassery": { lat: 9.4447, lng: 76.5390 },
    "kanjirappally": { lat: 9.5558, lng: 76.7914 },
    "thiruvalla": { lat: 9.3878, lng: 76.5746 },
    "chengannur": { lat: 9.3300, lng: 76.6100 },
    "chunkappara": { lat: 9.4536, lng: 76.7439 },
    "koovapally": { lat: 9.5108, lng: 76.8227 },
    "kottarakkara": { lat: 8.9986, lng: 76.7717 },
    "aluva": { lat: 10.1076, lng: 76.3511 },
    "angamaly": { lat: 10.1983, lng: 76.3860 },
    "ettumanoor": { lat: 9.6700, lng: 76.5600 },
    "ponkunnam": { lat: 9.5833, lng: 76.7500 },
    "erattupetta": { lat: 9.6917, lng: 76.7861 },
    "vazhoor": { lat: 9.5847, lng: 76.7000 },
    "kattappana": { lat: 9.7161, lng: 77.0863 },
    "munnar": { lat: 10.0889, lng: 77.0595 },
    "ranni": { lat: 9.3846, lng: 76.7876 },
    "adoor": { lat: 9.1555, lng: 76.7300 },
    "mundakayam": { lat: 9.5333, lng: 76.8833 },
    "muvattupuzha": { lat: 9.9880, lng: 76.5794 },
    "kozhencherry": { lat: 9.3333, lng: 76.7000 },
    "pandalam": { lat: 9.2333, lng: 76.6833 },
    "konni": { lat: 9.2333, lng: 76.8500 },
    "vazhoor": { lat: 9.5847, lng: 76.7000 }
};

const BLOOD_COMPATIBILITY = {
    "A+": ["A+", "A-", "O+", "O-"],
    "O+": ["O+", "O-"],
    "B+": ["B+", "B-", "O+", "O-"],
    "AB+": ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"],
    "A-": ["A-", "O-"],
    "O-": ["O-"],
    "B-": ["B-", "O-"],
    "AB-": ["AB-", "A-", "B-", "O-"],
    "A1+": ["A1+", "A1-", "A+", "A-", "O+", "O-"], // Simplified/Expanded for safety
    "A1B+": ["A1B+", "A1B-", "A1+", "A1-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    "Bombay Blood Group": ["Bombay Blood Group"]
};

const getCompatibleBloodTypes = (targetType) => {
    return BLOOD_COMPATIBILITY[targetType] || [targetType];
};

const getCompatibilityScore = (donorType, targetType) => {
    if (donorType === targetType) return 100; // Exact match
    return 80; // Compatible match
};

/**
 * Helper to get coordinates for an Indian place (City or District)
 */
const getIndiaCoordinates = (city, district) => {
    // Robust normalization: lowercase, trim, and remove common suffixes like "city" or "town"
    const normalize = (str) => {
        if (!str) return null;
        return str.toLowerCase()
            .trim()
            .replace(/\bcity\b/g, '')
            .replace(/\btown\b/g, '')
            .replace(/\bdistrict\b/g, '')
            .trim();
    };

    const c = normalize(city);
    const d = normalize(district);

    // Prioritize exact city match, then normalized city match, then district match
    return INDIA_COORDINATES[c] || INDIA_COORDINATES[d] || null;
};

/**
 * Calculates a suitability score for a donor based on multiple factors.
 * Includes ML-based prediction as a refinement.
 * 
 * @param {Object} donor - Donor object
 * @param {Object} seeker - Seeker info (lat, lng, blood_type)
 * @returns {Promise<Object>} - Suitability score (0-100) and distance
 */
const calculateSuitabilityScore = async (donor, seeker) => {
    let heuristicScore = 0;
    const weights = {
        distance: 0.6, // Adjusted: 60%
        compatibility: 0.2, // New: 20%
        recency: 0.1, // 10%
        history: 0.1 // 10%
    };

    // 1. Distance Score (60%)
    let distance = Infinity;
    let distanceFactor = 0;

    // ... (Geocoding logic remains the same) ...
    // A. Geocode Seeker if GPS is missing
    let seekerLat = seeker.lat;
    let seekerLng = seeker.lng;
    if (!seekerLat || !seekerLng) {
        const coords = getIndiaCoordinates(seeker.city, seeker.district);
        if (coords) {
            seekerLat = coords.lat;
            seekerLng = coords.lng;
        }
    }

    // B. Geocode Donor if GPS is missing in DB
    let donorLat = donor.latitude;
    let donorLng = donor.longitude;
    if (!donorLat || !donorLng) {
        const coords = getIndiaCoordinates(donor.city, donor.district);
        if (coords) {
            donorLat = coords.lat;
            donorLng = coords.lng;
        }
    }

    // C. Calculate Distance
    if (donorLat && donorLng && seekerLat && seekerLng) {
        distance = calculateDistance(seekerLat, seekerLng, donorLat, donorLng);

        // --- BANDED PROXIMITY SCORING (Absolute Priority) ---
        if (distance <= 2.0) {
            distanceFactor = 0.90 + (1 - distance / 2.0) * 0.10;
        } else if (distance <= 10.0) {
            distanceFactor = 0.70 + (1 - (distance - 2.0) / 8.0) * 0.19;
        } else if (distance <= 30.0) {
            distanceFactor = 0.40 + (1 - (distance - 10.0) / 20.0) * 0.29;
        } else if (distance <= 100.0) {
            distanceFactor = 0.10 + (1 - (distance - 30.0) / 70.0) * 0.29;
        } else {
            distanceFactor = Math.max(0, (1 - (distance - 100.0) / 400.0) * 0.09);
        }
    } else {
        distanceFactor = 0;
    }
    heuristicScore += distanceFactor * weights.distance * 100;

    // 2. Compatibility Score (20%)
    const compatibilityScore = getCompatibilityScore(donor.blood_type, seeker.blood_type);
    heuristicScore += (compatibilityScore / 100) * weights.compatibility * 100;

    // 3. Recency Score (10%)
    let recencyFactor = 1.0;
    if (donor.last_donation_date) {
        const daysSince = (new Date() - new Date(donor.last_donation_date)) / (1000 * 60 * 60 * 24);
        recencyFactor = Math.min(daysSince / 180, 1.0);
    }
    heuristicScore += recencyFactor * weights.recency * 100;

    // 4. History Score (10%)
    const historyFactor = Math.min((donor.total_donations || 0) / 10, 1.0);
    heuristicScore += historyFactor * weights.history * 100;

    // 5. ML Refinement
    const donorWithDistance = { ...donor, distance };
    const mlProbability = await getMLMatchProbability(donorWithDistance, seeker);
    const mlScore = mlProbability * 100;

    let finalScore = (heuristicScore * 0.9) + (mlScore * 0.1);

    // 6. Neighborhood Boost
    if (distance < 2.0) {
        finalScore *= 1.25;
    } else if (distance < 5.0) {
        finalScore *= 1.10;
    }

    finalScore = Math.min(finalScore, 100);

    return {
        score: Math.round(finalScore),
        heuristic_score: Math.round(heuristicScore * 100) / 100,
        compatibility_score: compatibilityScore,
        ml_prediction: Math.round(mlProbability * 100) / 100,
        distance: Math.round(distance * 100) / 100
    };
};

module.exports = {
    calculateDistance,
    calculateSuitabilityScore,
    getCompatibleBloodTypes
};
