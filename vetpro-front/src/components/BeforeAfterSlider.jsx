import { useState, useRef } from "react";
import { buildApiUrl } from "../services/api";

const BeforeAfterSlider = ({ before, after }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef(null);
  const draggingRef = useRef(false);

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
          src={buildApiUrl(`/consultations/files/${after.id}/view`, {
            token: localStorage.getItem("token"),
          })}
          alt="after"
          className="w-full block"
        />

        {/* Imagem BEFORE sobreposta */}
        <div
          className="absolute top-0 left-0 h-full overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={buildApiUrl(`/consultations/files/${before.id}/view`, {
              token: localStorage.getItem("token"),
            })}
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
