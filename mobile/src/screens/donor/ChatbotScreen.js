import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const ChatbotScreen = ({ navigation, route }) => {
    const { user, stats } = route.params || {};
    const [messages, setMessages] = useState([
        {
            id: 1,
            type: 'bot',
            text: "Hello! 👋 I'm your eBloodBank assistant. How can I help you today?"
        }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [lastBotIntent, setLastBotIntent] = useState(null);
    const scrollViewRef = useRef();

    const scrollToBottom = () => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    };

    const handleClearChat = () => {
        setMessages([
            {
                id: 1,
                type: 'bot',
                text: `History cleared! 👋 I'm ready for fresh life-saving questions, ${user?.full_name?.split(' ')[0] || 'friend'}. How can I assist you?`
            }
        ]);
        setLastBotIntent(null);
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const userMsg = {
            id: Date.now(),
            type: 'user',
            text: inputValue.trim()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsTyping(true);

        // Simulate network delay
        setTimeout(() => {
            const { text: botResponse, intent } = getBotResponse(userMsg.text);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: 'bot',
                text: botResponse
            }]);
            setLastBotIntent(intent);
            setIsTyping(false);
        }, 1000 + Math.random() * 1000);
    };

    const handleQuickReply = (text) => {
        const userMsg = {
            id: Date.now(),
            type: 'user',
            text: text
        };
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        setTimeout(() => {
            const { text: botResponse, intent } = getBotResponse(text);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: 'bot',
                text: botResponse
            }]);
            setLastBotIntent(intent);
            setIsTyping(false);
        }, 1000);
    };

    const getBotResponse = (input) => {
        const lowerInput = input.toLowerCase().trim();
        const userName = user?.full_name?.split(' ')[0] || 'friend';

        if (lastBotIntent === 'offer_profile_guide' && (lowerInput === 'yes' || lowerInput.includes('sure') || lowerInput.includes('yeah'))) {
            return {
                text: `Of course! 🗺️ Tap the profile icon at the top of the dashboard. Inside, you can update your 'Personal Info', 'Location', and 'Account Security'. Need anything else?`,
                intent: null
            };
        }

        if (lastBotIntent === 'offer_eligibility_check' && (lowerInput === 'yes' || lowerInput.includes('sure') || lowerInput.includes('yeah'))) {
            if (stats?.isEligible) {
                return {
                    text: `Analyzing your records... 🧬 Done! You are ELIGIBLE to donate. Your body has fully recovered from your last donation. Ready to schedule a visit?`,
                    intent: null
                };
            } else if (stats?.nextEligibleDate) {
                const diffDays = Math.ceil(Math.abs(new Date(stats.nextEligibleDate) - new Date()) / (1000 * 60 * 60 * 24));
                return {
                    text: `Checking your history... 🧪 I see you've been a hero recently! You need ${diffDays} more days for your body to fully replenish its life-saving power. Eligible on ${new Date(stats.nextEligibleDate).toLocaleDateString()}.`,
                    intent: null
                };
            }
        }

        if (lastBotIntent === 'offer_science_facts' && (lowerInput === 'yes' || lowerInput.includes('sure') || lowerInput.includes('yeah'))) {
            return {
                text: `Fascinating Facts: \n💉 Your body replaces lost plasma within 24 hours! \n🌟 One donation can save up to 3 separate lives. \n🩸 10% of your body weight is blood. \nReady to be a living, breathing miracle?`,
                intent: null
            };
        }

        if (lowerInput === 'no' || lowerInput.includes('nope') || lowerInput.includes('not now')) {
            return { text: "No problem! I'm here if you change your mind. 🩸", intent: null };
        }

        if (lowerInput.includes("eligible") || lowerInput.includes("can i donate") || lowerInput.includes("am i fit")) {
            if (stats?.isEligible) {
                return {
                    text: `Good news, ${userName}! 🌟 My analysis indicates you are ELIGIBLE to donate. Would you like me to check the exact details?`,
                    intent: 'offer_eligibility_check'
                };
            } else if (stats?.nextEligibleDate) {
                return {
                    text: `My systems show you're on a recovery break, ${userName}. ⏳ I can calculate exactly how many days are left if you'd like?`,
                    intent: 'offer_eligibility_check'
                };
            }
        }

        if (lowerInput.includes("compatibility") || lowerInput.includes("group") || lowerInput.includes("receiver")) {
            return {
                text: `Understanding Compatibility: \n• O- can give to anyone (Universal Donor).\n• AB+ can receive from anyone.\n• You are ${user?.blood_type || 'a hero'}. Would you like more science facts?`,
                intent: 'offer_science_facts'
            };
        }

        if (lowerInput.includes("profile") || lowerInput.includes("update") || lowerInput.includes("password")) {
            return {
                text: `You can update your account and security settings. Need a quick guide on where to find it?`,
                intent: 'offer_profile_guide'
            };
        }

        if (lowerInput.includes("hi") || lowerInput.includes("hello") || lowerInput.includes("hey")) {
            return { text: `Hello, ${userName}! 👋 I'm your AI assistant. I can help with eligibility, compatibility, or profile management. what's on your mind?`, intent: null };
        }

        return {
            text: `I'm not 100% sure, but you might be asking about 'Eligibility', 'Compatibility', or 'Managing Profile'. Try typing one of those!`,
            intent: null
        };
    };

    const quickReplies = [
        "Am I eligible?",
        "Blood compatibility",
        "How to donate?",
        "Update profile"
    ];

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#dc2626', '#991b1b']} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>AI Assistant</Text>
                    <View style={styles.statusContainer}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Online</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={handleClearChat} style={styles.clearButton}>
                    <Ionicons name="trash-outline" size={20} color="white" />
                </TouchableOpacity>
            </LinearGradient>

            <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesPadding}
                onContentSizeChange={scrollToBottom}
            >
                {messages.map((msg) => (
                    <View
                        key={msg.id}
                        style={[
                            styles.messageWrapper,
                            msg.type === 'user' ? styles.userWrapper : styles.botWrapper
                        ]}
                    >
                        {msg.type === 'bot' && (
                            <View style={styles.botIconContainer}>
                                <FontAwesome5 name="robot" size={16} color="#dc2626" />
                            </View>
                        )}
                        <View
                            style={[
                                styles.messageBubble,
                                msg.type === 'user' ? styles.userBubble : styles.botBubble
                            ]}
                        >
                            <Text style={[
                                styles.messageText,
                                msg.type === 'user' ? styles.userText : styles.botText
                            ]}>
                                {msg.text}
                            </Text>
                        </View>
                    </View>
                ))}

                {isTyping && (
                    <View style={styles.botWrapper}>
                        <View style={styles.botIconContainer}>
                            <FontAwesome5 name="robot" size={16} color="#dc2626" />
                        </View>
                        <View style={[styles.messageBubble, styles.botBubble, styles.typingBubble]}>
                            <ActivityIndicator size="small" color="#dc2626" />
                        </View>
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                {!isTyping && messages[messages.length - 1]?.type === 'bot' && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRepliesContainer}>
                        {quickReplies.map((reply, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => handleQuickReply(reply)}
                                style={styles.quickReply}
                            >
                                <Text style={styles.quickReplyText}>{reply}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
                >
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            value={inputValue}
                            onChangeText={setInputValue}
                            placeholderTextColor="#9ca3af"
                        />
                        <TouchableOpacity
                            onPress={handleSendMessage}
                            disabled={!inputValue.trim() || isTyping}
                            style={[
                                styles.sendButton,
                                (!inputValue.trim() || isTyping) && styles.sendButtonDisabled
                            ]}
                        >
                            <Ionicons name="send" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        elevation: 4,
    },
    backButton: {
        padding: 5,
    },
    headerTitleContainer: {
        flex: 1,
        marginLeft: 15,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4ade80',
        marginRight: 5,
    },
    statusText: {
        color: '#fca5a5',
        fontSize: 12,
        fontWeight: 'bold',
    },
    clearButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
    },
    messagesContainer: {
        flex: 1,
    },
    messagesPadding: {
        padding: 20,
        paddingBottom: 10,
    },
    messageWrapper: {
        flexDirection: 'row',
        marginBottom: 16,
        maxWidth: '85%',
    },
    userWrapper: {
        alignSelf: 'flex-end',
        justifyContent: 'flex-end',
    },
    botWrapper: {
        alignSelf: 'flex-start',
    },
    botIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#fee2e2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
        marginTop: 4,
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    messageBubble: {
        padding: 12,
        borderRadius: 20,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    userBubble: {
        backgroundColor: '#dc2626',
        borderTopRightRadius: 0,
    },
    botBubble: {
        backgroundColor: 'white',
        borderTopLeftRadius: 0,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    typingBubble: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    messageText: {
        fontSize: 14,
        lineHeight: 20,
    },
    userText: {
        color: 'white',
        fontWeight: '500',
    },
    botText: {
        color: '#374151',
    },
    footer: {
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        paddingBottom: Platform.OS === 'ios' ? 0 : 10,
    },
    quickRepliesContainer: {
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: '#f9fafb',
    },
    quickReply: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#fecaca',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        elevation: 2,
    },
    quickReplyText: {
        color: '#dc2626',
        fontSize: 12,
        fontWeight: 'bold',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    input: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        borderRadius: 25,
        paddingHorizontal: 20,
        height: 48,
        fontSize: 14,
        color: '#1f2937',
        fontWeight: 'bold',
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#dc2626',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
        elevation: 4,
    },
    sendButtonDisabled: {
        backgroundColor: '#fca5a5',
        elevation: 0,
    },
});

export default ChatbotScreen;
