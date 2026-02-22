import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    FlatList,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import apiService from '../../api/apiService';
import DonorDetailsModal from '../../components/seeker/DonorDetailsModal';

const { width } = Dimensions.get('window');

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

const bloodGroups = ["A+", "A-", "A1+", "A1-", "A1B+", "A1B-", "A2+", "A2-", "A2B+", "A2B-", "AB+", "AB-", "B+", "B-", "Bombay Blood Group", "INRA", "O+", "O-"];

const SeekerScreen = ({ navigation }) => {
    const [bloodType, setBloodType] = useState("");
    const [state, setState] = useState("");
    const [district, setDistrict] = useState("");
    const [city, setCity] = useState("");
    const [lat, setLat] = useState(null);
    const [lng, setLng] = useState(null);
    const [donors, setDonors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [selectedDonor, setSelectedDonor] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showSelection, setShowSelection] = useState({ type: null, visible: false });

    const fetchLocation = async () => {
        setIsFetchingLocation(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Please enable location permissions to use this feature.');
                return;
            }

            let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const { latitude, longitude } = location.coords;
            setLat(latitude);
            setLng(longitude);

            let reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (reverseGeocode.length > 0) {
                const geo = reverseGeocode[0];
                setCity(geo.city || geo.district || "");
                // Map state and district if possible
                const matchedState = Object.keys(stateDistrictMapping).find(s =>
                    s.toLowerCase().includes(geo.region?.toLowerCase()) || geo.region?.toLowerCase().includes(s.toLowerCase())
                );
                if (matchedState) {
                    setState(matchedState);
                }
            }
            Alert.alert('Location Updated', 'Your current coordinates have been fetched.');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to fetch location. Please enter manually.');
        } finally {
            setIsFetchingLocation(false);
        }
    };

    const handleSearch = async () => {
        if (!bloodType) {
            Alert.alert('Selection Required', 'Please select a blood group.');
            return;
        }
        setLoading(true);
        try {
            const params = {
                blood_type: bloodType,
                lat: lat,
                lng: lng,
                city: city,
                district: district
            };
            const response = await apiService.get('/seeker/smart-match', { params });
            setDonors(response.data);
            if (response.data.length === 0) {
                Alert.alert('No Donors Found', 'Try expanding your search criteria.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to search donors. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const DonorCard = ({ item }) => (
        <TouchableOpacity
            style={styles.donorCard}
            onPress={() => { setSelectedDonor(item); setShowModal(true); }}
            activeOpacity={0.8}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.bloodBadge, { backgroundColor: item.compatibility_score === 100 ? '#fef2f2' : '#fffbeb' }]}>
                    <Text style={[styles.bloodText, { color: item.compatibility_score === 100 ? '#dc2626' : '#d97706' }]}>
                        {item.blood_group}
                    </Text>
                </View>
                <View style={styles.matchTag}>
                    <Text style={styles.matchText}>{item.compatibility_score}% Match</Text>
                </View>
            </View>
            <Text style={styles.donorName}>{item.name}</Text>
            <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color="#64748b" />
                <Text style={styles.locationText}>{item.city}, {item.district}</Text>
            </View>
            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Text style={styles.statVal}>{item.suitability_score}</Text>
                    <Text style={styles.statLab}>Score</Text>
                </View>
                <View style={styles.statLine} />
                <View style={styles.stat}>
                    <Text style={styles.statVal}>{(item.distance === null || item.distance === Infinity) ? 'N/A' : `${Math.round(item.distance)}km`}</Text>
                    <Text style={styles.statLab}>Dist.</Text>
                </View>
                <View style={styles.statLine} />
                <View style={styles.stat}>
                    <Text style={[styles.statVal, { color: '#dc2626' }]}>{Math.round(item.ai_confidence * 100)}%</Text>
                    <Text style={styles.statLab}>AI Chance</Text>
                </View>
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={styles.callSmall}
                    onPress={() => Linking.openURL(`tel:${item.phone}`)}
                >
                    <Ionicons name="call" size={16} color="white" />
                    <Text style={styles.callSmallText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.detailsSmall}
                    onPress={() => { setSelectedDonor(item); setShowModal(true); }}
                >
                    <Text style={styles.detailsSmallText}>Details</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    const SelectionList = ({ data, onSelect, title }) => (
        <Modal visible={showSelection.visible} animationType="fade" transparent={true}>
            <View style={styles.selectionOverlay}>
                <View style={styles.selectionContent}>
                    <View style={styles.selectionHeader}>
                        <Text style={styles.selectionTitle}>{title}</Text>
                        <TouchableOpacity onPress={() => setShowSelection({ ...showSelection, visible: false })}>
                            <Ionicons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={data}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.selectionItem}
                                onPress={() => { onSelect(item); setShowSelection({ ...showSelection, visible: false }); }}
                            >
                                <Text style={styles.selectionText}>{item}</Text>
                            </TouchableOpacity>
                        )}
                        style={{ maxHeight: height * 0.6 }}
                    />
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#dc2626', '#991b1b']} style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Find A Life Saver</Text>
                    <View style={{ width: 40 }} />
                </View>
                <Text style={styles.headerSubtitle}>Every drop counts, every donor is a hero.</Text>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.searchPanel}>
                    <View style={styles.gpsBanner}>
                        <View style={styles.gpsInfo}>
                            <Text style={styles.gpsTitle}>Fast Location Detection</Text>
                            <Text style={styles.gpsSubtitle}>Skip the typing - use GPS instead</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.gpsBtn}
                            onPress={fetchLocation}
                            disabled={isFetchingLocation}
                        >
                            {isFetchingLocation ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Ionicons name="navigate" size={20} color="white" />
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.form}>
                        <Text style={styles.label}>Select Blood Group</Text>
                        <TouchableOpacity
                            style={styles.dropdown}
                            onPress={() => setShowSelection({ type: 'blood', visible: true })}
                        >
                            <Text style={bloodType ? styles.dropdownTextActive : styles.dropdownTextPlaceholder}>
                                {bloodType || "Select Blood Group"}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color="#64748b" />
                        </TouchableOpacity>

                        <View style={styles.row}>
                            <View style={[styles.formItem, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>State</Text>
                                <TouchableOpacity
                                    style={styles.dropdown}
                                    onPress={() => setShowSelection({ type: 'state', visible: true })}
                                >
                                    <Text style={state ? styles.dropdownTextActive : styles.dropdownTextPlaceholder} numberOfLines={1}>
                                        {state || "Select State"}
                                    </Text>
                                    <Ionicons name="chevron-down" size={16} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.formItem, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>District</Text>
                                <TouchableOpacity
                                    style={[styles.dropdown, !state && { opacity: 0.5 }]}
                                    disabled={!state}
                                    onPress={() => setShowSelection({ type: 'district', visible: true })}
                                >
                                    <Text style={district ? styles.dropdownTextActive : styles.dropdownTextPlaceholder} numberOfLines={1}>
                                        {district || "Select District"}
                                    </Text>
                                    <Ionicons name="chevron-down" size={16} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={styles.label}>City/Town</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter city name"
                                value={city}
                                onChangeText={setCity}
                                placeholderTextColor="#94a3b8"
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.searchBtn}
                            onPress={handleSearch}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Ionicons name="search" size={20} color="white" />
                                    <Text style={styles.searchBtnText}>Search Heroes</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.resultsHeader}>
                    <Text style={styles.resultsTitle}>
                        {donors.length > 0 ? `Found ${donors.length} Potential Heroes` : "Search Results"}
                    </Text>
                </View>

                {donors.length > 0 ? (
                    <View style={styles.resultsList}>
                        {donors.map((item) => <DonorCard key={item.id} item={item} />)}
                    </View>
                ) : !loading && (
                    <View style={styles.emptyState}>
                        <Ionicons name="search-outline" size={80} color="#e2e8f0" />
                        <Text style={styles.emptyText}>Find donors by selecting blood group and location.</Text>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            <SelectionList
                title={showSelection.type === 'blood' ? "Select Blood Group" : showSelection.type === 'state' ? "Select State" : "Select District"}
                data={showSelection.type === 'blood' ? bloodGroups : showSelection.type === 'state' ? Object.keys(stateDistrictMapping) : (stateDistrictMapping[state] || [])}
                onSelect={(val) => {
                    if (showSelection.type === 'blood') setBloodType(val);
                    else if (showSelection.type === 'state') { setState(val); setDistrict(""); }
                    else if (showSelection.type === 'district') setDistrict(val);
                }}
            />

            <DonorDetailsModal
                visible={showModal}
                donor={selectedDonor}
                onClose={() => setShowModal(false)}
            />
        </SafeAreaView>
    );
};

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        paddingTop: 20,
        paddingBottom: 30,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginTop: 4,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    searchPanel: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        marginBottom: 24,
    },
    gpsBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        padding: 16,
        borderRadius: 20,
        marginBottom: 20,
    },
    gpsInfo: {
        flex: 1,
    },
    gpsTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    gpsSubtitle: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
    },
    gpsBtn: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
    },
    form: {
        gap: 12,
    },
    label: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginLeft: 4,
    },
    dropdown: {
        height: 56,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    dropdownTextPlaceholder: {
        flex: 1,
        fontSize: 15,
        color: '#94a3b8',
    },
    dropdownTextActive: {
        flex: 1,
        fontSize: 15,
        color: '#1e293b',
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
    },
    inputWrapper: {
        height: 56,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        justifyContent: 'center',
    },
    input: {
        fontSize: 15,
        color: '#1e293b',
        fontWeight: '600',
    },
    searchBtn: {
        height: 60,
        backgroundColor: '#dc2626',
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 10,
        elevation: 8,
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    searchBtnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    resultsHeader: {
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    resultsTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    resultsList: {
        gap: 16,
    },
    donorCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    bloodBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    bloodText: {
        fontSize: 16,
        fontWeight: 'black',
    },
    matchTag: {
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    matchText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#166534',
    },
    donorName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1e293b',
        textTransform: 'uppercase',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    locationText: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 16,
        marginTop: 16,
        marginBottom: 16,
    },
    stat: {
        flex: 1,
        alignItems: 'center',
    },
    statVal: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    statLab: {
        fontSize: 9,
        color: '#64748b',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    statLine: {
        width: 1,
        height: 20,
        backgroundColor: '#e2e8f0',
    },
    cardActions: {
        flexDirection: 'row',
        gap: 10,
    },
    callSmall: {
        flex: 1,
        height: 44,
        backgroundColor: '#1e293b',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    callSmallText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    detailsSmall: {
        flex: 1,
        height: 44,
        backgroundColor: '#dc2626',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailsSmallText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 12,
        maxWidth: 240,
        fontWeight: '500',
    },
    selectionOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    selectionContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
    },
    selectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    selectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    selectionItem: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    selectionText: {
        fontSize: 16,
        color: '#334155',
        fontWeight: '500',
    },
});

export default SeekerScreen;
