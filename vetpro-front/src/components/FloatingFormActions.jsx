const FloatingFormActions = ({
  children,
  maxWidthClass = "max-w-3xl",
  mobileSticky = false,
  desktopFloating = false,
}) => {
  return (
    <div className="mt-3 px-1 sm:mt-4 sm:px-0">
      <div
        className={`mx-auto ${maxWidthClass} border border-slate-200 bg-white/95 shadow-[0_8px_24px_rgba(15,23,42,0.12)] px-3 py-3 sm:px-4 sm:py-4 ${
          mobileSticky ? "sticky bottom-2 z-20 sm:static" : ""
        } ${
          desktopFloating ? "sm:sticky sm:bottom-4 sm:z-20" : ""
        } rounded-xl sm:rounded-2xl`}
      >
        {children}
      </div>
    </div>
  );
};

export default FloatingFormActions;
