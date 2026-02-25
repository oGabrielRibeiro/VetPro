import React from "react";

const LoadingSpinner = ({ 
  size = "md", 
  color = "emerald",
  text = "",
  className = "" 
}) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
    xl: "h-16 w-16 border-4",
  };

  const colorClasses = {
    emerald: "border-emerald-200 border-t-emerald-600",
    blue: "border-blue-200 border-t-blue-600",
    red: "border-red-200 border-t-red-600",
    gray: "border-gray-200 border-t-gray-600",
    white: "border-white/30 border-t-white",
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`
          ${sizeClasses[size] || sizeClasses.md}
          ${colorClasses[color] || colorClasses.emerald}
          rounded-full animate-spin
        `}
      />
      {text && (
        <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};

// Spinner inline para botões
export const ButtonSpinner = ({ size = "sm", color = "white" }) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const colorClasses = {
    white: "border-white/30 border-t-white",
    emerald: "border-emerald-200 border-t-emerald-600",
  };

  return (
    <div
      className={`
        ${sizeClasses[size] || sizeClasses.sm}
        ${colorClasses[color] || colorClasses.white}
        border-2 rounded-full animate-spin
      `}
    />
  );
};

// Overlay de loading para páginas
export const LoadingOverlay = ({ message = "Carregando..." }) => {
  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-dark-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-600 dark:text-gray-400 font-medium">
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
