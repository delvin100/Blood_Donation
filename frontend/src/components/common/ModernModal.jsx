import React from 'react';
import '../../assets/css/modern-modal.css';

const ModernModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "info", // "info", "warning", "danger", "prompt"
    inputValue = "",
    onInputChange = () => { },
    placeholder = ""
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger': return '⚠️';
            case 'warning': return '🔔';
            case 'prompt': return '✍️';
            default: return 'ℹ️';
        }
    };

    return (
        <div className="modal-overlay">
            <div className={`modern-modal-content animate-pop ${type}`}>
                <div className="modal-header">
                    <span className="modal-icon">{getIcon()}</span>
                    <h3>{title}</h3>
                </div>
                <div className="modal-body">
                    <p>{message}</p>
                    {type === 'prompt' && (
                        <input
                            type="text"
                            className="modal-input"
                            value={inputValue}
                            onChange={(e) => onInputChange(e.target.value)}
                            placeholder={placeholder}
                            autoFocus
                        />
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn-modal-cancel" onClick={onClose}>{cancelText}</button>
                    <button
                        className={`btn-modal-confirm ${type === 'danger' ? 'danger' : ''}`}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModernModal;
