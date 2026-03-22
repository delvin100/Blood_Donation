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
    Linking,
    Dimensions,
    Modal,
    FlatList,
    BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import apiService from '../../api/apiService';
import DonorDetailsModal from '../../components/seeker/DonorDetailsModal';
import { stateDistrictMapping, cityToDistrictMapping, districtAliases } from '../../utils/locationData';

const { width } = Dimensions.get('window');

// Location mapping imported from utils/locationData.js

const bloodGroups = ["A+", "A-", "A1+", "A1-", "A1B+", "A1B-", "A2+", "A2-", "A2B+", "A2B-", "AB+", "AB-", "B+", "B-", "Bombay Blood Group", "INRA", "O+", "O-"];

const DonorCard = ({ item, onDetails }) => (
    <TouchableOpacity
        style={styles.donorCard}
        onPress={() => onDetails(item)}
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
                onPress={() => onDetails(item)}
            >
                <Text style={styles.detailsSmallText}>Details</Text>
            </TouchableOpacity>
        </View>
    </TouchableOpacity>
);

const SelectionList = ({ visible, data, onSelect, title, onClose }) => (
    <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={onClose}
    >
        <View style={styles.selectionOverlay}>
            <View style={styles.selectionContent}>
                <View style={styles.selectionHeader}>
                    <Text style={styles.selectionTitle}>{title}</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#64748b" />
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={data}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.selectionItem}
                            onPress={() => onSelect(item)}
                        >
                            <Text style={styles.selectionText}>{item}</Text>
                        </TouchableOpacity>
                    )}
                    style={{ flex: 1 }}
                />
            </View>
        </View>
    </Modal>
);

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

    useEffect(() => {
        const backAction = () => {
            if (showModal) {
                setShowModal(false);
                return true;
            }
            if (showSelection.visible) {
                setShowSelection({ ...showSelection, visible: false });
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [showModal, showSelection]);

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
                const detectedCity = geo.city || geo.subregion || geo.district || "";
                setCity(detectedCity);

                const matchedState = Object.keys(stateDistrictMapping).find(s =>
                    s.toLowerCase() === geo.region?.toLowerCase() ||
                    s.toLowerCase().includes(geo.region?.toLowerCase()) ||
                    geo.region?.toLowerCase().includes(s.toLowerCase())
                );

                if (matchedState) {
                    setState(matchedState);
                    const validDistricts = stateDistrictMapping[matchedState] || [];
                    const clean = (s) => (s || "").toLowerCase().replace(/district/g, "").trim();

                    let matchedDistrict = "";
                    if (detectedCity) {
                        const cityLower = detectedCity.toLowerCase();
                        const mappingKey = Object.keys(cityToDistrictMapping).find(k => k.toLowerCase() === cityLower);
                        if (mappingKey) {
                            matchedDistrict = cityToDistrictMapping[mappingKey];
                        }
                    }

                    if (!matchedDistrict) {
                        const possibleSources = [geo.subregion, geo.district, geo.city].filter(Boolean);
                        for (const source of possibleSources) {
                            const sourceClean = clean(source);

                            // 1. Alias
                            if (districtAliases[source]) {
                                const alias = districtAliases[source];
                                if (validDistricts.includes(alias)) {
                                    matchedDistrict = alias;
                                    break;
                                }
                            }

                            // 2. Direct
                            const found = validDistricts.find(d => {
                                const dClean = clean(d);
                                return dClean === sourceClean || sourceClean.includes(dClean) || dClean.includes(sourceClean);
                            });
                            if (found) {
                                matchedDistrict = found;
                                break;
                            }
                        }
                    }

                    setDistrict(""); // Reset
                    if (matchedDistrict) {
                        setTimeout(() => setDistrict(matchedDistrict), 500);
                    }
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
            const params = { blood_type: bloodType, lat: lat, lng: lng, city: city, district: district };
            const response = await apiService.get('/seeker/smart-match', { params });
            setDonors(response.data);
            if (response.data.length === 0) Alert.alert('No Donors Found', 'Try expanding your search criteria.');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to search donors. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

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
                        <TouchableOpacity style={styles.gpsBtn} onPress={fetchLocation} disabled={isFetchingLocation}>
                            {isFetchingLocation ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="navigate" size={20} color="white" />}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.form}>
                        <Text style={styles.label}>Select Blood Group</Text>
                        <TouchableOpacity style={styles.dropdown} onPress={() => setShowSelection({ type: 'blood', visible: true })}>
                            <Text style={bloodType ? styles.dropdownTextActive : styles.dropdownTextPlaceholder}>{bloodType || "Select Blood Group"}</Text>
                            <Ionicons name="chevron-down" size={20} color="#64748b" />
                        </TouchableOpacity>

                        <View style={styles.row}>
                            <View style={[styles.formItem, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>State</Text>
                                <TouchableOpacity style={styles.dropdown} onPress={() => setShowSelection({ type: 'state', visible: true })}>
                                    <Text style={state ? styles.dropdownTextActive : styles.dropdownTextPlaceholder} numberOfLines={1}>{state || "Select State"}</Text>
                                    <Ionicons name="chevron-down" size={16} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.formItem, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.label}>District</Text>
                                <TouchableOpacity style={[styles.dropdown, !state && { opacity: 0.5 }]} disabled={!state} onPress={() => setShowSelection({ type: 'district', visible: true })}>
                                    <Text style={district ? styles.dropdownTextActive : styles.dropdownTextPlaceholder} numberOfLines={1}>{district || "Select District"}</Text>
                                    <Ionicons name="chevron-down" size={16} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text style={styles.label}>City/Town</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput style={styles.input} placeholder="Enter city name" value={city} onChangeText={setCity} placeholderTextColor="#6b7280" />
                        </View>

                        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> : <><Ionicons name="search" size={20} color="white" /><Text style={styles.searchBtnText}>Search Heroes</Text></>}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.resultsHeader}><Text style={styles.resultsTitle}>{donors.length > 0 ? `Found ${donors.length} Potential Heroes` : "Search Results"}</Text></View>

                {donors.length > 0 ? (
                    <View style={styles.resultsList}>
                        {donors.map((item) => (
                            <DonorCard key={item.id} item={item} onDetails={(d) => { setSelectedDonor(d); setShowModal(true); }} />
                        ))}
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
                visible={showSelection.visible}
                title={showSelection.type === 'blood' ? "Select Blood Group" : showSelection.type === 'state' ? "Select State" : "Select District"}
                data={showSelection.type === 'blood' ? bloodGroups : showSelection.type === 'state' ? Object.keys(stateDistrictMapping) : (stateDistrictMapping[state] || [])}
                onClose={() => setShowSelection({ ...showSelection, visible: false })}
                onSelect={(val) => {
                    if (showSelection.type === 'blood') setBloodType(val);
                    else if (showSelection.type === 'state') { setState(val); setDistrict(""); }
                    else if (showSelection.type === 'district') setDistrict(val);
                    setShowSelection({ ...showSelection, visible: false });
                }}
            />

            <DonorDetailsModal visible={showModal} donor={selectedDonor} onClose={() => setShowModal(false)} />
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
        color: '#6b7280',
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
        backgroundColor: 'white',
    },
    selectionContent: {
        flex: 1,
        padding: 24,
        paddingTop: 60, // Account for status bar
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
