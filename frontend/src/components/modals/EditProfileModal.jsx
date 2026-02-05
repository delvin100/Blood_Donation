import React, { useState, useEffect } from 'react';

const stateDistrictMapping = {
    // ... (same mapping)
    "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
    "Arunachal Pradesh": ["Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Kamle", "Kra Daadi", "Kurung Kumey", "Lepa Rada", "Lohit", "Longding", "Lower Dibang Valley", "Lower Siang", "Lower Subansiri", "Namsai", "Pakke Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
    "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Dima Hasao", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
    "Bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
    "Chhattisgarh": ["Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Janjgir Champa", "Jashpur", "Kabirdham", "Kanker", "Kondagaon", "Korba", "Koriya", "Mahasamund", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sukma", "Surajpur", "Surguja"],
    "Goa": ["North Goa", "South Goa"],
    "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur", "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"],
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
    "Nagaland": ["Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Peren", "Phek", "Tuensang", "Wokha", "Zunheboto"],
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

// Reusable Input Field Component (Moved outside)
const InputField = ({ label, name, type = 'text', options = null, disabled = false, icon, value, onChange, error, placeholder, max, min }) => (
    <div className="flex flex-col gap-2">
        <label className="text-sm font-bold text-gray-700 ml-1">
            {label} <span className="text-red-500">*</span>
        </label>
        <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <i className={`fas ${icon}`}></i>
            </div>
            {options ? (
                <select
                    name={name}
                    value={value || ''}
                    onChange={onChange}
                    disabled={disabled}
                    className={`w-full pl-11 pr-4 py-4 rounded-xl border-2 font-medium bg-white outline-none transition-all duration-200 
                        ${error ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}
                        ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
                    `}
                >
                    <option value="" disabled>Select {label}</option>
                    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            ) : (
                <input
                    type={type}
                    name={name}
                    value={value || ''}
                    onChange={onChange}
                    disabled={disabled}
                    max={max}
                    min={min}
                    placeholder={placeholder || `Enter your ${label.toLowerCase()}`}
                    className={`w-full pl-11 pr-4 py-4 rounded-xl border-2 font-medium bg-white outline-none transition-all duration-200 
                        ${error ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}
                        ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
                    `}
                />
            )}
        </div>
        {error && (
            <p className="text-xs text-red-500 font-bold ml-1 flex items-center gap-1 animate-in slide-in-from-top-1">
                <i className="fas fa-exclamation-circle"></i> {error}
            </p>
        )}
    </div>
);

const EditProfileModal = ({ isOpen, onClose, user, onUpdate }) => {
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        blood_type: '',
        gender: '',
        dob: '',
        phone: '',
        country: 'India',
        state: '',
        district: '',
        city: '',
        username: '',
        password: '',
        confirm_password: ''
    });
    // ... (rest of the component state)
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [globalError, setGlobalError] = useState('');
    const [passwordStrength, setPasswordStrength] = useState({ level: 0, label: "", color: "" });

    // Calculate 18 years ago from today in YYYY-MM-DD format
    const getMaxDate = () => {
        const today = new Date();
        const max = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
        return max.toISOString().split('T')[0];
    };

    const getMinDate = () => {
        const today = new Date();
        const min = new Date(today.getFullYear() - 65, today.getMonth(), today.getDate());
        return min.toISOString().split('T')[0];
    };

    const calculatePasswordStrength = (pwd) => {
        if (!pwd) return { level: 0, label: "", color: "" };
        if (/\s/.test(pwd)) return { level: 0, label: "Invalid (No spaces)", color: "#ef4444" };
        const hasAlpha = /[a-zA-Z]/.test(pwd);
        const hasNumber = /[0-9]/.test(pwd);
        const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);
        if (hasAlpha && hasNumber && hasSpecial) return { level: 3, label: "Hard", color: "#10b981" };
        if ((hasAlpha && hasNumber) || (hasAlpha && hasSpecial) || (hasNumber && hasSpecial)) return { level: 2, label: "Normal", color: "#f59e0b" };
        return { level: 1, label: "Easy", color: "#ef4444" };
    };

    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                email: user.email || '',
                blood_type: user.blood_type || '',
                gender: user.gender || '',
                dob: user.dob ? (() => {
                    const d = new Date(user.dob);
                    return isNaN(d) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                })() : '',
                phone: user.phone || '',
                country: 'India', // Enforce India
                state: user.state || '',
                district: user.district || '',
                city: user.city || '',
                username: user.username || '',
                password: '',
                confirm_password: ''
            });
            setErrors({}); // Clear errors when user changes
        }
    }, [user, isOpen]);

    if (!isOpen) return null;

    const validateField = (name, value) => {
        // ... (validation logic same as before)
        let error = '';
        switch (name) {
            case 'full_name':
                if (value.startsWith(' ')) error = 'Full name should not start with space.';
                else if (!value.trim()) error = 'Full Name is required.';
                else if (value.trim().length < 2) error = 'Name must be at least 2 characters.';
                else if (value.trim().length > 50) error = 'Full name must not exceed 50 characters.';
                else if (!/^[a-zA-Z][a-zA-Z\s]*$/.test(value.trim())) error = 'Full name can only contain letters and spaces, and must start with a letter.';
                break;
            case 'email':
                if (!value.trim()) error = 'Email is required.';
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Invalid email address.';
                else if (value.length > 100) error = 'Email must not exceed 100 characters.';
                break;
            case 'phone':
                if (!value.trim()) error = 'Please enter your phone number.';
                else if (!/^[0-9]{10}$/.test(value)) error = 'Phone number must be exactly 10 digits.';
                break;
            case 'dob':
                if (!value) error = 'Date of Birth is required.';
                else {
                    const today = new Date();
                    const birthDate = new Date(value);
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    if (age < 18) error = 'You must be at least 18 years old to register.';
                    else if (age > 65) error = 'Age must be between 18 and 65 years.';
                }
                break;
            case 'username':
                if (!value.trim()) error = 'Username is required.';
                else if (value.length < 3) error = 'Username must be at least 3 characters.';
                else if (value.length > 30) error = 'Username must not exceed 30 characters.';
                else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) error = 'Username must start with a letter and contain only letters, numbers, or underscores.';
                break;
            case 'password':
                if (value) {
                    if (value.length < 8) error = 'Password must be at least 8 characters.';
                    else if (value.length > 128) error = 'Password must not exceed 128 characters.';
                    else if (/\s/.test(value)) error = 'Password must not contain spaces.';
                }
                break;
            case 'confirm_password':
                if (formData.password && value !== formData.password) error = 'Passwords do not match.';
                break;
            case 'blood_type':
            case 'gender':
            case 'state':
            case 'district':
            case 'city':
                if (!value.trim()) error = 'This field is required.';
                break;
            default:
                break;
        }
        return error;
    };

    const handleChange = (e) => {
        let { name, value } = e.target;

        // Live filtering for phone number
        if (name === 'phone') {
            value = value.replace(/[^0-9]/g, '').slice(0, 10);
        }

        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            // Reset district when state changes
            if (name === 'state') {
                newData.district = '';
            }
            return newData;
        });

        const error = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: error }));

        if (name === 'password') {
            setPasswordStrength(calculatePasswordStrength(value));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setGlobalError('');

        // Validate all fields
        const newErrors = {};
        Object.keys(formData).forEach(key => {
            if (key === 'country') return; // Skip country validation as it's static
            const error = validateField(key, formData[key]);
            if (error) newErrors[key] = error;
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setIsSubmitting(false);
            setGlobalError('Please fix the errors in the form.');
            return;
        }

        // Only send password if it's filled
        const submissionData = { ...formData };
        if (!submissionData.password) {
            delete submissionData.password;
            delete submissionData.confirm_password;
        }

        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            const res = await fetch('/api/donor/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(submissionData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update profile');
            }

            onUpdate();
            window.location.href = '/dashboard';
            onClose();
        } catch (err) {
            setGlobalError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const bloodTypes = [
        "A+", "A-", "A1+", "A1-", "A1B+", "A1B-",
        "A2+", "A2-", "A2B+", "A2B-", "AB+", "AB-",
        "B+", "B-", "Bombay Blood Group", "INRA", "O+", "O-"
    ];

    const genders = ["Male", "Female", "Other"];

    // Derived districts based on selected state
    const districts = formData.state ? stateDistrictMapping[formData.state] || [] : [];

    return (
        <div className="fixed inset-0 bg-white z-[2000] overflow-y-auto flex flex-col animate-in slide-in-from-bottom-5">
            {/* Modern Header */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <i className="fas fa-user-edit text-xl"></i>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 tracking-tight">Edit Profile</h2>
                        <p className="text-sm text-gray-500 font-medium">Update your personal details</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                >
                    <i className="fas fa-times text-lg"></i>
                </button>
            </div>

            <div className="flex-1 max-w-5xl mx-auto w-full p-6 lg:p-10">
                {globalError && (
                    <div className="mb-8 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 font-bold flex items-center gap-3 shadow-sm">
                        <i className="fas fa-exclamation-triangle text-xl"></i>
                        {globalError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-12 pb-20">

                    {/* Section 1: Personal Details */}
                    <div className="bg-blue-50/50 p-8 rounded-[32px] border border-blue-100">
                        <h3 className="text-xl font-black text-blue-900 mb-6 flex items-center gap-2">
                            <i className="fas fa-id-card text-blue-500"></i>
                            Personal Information
                        </h3>
                        <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                            <InputField label="Full Name" name="full_name" icon="fa-user" value={formData.full_name} onChange={handleChange} error={errors.full_name} />
                            <InputField label="Date of Birth" name="dob" type="date" icon="fa-calendar-alt" value={formData.dob} onChange={handleChange} error={errors.dob} max={getMaxDate()} min={getMinDate()} />
                            <InputField label="Blood Type" name="blood_type" options={bloodTypes} icon="fa-heartbeat" value={formData.blood_type} onChange={handleChange} error={errors.blood_type} />
                            <InputField label="Gender" name="gender" options={genders} icon="fa-venus-mars" value={formData.gender} onChange={handleChange} error={errors.gender} />
                            <InputField label="Email Address" name="email" type="email" icon="fa-envelope" value={formData.email} onChange={handleChange} error={errors.email} />
                        </div>
                    </div>

                    {/* Section 2: Contact & Location */}
                    <div className="bg-indigo-50/50 p-8 rounded-[32px] border border-indigo-100">
                        <h3 className="text-xl font-black text-indigo-900 mb-6 flex items-center gap-2">
                            <i className="fas fa-map-marked-alt text-indigo-500"></i>
                            Contact & Location
                        </h3>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                            <InputField label="Phone Number" name="phone" type="tel" icon="fa-phone" value={formData.phone} onChange={handleChange} error={errors.phone} />
                            <InputField label="Country" name="country" disabled={true} icon="fa-globe-asia" value={formData.country} onChange={handleChange} error={errors.country} />
                            <InputField label="State" name="state" options={Object.keys(stateDistrictMapping)} icon="fa-map" value={formData.state} onChange={handleChange} error={errors.state} />
                            <InputField label="District" name="district" options={districts} disabled={!formData.state} icon="fa-map-signs" value={formData.district} onChange={handleChange} error={errors.district} />
                            <InputField label="City" name="city" icon="fa-city" value={formData.city} onChange={handleChange} error={errors.city} />
                        </div>
                    </div>

                    {/* Section 3: Account Security (Only for non-Google users) */}
                    {!user.google_id && (
                        <div className="bg-rose-50/50 p-8 rounded-[32px] border border-rose-100">
                            <h3 className="text-xl font-black text-rose-900 mb-6 flex items-center gap-2">
                                <i className="fas fa-shield-alt text-rose-500"></i>
                                Account Security
                            </h3>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                                <InputField label="Username" name="username" icon="fa-user-tag" value={formData.username} onChange={handleChange} error={errors.username} />
                                <div className="space-y-2">
                                    <InputField label="New Password" name="password" type="password" icon="fa-lock" value={formData.password} onChange={handleChange} error={errors.password} />
                                    {formData.password && (
                                        <div className="px-1 pt-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Strength: <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span></span>
                                            </div>
                                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex gap-1">
                                                <div className={`h-full transition-all duration-500 rounded-full ${passwordStrength.level >= 1 ? '' : 'bg-transparent'}`} style={{ width: '33.33%', backgroundColor: passwordStrength.level >= 1 ? passwordStrength.color : '' }}></div>
                                                <div className={`h-full transition-all duration-500 rounded-full ${passwordStrength.level >= 2 ? '' : 'bg-transparent'}`} style={{ width: '33.33%', backgroundColor: passwordStrength.level >= 2 ? passwordStrength.color : '' }}></div>
                                                <div className={`h-full transition-all duration-500 rounded-full ${passwordStrength.level >= 3 ? '' : 'bg-transparent'}`} style={{ width: '33.33%', backgroundColor: passwordStrength.level >= 3 ? passwordStrength.color : '' }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <InputField
                                    label="Confirm New Password"
                                    name="confirm_password"
                                    type="password"
                                    icon="fa-check-double"
                                    value={formData.confirm_password}
                                    onChange={handleChange}
                                    error={errors.confirm_password}
                                    placeholder="Confirm your password"
                                    disabled={!formData.password}
                                />
                            </div>
                            <p className="mt-4 text-xs text-rose-600 font-medium">
                                <i className="fas fa-info-circle mr-1"></i>
                                Leave password fields blank if you don't want to change it.
                            </p>
                        </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex items-center gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-[2] py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none"
                        >
                            {isSubmitting ? (
                                <><i className="fas fa-circle-notch animate-spin"></i> Saving Changes...</>
                            ) : (
                                <><i className="fas fa-check-circle"></i> Save Profile Changes</>
                            )}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
};

export default EditProfileModal;
