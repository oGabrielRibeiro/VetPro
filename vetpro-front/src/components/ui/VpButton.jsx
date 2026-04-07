import React from "react";
import PropTypes from "prop-types";

const VARIANT_CLASS = {
  primary: "btn btn-primary",
  success: "btn btn-success",
  neutral: "btn btn-neutral",
  info: "btn btn-info-soft",
  warning: "btn btn-warn-soft",
  danger: "btn btn-danger-soft",
};

const SIZE_CLASS = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
};

const VpButton = ({
  as = "button",
  variant = "primary",
  size = "md",
  block = false,
  loading = false,
  active = false,
  icon = null,
  iconRight = null,
  disabled = false,
  className = "",
  children,
  ...props
}) => {
  const Component = as;
  const variantClass = VARIANT_CLASS[variant] || VARIANT_CLASS.primary;
  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.md;
  const isDisabled = disabled || loading;

  return (
    <Component
      {...props}
      disabled={isDisabled}
      aria-busy={loading ? "true" : "false"}
      className={`${variantClass} ${sizeClass} ${block ? "btn-block" : ""} ${
        active ? "is-active" : ""
      } ${className}`.trim()}
    >
      {loading ? (
        <span className="inline-flex h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : (
        icon
      )}
      {children}
      {!loading && iconRight}
    </Component>
  );
};

VpButton.propTypes = {
  as: PropTypes.oneOfType([PropTypes.string, PropTypes.elementType]),
  variant: PropTypes.oneOf(['primary', 'success', 'neutral', 'info', 'warning', 'danger']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  block: PropTypes.bool,
  loading: PropTypes.bool,
  active: PropTypes.bool,
  icon: PropTypes.node,
  iconRight: PropTypes.node,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node
};

VpButton.defaultProps = {
  as: "button",
  variant: "primary",
  size: "md",
  block: false,
  loading: false,
  active: false,
  icon: null,
  iconRight: null,
  disabled: false,
  className: "",
  children: null
};

export default VpButton;
