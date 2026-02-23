import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

const SelectionScreen = ({ navigation }) => {
    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <LinearGradient
                            colors={['#ef4444', '#991b1b']}
                            style={styles.logoGradient}
                        >
                            <View style={styles.logoInnerShadow}>
                                <View style={styles.dropWrapper}>
                                    <MaterialCommunityIcons name="water" size={68} color="white" />
                                    <View style={styles.plusOverlay}>
                                        <MaterialCommunityIcons name="plus-thick" size={22} color="#dc2626" />
                                    </View>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>
                    <Text style={styles.logoText}>eBloodBank</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>COMMUNITY DRIVEN</Text>
                    </View>
                    <Text style={styles.tagline}>A drop of grace for a life in need.</Text>
                </View>

                <View style={styles.optionsContainer}>
                    <Text style={styles.welcomeText}>How would you like to help?</Text>

                    <TouchableOpacity
                        style={styles.optionCard}
                        onPress={() => navigation.navigate('Login')}
                        activeOpacity={0.9}
                    >
                        <BlurView intensity={Platform.OS === 'ios' ? 90 : 100} tint="light" style={styles.blurWrapper}>
                            <View style={styles.cardHeader}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="heart" size={24} color="#dc2626" />
                                </View>
                                <View style={styles.cardTitleContainer}>
                                    <Text style={styles.cardTitle}>Donor Portal</Text>
                                    <Text style={styles.cardSubtitle}>Save lives today</Text>
                                </View>
                            </View>
                            <Text style={styles.cardDesc}>Access your dashboard, manage donations, and view your impact summary.</Text>
                            <View style={styles.cardFooter}>
                                <Text style={styles.cardAction}>Get Started</Text>
                                <View style={styles.arrowCircle}>
                                    <Ionicons name="chevron-forward" size={14} color="white" />
                                </View>
                            </View>
                        </BlurView>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.optionCard}
                        onPress={() => navigation.navigate('Seeker')}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={['#ef4444', '#b91c1c']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.cardGradient}
                        >
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                    <Ionicons name="search" size={24} color="white" />
                                </View>
                                <View style={styles.cardTitleContainer}>
                                    <Text style={[styles.cardTitle, { color: 'white' }]}>Find Blood</Text>
                                    <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>Emergency request</Text>
                                </View>
                            </View>
                            <Text style={[styles.cardDesc, { color: 'rgba(255,255,255,0.9)' }]}>Instantly search for compatible donors and blood banks in your vicinity.</Text>
                            <View style={styles.cardFooter}>
                                <Text style={[styles.cardAction, { color: 'white' }]}>Locate Now</Text>
                                <View style={[styles.arrowCircle, { backgroundColor: 'white' }]}>
                                    <Ionicons name="chevron-forward" size={14} color="#dc2626" />
                                </View>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Secure • Verified • Community Powered</Text>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    content: {
        flex: 1,
        paddingHorizontal: 28,
        justifyContent: 'flex-start',
        paddingTop: Platform.OS === 'ios' ? 0 : 20,
        paddingBottom: 20,
    },
    header: {
        alignItems: 'center',
        marginTop: height * 0.02,
        marginBottom: 30,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 12,
        elevation: 15,
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(220, 38, 38, 0.1)',
    },
    logoGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoInnerShadow: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    dropWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 68,
        height: 68,
    },
    plusOverlay: {
        position: 'absolute',
        top: '40%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    plusIcon: {
        fontWeight: 'bold',
    },
    logoText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#dc2626',
        letterSpacing: -1,
    },
    badge: {
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 3,
        borderRadius: 100,
        marginTop: 4,
        borderWidth: 1,
        borderColor: 'rgba(220, 38, 38, 0.2)',
    },
    badgeText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#dc2626',
        letterSpacing: 2,
    },
    tagline: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 10,
        textAlign: 'center',
        fontWeight: '500',
    },
    optionsContainer: {
        width: '100%',
        gap: 16,
        marginTop: 10,
    },
    welcomeText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1e293b',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: -0.5,
        opacity: 0.8,
    },
    optionCard: {
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    blurWrapper: {
        padding: 20,
        backgroundColor: 'rgba(255,255,255,0.95)',
    },
    cardGradient: {
        padding: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: 'rgba(220, 38, 38, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitleContainer: {
        marginLeft: 14,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1e293b',
        letterSpacing: -0.5,
    },
    cardSubtitle: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 1,
    },
    cardDesc: {
        fontSize: 13,
        color: '#475569',
        lineHeight: 18,
        fontWeight: '500',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    cardAction: {
        fontSize: 13,
        fontWeight: '900',
        color: '#dc2626',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    arrowCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#dc2626',
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        alignItems: 'center',
        marginTop: 'auto',
        paddingBottom: 20,
    },
    footerText: {
        fontSize: 10,
        color: '#94a3b8',
        textAlign: 'center',
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
});

export default SelectionScreen;
