import React, { useRef, useState, useEffect, useCallback } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // 最大倾斜角度
  glareOpacity?: number; // 镜面高光强度
  onClick?: () => void;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  maxTilt = 5,
  glareOpacity = 0.25,
  onClick
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
  const [glarePos, setGlarePos] = useState<{ x: number; y: number; active: boolean }>({ x: 50, y: 50, active: false });

  // 鼠标移动视差
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;

    const tiltX = ((y / rect.height) - 0.5) * -maxTilt;
    const tiltY = ((x / rect.width) - 0.5) * maxTilt;

    setTransform(`perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`);
    setGlarePos({ x: percentX, y: percentY, active: true });
  }, [maxTilt]);

  const handleMouseLeave = useCallback(() => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setGlarePos(prev => ({ ...prev, active: false }));
  }, []);

  // 移动端陀螺仪重力感应
  useEffect(() => {
    let supported = false;
    const handleOrientation = (event: DeviceOrientationEvent) => {
      supported = true;
      const gamma = event.gamma || 0; // 左右倾斜 [-90, 90]
      const beta = event.beta || 0;   // 前后倾斜 [-180, 180]

      const tiltY = Math.min(Math.max(gamma / 3, -maxTilt), maxTilt);
      const tiltX = Math.min(Math.max((beta - 45) / 3, -maxTilt), maxTilt);

      setTransform(`perspective(1000px) rotateX(${-tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`);
      setGlarePos({
        x: Math.min(Math.max(50 + gamma * 1.5, 0), 100),
        y: Math.min(Math.max(50 + (beta - 45) * 1.5, 0), 100),
        active: true
      });
    };

    const DeviceOrientation = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
    if (window.DeviceOrientationEvent && typeof DeviceOrientation?.requestPermission !== 'function') {
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    }

    return () => {
      if (supported) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, [maxTilt]);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform,
        transformStyle: 'preserve-3d',
        transition: glarePos.active ? 'transform 0.08s ease-out' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)'
      }}
      className={`relative overflow-hidden will-change-transform ${className}`}
    >
      {children}

      {/* 苹果级流动流体高光层 */}
      <div
        className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-300 rounded-[inherit]"
        style={{
          opacity: glarePos.active ? glareOpacity : 0,
          background: `radial-gradient(circle 280px at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.15) 45%, transparent 75%)`
        }}
      />
    </div>
  );
};
