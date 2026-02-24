
import React from 'react';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface NeoToastProps {
  message: string;
  type: ToastMessage['type'];
  onClose: () => void;
}

const NeoToast: React.FC<NeoToastProps> = ({ message, type, onClose }) => {
    const bgColor = {
        success: 'bg-green-400',
        error: 'bg-red-400',
        info: 'bg-blue-400',
        warning: 'bg-yellow-400',
    }[type];

    return (
        <div 
            className={`relative w-80 max-w-sm p-4 border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-lg ${bgColor} text-black font-semibold animate-fade-in-down`}
            role="alert"
        >
            <p>{message}</p>
            <button 
                onClick={onClose} 
                className="absolute top-2 right-2 text-black hover:text-gray-800"
                aria-label="Close"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

export default NeoToast;
