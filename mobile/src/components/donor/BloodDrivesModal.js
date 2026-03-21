import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Linking,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import apiService from '../../api/apiService';
import { logError } from '../../utils/errors';
import { formatDate } from '../../utils/dateUtils';

const { width } = Dimensions.get('window');

const BloodDrivesModal = ({ visible, onClose }) => {
    const [drives, setDrives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchBloodDrives = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiService.get('/donor/blood-drives');
            setDrives(response.data);
        } catch (err) {
            setError('Failed to fetch upcoming camps');
            logError('Blood Drives Fetch', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible) {
            fetchBloodDrives();
        }
    }, [visible]);

    const handleCall = (phone) => {
        Linking.openURL(`tel:${phone}`);
    };

    const renderItem = ({ item }) => {
        const now = new Date();
        
        // Robust date parsing (similar to website)
        const parseSafe = (dStr, tStr) => {
            const d = new Date(dStr);
            if (isNaN(d.getTime())) return new Date(NaN);
            const [h, m] = tStr.split(':').map(Number);
            return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m);
        };

        const start = parseSafe(item.start_date, item.start_time);
        const end = parseSafe(item.end_date, item.end_time);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
        if (now > end) return null;

        let dynamicStatus = 'Upcoming';
        let statusColor = '#3b82f6';
        
        if (now >= start) {
            dynamicStatus = 'Active';
            statusColor = '#10b981';
        }

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.headerInfo}>
                        <Text style={styles.eventName}>{item.event_name}</Text>
                        <View style={styles.orgBadge}>
                            <Ionicons name="business" size={12} color="#6366f1" />
                            <Text style={styles.orgName}>{item.org_name}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.statusText}>{dynamicStatus}</Text>
                    </View>
                </View>

                <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                        <View style={styles.detailTitleContainer}>
                            <Ionicons name="calendar-outline" size={14} color="#ef4444" />
                            <Text style={styles.detailTitle}>Schedule</Text>
                        </View>
                        <Text style={styles.detailValue}>
                            {formatDate(item.start_date)} - {formatDate(item.end_date)}
                        </Text>
                        <Text style={styles.detailValueSmall}>
                            {item.start_time.substring(0, 5)} to {item.end_time.substring(0, 5)}
                        </Text>
                    </View>

                    <View style={styles.detailItem}>
                        <View style={styles.detailTitleContainer}>
                            <Ionicons name="location-outline" size={14} color="#ef4444" />
                            <Text style={styles.detailTitle}>Location</Text>
                        </View>
                        <Text style={styles.detailValue}>{item.location}</Text>
                        <Text style={styles.detailValueSmall}>{item.org_city}, {item.org_district}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => handleCall(item.org_phone)}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#111827', '#000000']}
                        style={styles.callBtnGradient}
                    >
                        <Ionicons name="call" size={18} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.callBtnText}>{item.org_phone || 'Call Organizer'}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <SafeAreaView style={styles.content}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Blood Camps</Text>
                            <Text style={styles.subtitle}>Community Events</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#1f2937" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#dc2626" style={styles.loader} />
                    ) : error ? (
                        <View style={styles.center}>
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity onPress={fetchBloodDrives} style={styles.retryBtn}>
                                <Text style={styles.retryText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : drives.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <LinearGradient
                                colors={['#fdf2f2', '#fff1f2', '#fdf2f2']}
                                style={styles.emptyCard}
                            >
                                <View style={styles.emptyIconContainer}>
                                    <FontAwesome5 name="calendar-times" size={48} color="#dc2626" />
                                </View>
                                <Text style={styles.emptyTitle}>No Camps</Text>
                                <Text style={styles.emptySubtitle}>Stay Tuned</Text>
                                <Text style={styles.emptyDesc}>
                                    Check back soon for upcoming donation camps in your area.
                                </Text>
                            </LinearGradient>
                        </View>
                    ) : (
                        <FlatList
                            data={drives}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.id.toString()}
                            contentContainerStyle={styles.list}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    content: {
        backgroundColor: '#f9fafb',
        flex: 1,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: '#111827',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#dc2626',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 4,
    },
    closeBtn: {
        padding: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
    },
    loader: {
        flex: 1,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    list: {
        padding: 20,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#f3f4f6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    headerInfo: {
        flex: 1,
        marginRight: 10,
    },
    eventName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 6,
    },
    orgBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f3ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    orgName: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#6366f1',
        marginLeft: 5,
        textTransform: 'uppercase',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    statusText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detailsGrid: {
        marginBottom: 24,
    },
    detailItem: {
        marginBottom: 16,
    },
    detailTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    detailTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: 6,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    detailValueSmall: {
        fontSize: 11,
        color: '#6b7280',
        marginTop: 2,
        fontWeight: '500',
    },
    callBtn: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    callBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    callBtnText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    emptyContainer: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    emptyCard: {
        padding: 40,
        borderRadius: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fee2e2',
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        backgroundColor: 'white',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    emptyTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#7f1d1d',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#dc2626',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 16,
    },
    emptyDesc: {
        fontSize: 14,
        color: '#991b1b',
        textAlign: 'center',
        lineHeight: 22,
        opacity: 0.8,
        fontWeight: '500',
    },
    errorText: {
        color: '#dc2626',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    retryBtn: {
        backgroundColor: '#dc2626',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    retryText: {
        color: 'white',
        fontWeight: 'bold',
    },
});

export default BloodDrivesModal;
