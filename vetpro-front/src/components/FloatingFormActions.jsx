import { useEffect, useRef, useState } from "react";

const FloatingFormActions = ({
  children,
  maxWidthClass = "max-w-3xl",
  bottomOffsetClass = "bottom-14 sm:bottom-4",
}) => {
  const anchorRef = useRef(null);
  const [attachedToEnd, setAttachedToEnd] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(max-width: 639px)");
    const apply = () => setIsMobile(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (isMobile) return undefined;
    const anchor = anchorRef.current;
    if (!anchor || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setAttachedToEnd(Boolean(entry?.isIntersecting));
      },
      {
        root: null,
        rootMargin: "0px 0px -110px 0px",
        threshold: 0
      },
    );

    observer.observe(anchor);
    return () => observer.disconnect();
  }, [isMobile]);

  if (isMobile) {
    return (
      <div className="mt-3 px-1">
        <div
          className={`mx-auto ${maxWidthClass} rounded-xl border border-slate-200 bg-white px-2 py-2 shadow-[0_6px_18px_rgba(15,23,42,0.08)]`}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={anchorRef} className="h-px w-full" />
      {attachedToEnd ? (
        <div className="mt-4 px-4 sm:px-0">
          <div
            className={`mx-auto ${maxWidthClass} rounded-2xl border border-slate-200 bg-white/95 backdrop-blur shadow-[0_10px_26px_rgba(15,23,42,0.12)] px-4 py-3 sm:py-4`}
          >
            {children}
          </div>
        </div>
      ) : (
        <div className={`fixed left-0 right-0 ${bottomOffsetClass} z-30 px-4 sm:px-0`}>
          <div
            className={`mx-auto ${maxWidthClass} rounded-2xl border border-slate-200 bg-white/95 backdrop-blur shadow-[0_10px_26px_rgba(15,23,42,0.12)] px-4 py-3 sm:py-4`}
          >
            {children}
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingFormActions;
