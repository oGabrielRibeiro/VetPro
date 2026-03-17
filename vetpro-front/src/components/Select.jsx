import React, { forwardRef } from "react";

const Select = forwardRef(({
  id,
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
  const selectId = id || props.name || undefined;

  return (
    <div className={`${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className={`vp-label ${labelClassName}`}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        disabled={disabled}
        className={`
          vp-input
          ${error ? "border-red-300 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.22)]" : ""}
          ${disabled ? "opacity-75 cursor-not-allowed" : ""}
          ${selectClassName}
        `}
        aria-invalid={error ? "true" : "false"}
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
