import React, { useEffect, useState } from 'react';

export const TechSpotlight: React.FC = () => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // Only enable if pointer device supports fine movement (not pure touch)
    if (typeof window === 'undefined' || !window.matchMedia('(pointer: fine)').matches) {
      return;
    }

    let rafId: number | null = null;
    const handlePointerMove = (e: PointerEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setPos({ x: e.clientX, y: e.clientY });
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  if (!pos) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300 opacity-60"
      style={{
        background: `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, rgba(99, 102, 241, 0.055), transparent 80%)`,
      }}
    />
  );
};
