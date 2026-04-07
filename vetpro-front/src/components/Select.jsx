import React, { forwardRef, useId } from "react";
import PropTypes from "prop-types";
import * as RadixSelect from "@radix-ui/react-select";

function ChevronDown() {
  return (
    <span aria-hidden className="text-xs">
      ▾
    </span>
  );
}

const Select = forwardRef(
  (
    {
      id,
      name,
      label,
      error,
      helperText,
      options = [],
      placeholder = "Selecione uma opção",
      selectClassName = "",
      labelClassName = "",
      containerClassName = "",
      required = false,
      disabled = false,
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id || name || `vp-select-${generatedId}`;

    const handleValueChange = (nextValue) => {
      if (typeof onChange === "function") {
        onChange({
          target: {
            name,
            id: selectId,
            value: nextValue,
          },
        });
      }
    };

    return (
      <div className={containerClassName}>
        {label && (
          <label htmlFor={selectId} className={`vp-label ${labelClassName}`}>
            {label}
            {required && <span className="ml-0.5 text-red-500">*</span>}
          </label>
        )}

        <RadixSelect.Root
          name={name}
          disabled={disabled}
          required={required}
          value={value}
          defaultValue={defaultValue}
          onValueChange={handleValueChange}
        >
          <RadixSelect.Trigger
            id={selectId}
            ref={ref}
            aria-invalid={error ? "true" : "false"}
            className={[
              "vp-input flex min-h-[44px] w-full items-center justify-between",
              "text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70",
              error
                ? "border-red-300 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(248,113,113,0.22)]"
                : "",
              disabled ? "cursor-not-allowed opacity-75" : "",
              selectClassName,
            ]
              .filter(Boolean)
              .join(" ")}
            {...props}
          >
            <RadixSelect.Value placeholder={placeholder} />
            <RadixSelect.Icon>
              <ChevronDown />
            </RadixSelect.Icon>
          </RadixSelect.Trigger>

          <RadixSelect.Portal>
            <RadixSelect.Content
              position="popper"
              sideOffset={6}
              className="
                z-[60] max-h-72 w-[var(--radix-select-trigger-width)]
                overflow-hidden rounded-xl border border-gray-200 dark:border-dark-700
                bg-white dark:bg-dark-800 shadow-xl
              "
            >
              <RadixSelect.Viewport className="p-1">
                {options.map((option) => (
                  <RadixSelect.Item
                    key={option.value}
                    value={String(option.value)}
                    disabled={Boolean(option.disabled)}
                    className="
                      relative flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm
                      text-gray-700 dark:text-gray-200
                      outline-none data-[highlighted]:bg-emerald-50 data-[highlighted]:text-emerald-800
                      dark:data-[highlighted]:bg-emerald-900/40 dark:data-[highlighted]:text-emerald-200
                      data-[disabled]:opacity-45
                    "
                  >
                    <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  </RadixSelect.Item>
                ))}
              </RadixSelect.Viewport>
            </RadixSelect.Content>
          </RadixSelect.Portal>
        </RadixSelect.Root>

        {(error || helperText) && (
          <p
            className={`mt-1 text-xs ${error ? "text-red-500" : "text-gray-500 dark:text-gray-400"}`}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";

Select.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  label: PropTypes.string,
  error: PropTypes.string,
  helperText: PropTypes.string,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    disabled: PropTypes.bool
  })),
  placeholder: PropTypes.string,
  selectClassName: PropTypes.string,
  labelClassName: PropTypes.string,
  containerClassName: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  value: PropTypes.string,
  defaultValue: PropTypes.string,
  onChange: PropTypes.func
};

Select.defaultProps = {
  options: [],
  placeholder: "Selecione uma opção",
  selectClassName: "",
  labelClassName: "",
  containerClassName: "",
  required: false,
  disabled: false,
  value: undefined,
  defaultValue: undefined,
  onChange: undefined
};

export default Select;
