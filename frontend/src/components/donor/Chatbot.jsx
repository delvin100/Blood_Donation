import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

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
        if (e) e.preventDefault();
        if (!inputValue.trim() || isTyping) return;

        const messageText = inputValue.trim();
        const userMsg = {
            id: Date.now(),
            type: 'user',
            text: messageText
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue("");
        setIsTyping(true);

        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
            const res = await axios.post('/api/donor/chat', {
                message: messageText,
                history: messages.slice(-10),
                lastIntent: lastBotIntent,
                context: {
                    bloodType: user?.blood_type,
                    isEligible: stats?.isEligible,
                    nextEligibleDate: stats?.nextEligibleDate
                }
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                type: 'bot',
                text: res.data.text
            }]);
            setLastBotIntent(res.data.intent);
        } catch (err) {
            console.error('Chat error:', err);

            // Check if it's a quota error (429)
            if (err.response?.status === 429) {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    type: 'bot',
                    text: err.response.data.text || "AI Quota Exceeded. I can still help with Eligibility and Compatibility! 🤖"
                }]);
            } else {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    type: 'bot',
                    text: "I'm having trouble connecting to my brain right now. Please try again in a moment! 🤖"
                }]);
            }
        } finally {
            setIsTyping(false);
        }
    };

    const handleQuickReply = (text) => {
        setInputValue(text);
        setTimeout(() => handleSendMessage(), 0);
    };

    // Quick Reply Options
    const quickReplies = [
        "Am I eligible?",
        "Blood compatibility",
        "How to donate?",
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
