import React, { forwardRef } from "react";

const Input = forwardRef(({
  id,
  label,
  error,
  helperText,
  type = "text",
  className = "",
  inputClassName = "",
  labelClassName = "",
  containerClassName = "",
  required = false,
  disabled = false,
  readOnly = false,
  placeholder,
  ...props
}, ref) => {
  const inputId = id || props.name || undefined;

  return (
    <div className={`${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className={`vp-label ${labelClassName}`}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={`
          vp-input
          ${error ? "border-red-300 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.22)]" : ""}
          ${disabled ? "opacity-75 cursor-not-allowed" : ""}
          ${readOnly ? "opacity-90 cursor-not-allowed" : ""}
          ${inputClassName}
        `}
        aria-invalid={error ? "true" : "false"}
        {...props}
      />
      {(error || helperText) && (
        <p className={`mt-1 text-xs ${error ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
