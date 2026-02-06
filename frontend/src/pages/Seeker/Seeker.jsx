import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import "../../assets/css/home.css";
import BackToTop from "../../components/common/BackToTop";

const stateDistrictMapping = {
    "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
    "Arunachal Pradesh": ["Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Kamle", "Kra Daadi", "Kurung Kumey", "Lepa Rada", "Lohit", "Longding", "Lower Dibang Valley", "Lower Siang", "Lower Subansiri", "Namsai", "Pakke Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
    "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Dima Hasao", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
    "Bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
    "Chhattisgarh": ["Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Janjgir Champa", "Jashpur", "Kabirdham", "Kanker", "Kondagaon", "Korba", "Koriya", "Mahasamund", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sukma", "Surajpur", "Surguja"],
    "Goa": ["North Goa", "South Goa"],
    "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur", "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porborder", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"],
    "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
    "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"],
    "Jharkhand": ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahibganj", "Seraikela Kharsawan", "Simdega", "West Singhbhum"],
    "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"],
    "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
    "Madhya Pradesh": ["Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Niwari", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
    "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
    "Manipur": ["Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"],
    "Meghalaya": ["East Garo Hills", "East Jaintia Hills", "East Khasi Hills", "North Garo Hills", "Ri Bhoi", "South Garo Hills", "South West Garo Hills", "South West Khasi Hills", "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"],
    "Mizoram": ["Aizawl", "Champhai", "Hnahthial", "Kolasib", "Khawzawl", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Saitual", "Serchhip"],
    "Nagaland": ["Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Peren", "Phek", "Tuensang", "Wokha", "Zuneboto"],
    "Odisha": ["Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Deogarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh"],
    "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Nawanshahr", "Pathankot", "Patiala", "Rupnagar", "Sangrur", "Tarn Taran"],
    "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
    "Sikkim": ["East Sikkim", "North Sikkim", "South Sikkim", "West Sikkim"],
    "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
    "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam", "Komaram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial", "Medak", "Medchal Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Rangareddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"],
    "Tripura": ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
    "Uttar Pradesh": ["Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri", "Kushinagar", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
    "Uttarakhand": ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi"],
    "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"],
    "Andaman and Nicobar Islands": ["Nicobar", "North and Middle Andaman", "South Andaman"],
    "Chandigarh": ["Chandigarh"],
    "Dadra and Nagar Haveli and Daman and Diu": ["Dadra and Nagar Haveli", "Daman", "Diu"],
    "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
    "Jammu and Kashmir": ["Anantnag", "Bandipora", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kathua", "Kishtwar", "Kulgam", "Kupwara", "Poonch", "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba", "Shopian", "Srinagar", "Udhampur"],
    "Ladakh": ["Kargil", "Leh"],
    "Lakshadweep": ["Lakshadweep"],
    "Puducherry": ["Karaikal", "Mahe", "Puducherry", "Yanam"]
};

const cityToDistrictMapping = {
    'Kochi': 'Ernakulam',
    'Cochin': 'Ernakulam',
    'Thiruvananthapuram': 'Thiruvananthapuram',
    'Trivandrum': 'Thiruvananthapuram',
    'Kozhikode': 'Kozhikode',
    'Calicut': 'Kozhikode',
    'Thrissur': 'Thrissur',
    'Trichur': 'Thrissur',
    'Kollam': 'Kollam',
    'Quilon': 'Kollam',
    'Kannur': 'Kannur',
    'Cannanore': 'Kannur',
    'Palakkad': 'Palakkad',
    'Palghat': 'Palakkad',
    'Alappuzha': 'Alappuzha',
    'Alleppey': 'Alappuzha',
    'Kottayam': 'Kottayam',
    'Malappuram': 'Malappuram',
};

const Seeker = () => {
    const [bloodType, setBloodType] = useState("");
    const [state, setState] = useState("");
    const [district, setDistrict] = useState("");
    const [city, setCity] = useState("");
    const [donors, setDonors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
    const [isCompatibilityModalOpen, setIsCompatibilityModalOpen] = useState(false);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [locationError, setLocationError] = useState("");

    // Emergency Form State
    const [emergencyForm, setEmergencyForm] = useState({
        full_name: "",
        email: "",
        phone: "",
        blood_type: "",
        required_by: "",
        state: "",
        district: ""
    });

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
                            city: addr.city || addr.town || addr.village || addr.suburb || addr.municipality
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
                            city: bigData.city || bigData.locality
                        };
                    }
                } catch (err) {
                    console.warn("BigDataCloud failed:", err);
                }
            }

            if (!locationData || !locationData.state) {
                throw new Error("Unable to determine location from coordinates");
            }

            let matchedState = null;
            const stateKeys = Object.keys(stateDistrictMapping);

            for (const stateKey of stateKeys) {
                if (stateKey.toLowerCase().includes(locationData.state.toLowerCase()) ||
                    locationData.state.toLowerCase().includes(stateKey.toLowerCase())) {
                    matchedState = stateKey;
                    break;
                }
            }

            if (!matchedState) {
                throw new Error(`State "${locationData.state}" not found in our database`);
            }

            let matchedDistrict = null;
            const districts = stateDistrictMapping[matchedState] || [];

            for (const dist of districts) {
                if (dist.toLowerCase() === locationData.district?.toLowerCase()) {
                    matchedDistrict = dist;
                    break;
                }
            }

            if (!matchedDistrict && locationData.district) {
                for (const dist of districts) {
                    if (dist.toLowerCase().includes(locationData.district.toLowerCase()) ||
                        locationData.district.toLowerCase().includes(dist.toLowerCase())) {
                        matchedDistrict = dist;
                        break;
                    }
                }
            }

            if (!matchedDistrict && locationData.city) {
                const cityKey = Object.keys(cityToDistrictMapping).find(
                    city => city.toLowerCase() === locationData.city.toLowerCase()
                );
                if (cityKey) {
                    matchedDistrict = cityToDistrictMapping[cityKey];
                }
            }

            setState(matchedState);
            if (matchedDistrict) setDistrict(matchedDistrict);
            if (locationData.city) setCity(locationData.city);

            toast.success(`Location detected: ${locationData.city || matchedDistrict || matchedState}`);

        } catch (err) {
            console.error("Location fetch error:", err);
            setLocationError(err.message || "Failed to fetch location. Please enter manually.");
            toast.error(err.message || "Location detection failed");
        } finally {
            setIsFetchingLocation(false);
        }
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        setSearched(true);
        try {
            const response = await axios.get(`/api/seeker/donors`, {
                params: {
                    blood_type: bloodType,
                    state: state,
                    district: district,
                    city: city
                }
            });
            setDonors(response.data);
        } catch (error) {
            console.error("Error fetching donors:", error);
            toast.error("Failed to fetch donors. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleEmergencySubmit = async (e) => {
        e.preventDefault();
        const loadingToast = toast.loading("Submitting request...");
        try {
            await axios.post(`/api/seeker/request`, emergencyForm);
            toast.success("Emergency request posted successfully!", { id: loadingToast });
            setIsEmergencyModalOpen(false);
            setEmergencyForm({
                full_name: "",
                email: "",
                phone: "",
                blood_type: "",
                required_by: "",
                state: "",
                district: ""
            });
        } catch (error) {
            console.error("Error submitting request:", error);
            toast.error("Failed to submit request.", { id: loadingToast });
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
                        Search through our verified network of donors or post an emergency request to get immediate help.
                    </p>

                    {/* Floating Quick Stats */}
                    <div className="flex flex-wrap justify-center gap-4 mb-12">
                        <div className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-2xl shadow-sm border border-white flex items-center gap-3">
                            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-sm font-bold text-gray-700">500+ Active Donors Nearby</span>
                        </div>
                        <button
                            onClick={() => setIsEmergencyModalOpen(true)}
                            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-red-200 transition-all hover:-translate-y-1 flex items-center gap-2"
                        >
                            <i className="fas fa-ambulance"></i> Post Emergency Request
                        </button>
                    </div>
                </div>
            </section>

            <main className="container mx-auto px-6 pb-20">
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
                                            value={bloodType}
                                            onChange={(e) => setBloodType(e.target.value)}
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
                                            value={state}
                                            onChange={(e) => { setState(e.target.value); setDistrict(""); }}
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
                                            value={district}
                                            onChange={(e) => setDistrict(e.target.value)}
                                            disabled={!state}
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
                                            type="text"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            placeholder="Enter city"
                                            className="w-full pl-5 pr-10 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-red-500 transition-all font-bold text-gray-700 shadow-sm h-[60px]"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-center pt-12 pb-8">
                                <button
                                    type="submit"
                                    disabled={loading}
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
                <div className="space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-2xl font-bold text-gray-800">
                            {searched ? `Found ${donors.length} Potential Heroes` : "Featured Donors"}
                        </h3>
                        {searched && (
                            <button onClick={() => { setSearched(false); setDonors([]); }} className="text-sm font-bold text-red-500 hover:text-red-600">Clear Records</button>
                        )}
                    </div>

                    {loading ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                        </div>
                    ) : donors.length > 0 ? (
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
                                        <div className="flex -space-x-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 border-2 border-white"></div>
                                            <div className="w-8 h-8 rounded-full bg-red-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-red-400">V</div>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-black text-gray-800 mb-2 truncate group-hover:text-red-600 transition-colors uppercase tracking-tight">{donor.name}</h3>
                                    <div className="flex items-center gap-2 text-gray-500 mb-8 font-medium">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-xs">
                                            <i className="fas fa-location-dot"></i>
                                        </div>
                                        <span className="text-sm">{donor.city}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 relative z-10">
                                        <a
                                            href={`tel:${donor.phone}`}
                                            className="bg-gray-900 text-white py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-red-600 transition-all uppercase tracking-widest"
                                        >
                                            <i className="fas fa-phone"></i> Call
                                        </a>
                                        <a
                                            href={`https://wa.me/91${donor.phone}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-green-500 text-white py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:bg-green-600 transition-all uppercase tracking-widest"
                                        >
                                            <i className="fab fa-whatsapp text-sm"></i> Text
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : searched ? (
                        <div className="text-center py-20 bg-white rounded-[3rem] shadow-inner border border-dashed border-gray-200">
                            <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl text-gray-300">
                                <i className="fas fa-search"></i>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Matches Found</h3>
                            <p className="text-gray-500 max-w-sm mx-auto">We couldn't find any donors matching your criteria. Try expanding your search area.</p>
                            <button
                                onClick={() => setIsEmergencyModalOpen(true)}
                                className="mt-8 text-red-600 font-bold hover:underline"
                            >
                                Post an Emergency Request Instead →
                            </button>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8 items-center bg-white p-12 rounded-[2.5rem] shadow-sm border border-gray-100">
                            <div>
                                <h4 className="text-3xl font-black text-gray-800 mb-4 tracking-tight">Search Smart. <br /><span className="text-red-500 italic">Save Lives Faster.</span></h4>
                                <p className="text-gray-500 mb-8 font-medium leading-relaxed">Enter a blood group and city to see available donors in your vicinity. Our network includes thousands of verified volunteers ready to help.</p>
                                <div className="flex gap-4">
                                    <div className="bg-red-50 p-4 rounded-2xl flex-1 text-center">
                                        <span className="block text-2xl font-black text-red-600">8+</span>
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
            {isEmergencyModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden relative animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setIsEmergencyModalOpen(false)}
                            className="absolute top-6 right-6 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all z-10 text-xl"
                        >
                            <i className="fas fa-times"></i>
                        </button>

                        <div className="grid md:grid-cols-[1fr_1.5fr]">
                            <div className="gradient-bg p-10 text-white flex flex-col justify-between">
                                <div>
                                    <h3 className="text-3xl font-black leading-tight mb-4">Urgent Support</h3>
                                    <p className="text-red-100 text-sm font-medium">Post your requirement and we'll notify donors in your area immediately.</p>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"><i className="fas fa-check"></i></div>
                                        <span className="text-xs font-bold uppercase tracking-widest">Fast Approval</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"><i className="fas fa-bell"></i></div>
                                        <span className="text-xs font-bold uppercase tracking-widest">Global Reach</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10">
                                <form onSubmit={handleEmergencySubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Full Name</label>
                                            <input required type="text" className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 font-bold text-sm" placeholder="Patient/Requester" value={emergencyForm.full_name} onChange={e => setEmergencyForm({ ...emergencyForm, full_name: e.target.value })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Phone</label>
                                            <input required type="tel" className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 font-bold text-sm" placeholder="Contact number" value={emergencyForm.phone} onChange={e => setEmergencyForm({ ...emergencyForm, phone: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Blood Type Required</label>
                                        <select required className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 font-bold text-sm appearance-none" value={emergencyForm.blood_type} onChange={e => setEmergencyForm({ ...emergencyForm, blood_type: e.target.value })}>
                                            <option value="">Select Group</option>
                                            {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Required By (Date)</label>
                                        <input required type="date" className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 font-bold text-sm uppercase" value={emergencyForm.required_by} onChange={e => setEmergencyForm({ ...emergencyForm, required_by: e.target.value })} />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">State</label>
                                        <select required className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 font-bold text-sm" value={emergencyForm.state} onChange={e => setEmergencyForm({ ...emergencyForm, state: e.target.value, district: "" })}>
                                            <option value="">Select State</option>
                                            {Object.keys(stateDistrictMapping).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">District</label>
                                            <select required className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 font-bold text-sm" value={emergencyForm.district} onChange={e => setEmergencyForm({ ...emergencyForm, district: e.target.value })} disabled={!emergencyForm.state}>
                                                <option value="">Select District</option>
                                                {(stateDistrictMapping[emergencyForm.state] || []).map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-gray-400 ml-1">City/Area</label>
                                            <input required type="text" placeholder="City" className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 font-bold text-sm" value={emergencyForm.city || ""} onChange={e => setEmergencyForm({ ...emergencyForm, city: e.target.value })} />
                                            <div className="pt-1">
                                                <button
                                                    type="button"
                                                    onClick={fetchLocation}
                                                    disabled={isFetchingLocation}
                                                    className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {isFetchingLocation ? (
                                                        <><i className="fas fa-spinner fa-spin"></i> Detecting...</>
                                                    ) : (
                                                        <><i className="fas fa-location-arrow"></i> Use Current Location</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full gradient-bg text-white font-black py-4 rounded-xl mt-6 shadow-xl shadow-red-100 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase tracking-widest">Submit Request</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Compatibility Modal */}
            {isCompatibilityModalOpen && (
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
        </div>
    );
};

export default Seeker;
