import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MyOrganizationsModal = ({ visible, onClose, memberships = [] }) => {
    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Ionicons name="people" size={24} color="#8b5cf6" />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.orgName}>{item.org_name}</Text>
                    <Text style={styles.orgType}>{item.org_type}</Text>
                </View>
            </View>
            <View style={styles.footer}>
                <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={14} color="#6b7280" />
                    <Text style={styles.infoText}>{item.org_city}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                    <Text style={styles.infoText}>
                        Joined: {new Date(item.joined_at).toLocaleDateString()}
                    </Text>
                </View>
            </View>
            <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{item.role}</Text>
            </View>
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
                    <View style={styles.modalHeader}>
                        <Text style={styles.title}>My Organizations</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={28} color="#111827" />
                        </TouchableOpacity>
                    </View>

                    {memberships.length === 0 ? (
                        <View style={styles.center}>
                            <Ionicons name="people-outline" size={64} color="#d1d5db" />
                            <Text style={styles.emptyText}>You haven't joined any organizations yet.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={memberships}
                            renderItem={renderItem}
                            keyExtractor={(item, index) => index.toString()}
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
    modalHeader: {
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
    list: {
        padding: 24,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        position: 'relative',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#ede9fe',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    headerText: {
        flex: 1,
    },
    orgName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    orgType: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingTop: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: 'bold',
        marginLeft: 4,
    },
    roleBadge: {
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    roleText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
});

export default MyOrganizationsModal;
