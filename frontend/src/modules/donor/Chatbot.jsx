import React, { useState, useEffect, useRef } from 'react';

const Chatbot = ({ user, stats }) => {
    const [isOpen, setIsOpen] = useState(false);
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
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, isOpen]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const userMsg = {
            id: Date.now(),
            type: 'user',
            text: inputValue.trim()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsTyping(true);

        // Simulate network delay and processing
        setTimeout(() => {
            const { text: botResponse, intent } = getBotResponse(userMsg.text);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: 'bot',
                text: botResponse
            }]);
            setLastBotIntent(intent);
            setIsTyping(false);
        }, 1000 + Math.random() * 1000); // 1-2s delay
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

        // --- CONTEXTUAL HANDLING (Conversational Memory) ---
        if (lastBotIntent === 'offer_profile_guide' && (lowerInput === 'yes' || lowerInput.includes('sure') || lowerInput.includes('yeah'))) {
            return {
                text: `Of course! 🗺️ Click on 'Edit Profile'. Inside, you'll find specialized sections for 'Personal Info', 'Location', and 'Account Security'. Need anything else?`,
                intent: null
            };
        }

        if (lastBotIntent === 'offer_eligibility_check' && (lowerInput === 'yes' || lowerInput.includes('sure') || lowerInput.includes('yeah'))) {
            // Trigger the actual check logic
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

        // --- KEYWORD MATCHING ---

        // 1. Personalized Eligibility
        if (lowerInput.includes("eligible") || lowerInput.includes("can i donate") || lowerInput.includes("am i fit") || lowerInput === "eligibility") {
            if (stats?.isEligible) {
                return {
                    text: `Good news, ${userName}! 🌟 My analysis indicates you are ELIGIBLE to donate. Would you like me to check the exact details of your last donation?`,
                    intent: 'offer_eligibility_check'
                };
            } else if (stats?.nextEligibleDate) {
                return {
                    text: `My systems show you're on a recovery break, ${userName}. ⏳ I can calculate exactly how many days are left if you'd like?`,
                    intent: 'offer_eligibility_check'
                };
            }
            return {
                text: `Checking general rules for you... 🧐 Are you 18-65 and over 45kg? If yes, you might be eligible! Want a personalized check of your records?`,
                intent: 'offer_eligibility_check'
            };
        }

        // 2. Compatibility & Science
        if (lowerInput.includes("compatibility") || lowerInput.includes("group") || lowerInput.includes("receiver") || lowerInput.includes("universal") || lowerInput === "compatibility") {
            return {
                text: `Understanding Compatibility: \n• O- can give to anyone (Universal Donor).\n• AB+ can receive from anyone.\n• You are ${user?.blood_type || 'a hero'}. Would you like more science facts about your blood type?`,
                intent: 'offer_science_facts'
            };
        }

        // 3. Managing Profile & Security
        if (lowerInput.includes("profile") || lowerInput.includes("update") || lowerInput.includes("password") || lowerInput === "managing profile" || lowerInput === "manage profile") {
            return {
                text: `You can update your account, location, and security settings in 'Edit Profile'. Need a quick guide on where to find it?`,
                intent: 'offer_profile_guide'
            };
        }

        // 4. Personal Context
        if (lowerInput.includes("my blood group") || lowerInput.includes("my type")) {
            return {
                text: user?.blood_type
                    ? `Your registered blood type is ${user.blood_type}. ${user.blood_type.includes('-') ? 'Being Rhesus negative makes you a very rare and vital donor! 🌟' : 'Awesome group to have! ✨'}`
                    : "I don't have your blood type on record. Should I show you how to add it in your profile?",
                intent: !user?.blood_type ? 'offer_profile_guide' : null
            };
        }

        // 5. Normal Actions
        if (lowerInput.includes("donate") || lowerInput.includes("camp") || lowerInput.includes("how to")) {
            return { text: `The donation journey: \n1. Locate a camp \n2. Confirm eligibility \n3. Donate \n4. Rest. Ready to save lives today?`, intent: null };
        }

        if (lowerInput.includes("emergency") || lowerInput.includes("urgent")) {
            return { text: "🚨 CRITICAL: Use the 'Find Blood' tool immediately and filter for 'Available' donors nearby. Every second counts!", intent: null };
        }

        if (lowerInput.includes("hi") || lowerInput.includes("hello") || lowerInput.includes("hey") || lowerInput.includes("assistant")) {
            const hour = new Date().getHours();
            const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
            return { text: `${timeGreeting}, ${userName}! 👋 I'm your AI assistant. I can help with eligibility, compatibility, or profile management. What's on your mind?`, intent: null };
        }

        if (lowerInput.includes("bye") || lowerInput.includes("thanks") || lowerInput.includes("thank you")) {
            return { text: `My pleasure, ${userName}! Stay heroic. 🌟`, intent: null };
        }

        return {
            text: `I'm analyzing your request... 🧠 I'm not 100% sure, but you might be asking about 'Eligibility', 'Compatibility', or 'Managing Profile'. Try typing one of those or using the quick replies!`,
            intent: null
        };
    };

    // Quick Reply Options
    const quickReplies = [
        "Am I eligible?",
        "Blood compatibility",
        "How to donate?",
        "Post-donation care",
        "Emergency help",
        "Update profile"
    ];

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-8 right-8 z-[9999] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300/50 ${isOpen ? 'bg-gray-900 rotate-90' : 'bg-gradient-to-br from-red-600 to-red-700'}`}
                aria-label="Toggle Chat"
            >
                {isOpen ? (
                    <i className="fas fa-times text-xl text-white"></i>
                ) : (
                    <i className="fas fa-robot text-2xl text-white"></i>
                )}
            </button>

            {/* Chat Window */}
            <div
                className={`fixed bottom-28 right-6 z-[9998] w-[90vw] max-w-[380px] bg-white rounded-2xl shadow-2xl flex flex-col transition-all duration-300 origin-bottom-right border border-gray-100 ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-10 pointer-events-none'}`}
                style={{ height: 'min(600px, 70vh)' }}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-red-600 to-pink-600 p-4 rounded-t-2xl flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <i className="fas fa-robot text-white text-lg"></i>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg leading-tight">AI Assistant</h3>
                            <p className="text-red-100 text-xs flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                Online
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClearChat}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                        title="Clear History"
                    >
                        <i className="fas fa-trash-alt text-xs"></i>
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 custom-scrollbar">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.type === 'bot' && (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 to-pink-100 border border-red-200 flex items-center justify-center mr-2 mt-1 shrink-0">
                                    <i className="fas fa-robot text-red-500 text-xs"></i>
                                </div>
                            )}
                            <div
                                className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.type === 'user'
                                    ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-tr-none'
                                    : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                                    }`}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 to-pink-100 border border-red-200 flex items-center justify-center mr-2 mt-1 shrink-0">
                                <i className="fas fa-robot text-red-500 text-xs"></i>
                            </div>
                            <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Replies (Only show if not typing and last message is from bot) */}
                {!isTyping && messages[messages.length - 1]?.type === 'bot' && (
                    <div className="px-4 py-2 bg-gray-50 flex gap-2 overflow-x-auto no-scrollbar mask-gradient">
                        {quickReplies.map((reply, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleQuickReply(reply)}
                                className="whitespace-nowrap px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-semibold rounded-full hover:bg-red-50 transition-colors shadow-sm"
                            >
                                {reply}
                            </button>
                        ))}
                    </div>
                )}

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 bg-white rounded-b-2xl">
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Type a message..."
                            className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all font-medium text-sm text-gray-700 placeholder-gray-400"
                        />
                        <button
                            type="submit"
                            disabled={!inputValue.trim() || isTyping}
                            className="absolute right-2 p-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none transition-all duration-200 w-9 h-9 flex items-center justify-center"
                        >
                            <i className="fas fa-paper-plane text-xs"></i>
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default Chatbot;
