import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    SafeAreaView,
    ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const SelectionScreen = ({ navigation }) => {
    return (
        <View style={styles.container}>
            <ImageBackground
                source={{ uri: 'https://images.unsplash.com/photo-1519032465794-2da0cebf0b63?auto=format&fit=crop&q=80&w=1000' }}
                style={styles.backgroundImage}
                blurRadius={2}
            >
                <LinearGradient
                    colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)', '#000000']}
                    style={styles.gradient}
                >
                    <SafeAreaView style={styles.content}>
                        <View style={styles.header}>
                            <View style={styles.logoContainer}>
                                <LinearGradient
                                    colors={['#dc2626', '#991b1b']}
                                    style={styles.logoGradient}
                                >
                                    <Ionicons name="water" size={60} color="white" />
                                </LinearGradient>
                            </View>
                            <Text style={styles.logoText}>eBloodBank</Text>
                            <Text style={styles.tagline}>Every drop counts, every donor is a hero.</Text>
                        </View>

                        <View style={styles.optionsContainer}>
                            <Text style={styles.welcomeText}>How can we help you today?</Text>

                            <TouchableOpacity
                                style={styles.optionCard}
                                onPress={() => navigation.navigate('Login')}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={['#ffffff', '#f8fafc']}
                                    style={styles.cardGradient}
                                >
                                    <View style={styles.cardIconContainer}>
                                        <Ionicons name="person-circle" size={40} color="#dc2626" />
                                    </View>
                                    <View style={styles.cardTextContainer}>
                                        <Text style={styles.cardTitle}>Donor Login</Text>
                                        <Text style={styles.cardSubtitle}>Access your dashboard, manage donations, and save lives.</Text>
                                    </View>
                                    <Ionicons name="arrow-forward" size={24} color="#dc2626" />
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.optionCard}
                                onPress={() => navigation.navigate('Seeker')}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={['#dc2626', '#991b1b']}
                                    style={styles.cardGradient}
                                >
                                    <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                        <Ionicons name="search" size={40} color="white" />
                                    </View>
                                    <View style={styles.cardTextContainer}>
                                        <Text style={[styles.cardTitle, { color: 'white' }]}>Find Blood</Text>
                                        <Text style={[styles.cardSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>Search for life-saving donors in your immediate vicinity.</Text>
                                    </View>
                                    <Ionicons name="arrow-forward" size={24} color="white" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Part of a global initiative to ensure blood availability.</Text>
                        </View>
                    </SafeAreaView>
                </LinearGradient>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    gradient: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'space-between',
        paddingVertical: 40,
    },
    header: {
        alignItems: 'center',
        marginTop: height * 0.05,
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 30,
        overflow: 'hidden',
        marginBottom: 20,
        elevation: 10,
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    logoGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: 'white',
        letterSpacing: 1,
    },
    tagline: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 10,
        textAlign: 'center',
        fontWeight: '500',
    },
    optionsContainer: {
        width: '100%',
        marginBottom: 40,
    },
    welcomeText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 24,
        textAlign: 'center',
    },
    optionCard: {
        width: '100%',
        height: 110,
        borderRadius: 24,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    cardIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTextContainer: {
        flex: 1,
        marginLeft: 16,
        marginRight: 8,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 4,
        lineHeight: 18,
    },
    footer: {
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
    },
});

export default SelectionScreen;
