const LoadingDot = ({ className = "" }) => (
  <span
    aria-hidden="true"
    className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
  />
);

export default LoadingDot;
