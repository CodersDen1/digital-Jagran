import React from 'react';

const Input = ({ label, name, type = 'text', value, onChange, placeholder, className = '' }) => {
    return (
        <div className={`flex flex-col mb-4 ${className}`}>
            {label && <label className="mb-1 text-sm font-semibold text-gray-700">{label}</label>}
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
        </div>
    );
};

export default Input;
