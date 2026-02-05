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
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../api/apiService';

const UrgentNeedsModal = ({ visible, onClose }) => {
    const [needs, setNeeds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUrgentNeeds = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiService.get('/donor/urgent-needs');
            setNeeds(response.data);
        } catch (err) {
            setError('Failed to fetch urgent needs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (visible) {
            fetchUrgentNeeds();
        }
    }, [visible]);

    const handleCall = (phone) => {
        Linking.openURL(`tel:${phone}`);
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.bloodBadge}>
                    <Text style={styles.bloodText}>{item.blood_group}</Text>
                </View>
                <Text style={styles.orgName}>{item.org_name}</Text>
            </View>
            <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color="#6b7280" />
                    <Text style={styles.infoText}>{item.org_city}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                    <Text style={[styles.infoText, { color: '#ef4444', fontWeight: '700' }]}>
                        Urgency: {item.urgency_level}
                    </Text>
                </View>
                <Text style={styles.notes}>{item.notes}</Text>
            </View>
            <TouchableOpacity
                style={styles.callBtn}
                onPress={() => handleCall(item.org_phone)}
            >
                <Ionicons name="call" size={20} color="white" />
                <Text style={styles.callBtnText}>Contact Hospital</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Urgent Needs</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color="#111827" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#dc2626" style={styles.loader} />
                    ) : error ? (
                        <View style={styles.center}>
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity onPress={fetchUrgentNeeds} style={styles.retryBtn}>
                                <Text style={styles.retryText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : needs.length === 0 ? (
                        <View style={styles.center}>
                            <Ionicons name="heart-outline" size={64} color="#d1d5db" />
                            <Text style={styles.emptyText}>No urgent requests in your area right now.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={needs}
                            renderItem={renderItem}
                            keyExtractor={(item) => item.id.toString()}
                            contentContainerStyle={styles.list}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: '#f9fafb',
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
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
    emptyText: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        fontWeight: 'normal',
        marginTop: 16,
    },
    errorText: {
        color: '#ef4444',
        textAlign: 'center',
        marginBottom: 16,
    },
    retryBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#dc2626',
        borderRadius: 10,
    },
    retryText: {
        color: 'white',
        fontWeight: 'bold',
    },
    list: {
        padding: 24,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    bloodBadge: {
        backgroundColor: '#fee2e2',
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    bloodText: {
        color: '#dc2626',
        fontSize: 16,
        fontWeight: 'bold',
    },
    orgName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        flex: 1,
    },
    cardBody: {
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    notes: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 20,
        marginTop: 8,
    },
    callBtn: {
        flexDirection: 'row',
        height: 52,
        backgroundColor: '#dc2626',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 2,
    },
    callBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
});

export default UrgentNeedsModal;
