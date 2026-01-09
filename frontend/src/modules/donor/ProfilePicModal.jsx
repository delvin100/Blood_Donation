import React, { useState, useRef } from 'react';

const ProfilePicModal = ({ isOpen, onClose, user, onUpdate }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileSelect = (file) => {
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
            setError('Please select a valid image file (JPG, PNG).');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('File size must be less than 5MB.');
            return;
        }

        setError('');
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        setIsSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('authToken');
            const formData = new FormData();
            formData.append('profile_picture', selectedFile);

            const res = await fetch('/api/dashboard/profile-picture', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || 'Failed to upload picture');

            onUpdate(); // Refresh dashboard data
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getProfilePicUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        return url;
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-white">Profile Picture</h3>
                        <p className="text-blue-100 text-sm">Upload your photo</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 flex flex-col items-center">

                    {/* Current/Preview Image */}
                    <div className="mb-8 flex flex-col items-center">
                        <div className="w-28 h-28 rounded-full shadow-xl border-4 border-white bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden mb-3">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : user.profile_picture ? (
                                <img src={getProfilePicUrl(user.profile_picture)} alt="Current" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl font-bold text-white">
                                    {user.full_name?.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <span className="text-gray-500 text-sm font-medium">Current Profile Picture</span>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="w-full mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 flex items-center gap-2">
                            <i className="fas fa-exclamation-circle"></i>
                            {error}
                        </div>
                    )}

                    {/* Upload Area */}
                    <div
                        className={`w-full border-2 border-dashed rounded-2xl p-8 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center group
                            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/png, image/jpeg, image/jpg"
                            onChange={(e) => handleFileSelect(e.target.files[0])}
                        />

                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                            <i className="fas fa-cloud-upload-alt text-2xl text-blue-600"></i>
                        </div>

                        <p className="text-blue-600 font-bold mb-1">Choose a file <span className="text-gray-500 font-normal">or drag and drop</span></p>
                        <p className="text-xs text-gray-400">JPG, JPEG or PNG (Max 5MB)</p>
                    </div>

                </div>

                {/* Footer buttons */}
                <div className="p-6 border-t border-gray-100 flex gap-3 shrink-0 bg-white">
                    <button
                        onClick={handleUpload}
                        disabled={!selectedFile || isSubmitting}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <><i className="fas fa-circle-notch animate-spin"></i> Uploading...</>
                        ) : (
                            <><i className="fas fa-upload"></i> Upload Picture</>
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="w-32 py-3 rounded-xl font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfilePicModal;
