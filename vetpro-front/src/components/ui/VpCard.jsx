import React from "react";
import PropTypes from "prop-types";

const VpCard = ({
  title,
  subtitle,
  children,
  className = "",
  bodyClassName = "",
  headerAction = null,
}) => {
  return (
    <section
      className={`shell-surface rounded-3xl border border-gray-200/80 dark:border-dark-700/70 overflow-hidden ${className}`}
    >
      {(title || subtitle || headerAction) && (
        <header className="bg-white/65 dark:bg-dark-900/45 px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-dark-700 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction}
        </header>
      )}
      <div className={`p-4 sm:p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
};

VpCard.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
  bodyClassName: PropTypes.string,
  headerAction: PropTypes.node
};

VpCard.defaultProps = {
  title: null,
  subtitle: null,
  children: null,
  className: "",
  bodyClassName: "",
  headerAction: null
};

export default VpCard;
