import React, { useState, useEffect, useRef } from 'react';

const Chatbot = () => {
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
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
            const botResponse = getBotResponse(userMsg.text);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: 'bot',
                text: botResponse
            }]);
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
            const botResponse = getBotResponse(text);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: 'bot',
                text: botResponse
            }]);
            setIsTyping(false);
        }, 1000);
    };

    const getBotResponse = (input) => {
        const lowerInput = input.toLowerCase();

        // Logic for simple keyword matching
        if (lowerInput.includes("donate") || lowerInput.includes("schedule") || lowerInput.includes("appointment")) {
            return "To donate blood, please check the 'Events & Camps' section to find upcoming donation camps near you, or simply visit a nearby blood bank.";
        }
        if (lowerInput.includes("find") || lowerInput.includes("search") || lowerInput.includes("need blood")) {
            return "You can search for blood donors in the 'Find Blood' section. Filter by blood group and location to find available donors quickly.";
        }
        if (lowerInput.includes("profile") || lowerInput.includes("update") || lowerInput.includes("change")) {
            return "You can update your personal details, including your location and contact info, by clicking the 'Edit Profile' button on your dashboard.";
        }
        if (lowerInput.includes("certificate") || lowerInput.includes("badge")) {
            return "Donation certificates are generated automatically after your donation is verified by the camp organizer. You can download them from the 'Certificates' tab.";
        }
        if (lowerInput.includes("contact") || lowerInput.includes("support") || lowerInput.includes("help") || lowerInput.includes("issue")) {
            return "For any support or issues, you can reach out to us at ebloodbankoriginal@gmail.com or use the 'Contact Support' form in the sidebar.";
        }
        if (lowerInput.includes("hi") || lowerInput.includes("hello") || lowerInput.includes("hey")) {
            return "Hi there! How can I assist you in saving lives today? 🩸";
        }
        if (lowerInput.includes("bye") || lowerInput.includes("thanks") || lowerInput.includes("thank you")) {
            return "You're welcome! Thank you for being part of our life-saving community. Have a great day! 🌟";
        }

        return "I'm not quite sure about that. Could you try asking about 'Donating Blood', 'Finding Donors', or 'Managing Profile'?";
    };

    // Quick Reply Options
    const quickReplies = [
        "How do I donate?",
        "Find blood donors",
        "Update profile",
        "Contact support"
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
                <div className="bg-gradient-to-r from-red-600 to-pink-600 p-4 rounded-t-2xl flex items-center gap-3 shrink-0">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <i className="fas fa-robot text-white text-lg"></i>
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg leading-tight">eBloodBank Assistant</h3>
                        <p className="text-red-100 text-xs flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            Online
                        </p>
                    </div>
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
