import { useEffect, useRef, useState } from "react";
import { fetchBlobUrlFromApi } from "../utils/blobDownloads";

const BeforeAfterSlider = ({ before, after }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [beforeSrc, setBeforeSrc] = useState("");
  const [afterSrc, setAfterSrc] = useState("");
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const draggingRef = useRef(false);
  const objectUrlsRef = useRef([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!before?.id || !after?.id) return;
      setLoading(true);
      try {
        const [leftUrl, rightUrl] = await Promise.all([
          fetchBlobUrlFromApi(`/consultations/files/${before.id}/view`),
          fetchBlobUrlFromApi(`/consultations/files/${after.id}/view`),
        ]);
        if (!mounted) {
          URL.revokeObjectURL(leftUrl);
          URL.revokeObjectURL(rightUrl);
          return;
        }
        objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        objectUrlsRef.current = [leftUrl, rightUrl];
        setBeforeSrc(leftUrl);
        setAfterSrc(rightUrl);
      } catch {
        if (mounted) {
          setBeforeSrc("");
          setAfterSrc("");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, [before?.id, after?.id]);

  const updatePositionFromClientX = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  const handlePointerDown = (e) => {
    draggingRef.current = true;
    updatePositionFromClientX(e.clientX);
  };

  const handlePointerMove = (e) => {
    if (!draggingRef.current) return;
    updatePositionFromClientX(e.clientX);
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
  };

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold mb-4">
        🔍 Comparação Antes / Depois
      </h2>
      {loading && <p className="text-sm text-gray-500 mb-3">Carregando imagens...</p>}
      {!loading && (!beforeSrc || !afterSrc) && (
        <p className="text-sm text-red-600 mb-3">Nao foi possivel carregar as imagens.</p>
      )}

      {!!beforeSrc && !!afterSrc && (
        <div
          ref={containerRef}
          className="relative w-full max-w-4xl mx-auto overflow-hidden rounded-xl cursor-col-resize select-none touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Imagem AFTER (base) */}
          <img
            src={afterSrc}
            alt="after"
            className="w-full block"
          />

          {/* Imagem BEFORE sobreposta */}
          <div
            className="absolute top-0 left-0 h-full overflow-hidden"
            style={{ width: `${sliderPosition}%` }}
          >
            <img
              src={beforeSrc}
              alt="before"
              className="w-full block"
            />
          </div>

          {/* Divisor */}
          <div
            className="absolute top-0 h-full w-1 bg-white shadow-lg"
            style={{ left: `${sliderPosition}%` }}
          />
        </div>
      )}

      <input
        type="range"
        min="0"
        max="100"
        value={sliderPosition}
        onChange={(e) => setSliderPosition(Number(e.target.value))}
        className="mt-3 w-full"
      />
    </div>
  );
};

export default BeforeAfterSlider;
