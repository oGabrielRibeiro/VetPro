import React, { forwardRef } from "react";

const Select = forwardRef(({
  label,
  error,
  helperText,
  options = [],
  placeholder = "Selecione uma opção",
  className = "",
  selectClassName = "",
  labelClassName = "",
  containerClassName = "",
  required = false,
  disabled = false,
  ...props
}, ref) => {
  const baseSelectClasses = `
    w-full px-3 py-2 sm:px-4 sm:py-3 
    border rounded-lg text-sm
    transition-all duration-200
    focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
    disabled:bg-gray-100 disabled:cursor-not-allowed
  `;

  const errorSelectClasses = error
    ? "border-red-300 focus:ring-red-500 focus:border-red-500"
    : "border-gray-300 dark:border-dark-600";

  const darkClasses = "dark:bg-dark-800 dark:text-white";

  return (
    <div className={`${containerClassName}`}>
      {label && (
        <label className={`block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${labelClassName}`}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        ref={ref}
        disabled={disabled}
        className={`
          ${baseSelectClasses}
          ${errorSelectClasses}
          ${darkClasses}
          ${selectClassName}
        `}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {(error || helperText) && (
        <p className={`mt-1 text-xs ${error ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = "Select";

export default Select;
