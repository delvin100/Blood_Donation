import React from 'react';

const InfoModal = ({ title, content, onClose, maxWidth = "max-w-2xl" }) => {
    if (!content) return null;

    return (
        <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[250] flex items-center justify-center p-4 transition-all duration-300"
            onClick={onClose}
        >
            <div
                className={`modern-card ${maxWidth} w-full bg-white shadow-[0_30px_70px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 rounded-[3rem] border-0`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header - Refined Premium Style matching Image 766 */}
                <div className={`${title === 'eBloodBank Mobile' ? 'px-8 py-4' : 'px-10 py-8'} flex items-center justify-between bg-white`}>
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-200 shrink-0">
                            <i className="fas fa-info text-xl"></i>
                        </div>
                        <div>
                            <h3 className={`${title === 'eBloodBank Mobile' ? 'text-2xl' : 'text-3xl'} font-black text-gray-900 tracking-tight`}>
                                {title}
                            </h3>
                            <div className="h-1 w-12 bg-red-600 rounded-full mt-1.5"></div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all shadow-sm border border-gray-100"
                        aria-label="Close modal"
                    >
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>

                <div className={`${title === 'eBloodBank Mobile' ? 'p-2' : 'p-2 md:p-6'} overflow-y-auto custom-scrollbar bg-white`}>
                    <div className="info-content-animate text-gray-600 leading-relaxed">
                        {typeof content === 'string' ? (
                            <p className="whitespace-pre-line font-medium text-gray-700 p-10">{content}</p>
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
