import React from 'react';

const InfoModal = ({ title, content, onClose }) => {
    if (!content) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[250] flex items-center justify-center p-4 transition-all duration-300"
            onClick={onClose}
        >
            <div
                className="modern-card max-w-2xl w-full bg-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300 border-t-4 border-t-red-600"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-br from-red-50 to-white/50">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3 text-2xl">
                            <i className="fas fa-info-circle -rotate-3"></i>
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-gray-800 tracking-tight">
                                {title}
                            </h3>
                            <div className="h-1 w-16 bg-red-600/20 rounded-full mt-1"></div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-red-600 hover:text-white transition-all transform hover:rotate-90 shadow-sm border border-gray-100"
                        aria-label="Close modal"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="p-10 overflow-y-auto custom-scrollbar bg-white/80">
                    <div className="info-content-animate text-gray-600 leading-relaxed text-lg">
                        {typeof content === 'string' ? (
                            <p className="whitespace-pre-line font-medium text-gray-700">{content}</p>
                        ) : (
                            content
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InfoModal;
