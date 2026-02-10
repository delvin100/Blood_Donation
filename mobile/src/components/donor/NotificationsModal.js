import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

const NotificationsModal = ({ visible, onClose, notifications, onMarkAsRead, onMarkAllRead }) => {
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <SafeAreaView style={styles.modalContent}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Notifications</Text>
                            <Text style={styles.subtitle}>{notifications.filter(n => !n.is_read).length} Unread</Text>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity onPress={onMarkAllRead} style={styles.markAllBtn}>
                                <Text style={styles.markAllText}>Mark all read</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="#1f2937" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <ScrollView
                        style={styles.notificationList}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                    >
                        {notifications.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={styles.emptyIconContainer}>
                                    <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
                                </View>
                                <Text style={styles.emptyText}>No notifications yet</Text>
                            </View>
                        ) : (
                            notifications.map((notification) => (
                                <TouchableOpacity
                                    key={notification.id}
                                    style={[styles.notificationItem, !notification.is_read && styles.unreadItem]}
                                    onPress={() => onMarkAsRead(notification.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: notification.type === 'Emergency' ? '#fee2e2' : '#f3f4f6' }]}>
                                        <Ionicons
                                            name={notification.type === 'Emergency' ? 'alert-circle' : 'notifications'}
                                            size={20}
                                            color={notification.type === 'Emergency' ? '#dc2626' : '#6b7280'}
                                        />
                                    </View>
                                    <View style={styles.textContainer}>
                                        <Text style={styles.notificationTitle}>{notification.title}</Text>
                                        <Text style={styles.notificationMessage}>{notification.message}</Text>
                                        <Text style={styles.notificationTime}>
                                            {new Date(notification.created_at).toLocaleString()}
                                        </Text>
                                    </View>
                                    {!notification.is_read && <View style={styles.unreadDot} />}
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
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
    modalContent: {
        backgroundColor: 'white',
        flex: 1,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1f2937',
    },
    subtitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6b7280',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    markAllBtn: {
        marginRight: 16,
    },
    markAllText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#dc2626',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    notificationList: {
        flex: 1,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        backgroundColor: 'white',
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
    },
    unreadItem: {
        backgroundColor: '#f9fafb',
        borderColor: '#fecaca',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    notificationMessage: {
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 18,
    },
    notificationTime: {
        fontSize: 10,
        color: '#9ca3af',
        marginTop: 8,
        fontWeight: 'bold',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#dc2626',
        marginTop: 6,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#9ca3af',
    },
});

export default NotificationsModal;
