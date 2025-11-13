import React from 'react';

interface EditableFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  iconClass: string;
  inputType?: string;
  placeholder?: string;
}

const EditableField: React.FC<EditableFieldProps> = ({ id, label, value, onChange, iconClass, inputType = 'text', placeholder }) => {
  return (
    <div className="relative">
      <label htmlFor={id} className="absolute -top-2.5 left-2 inline-block bg-gray-800 px-1 text-xs font-medium text-gray-400">
        {label}
      </label>
      <div className="flex items-center border border-gray-600 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
        <i className={`${iconClass} text-gray-400 mr-3 w-4 text-center`}></i>
        <input
          type={inputType}
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-transparent p-0 border-none text-gray-100 placeholder-gray-400 focus:ring-0 sm:text-sm"
        />
      </div>
    </div>
  );
};

export default EditableField;