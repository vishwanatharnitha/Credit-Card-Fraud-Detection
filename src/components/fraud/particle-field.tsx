import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  z: number;
  speed: number;
  size: number;
};

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particles: Particle[] = Array.from({ length: 56 }, (_, index) => ({
      x: (index * 47) % 100,
      y: (index * 83) % 100,
      z: 0.3 + ((index * 19) % 70) / 100,
      speed: 0.035 + ((index * 7) % 12) / 1000,
      size: 0.8 + ((index * 11) % 18) / 10,
    }));
    let animationFrame = 0;

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * scale;
      canvas.height = window.innerHeight * scale;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(scale, 0, 0, scale, 0, 0);
    };

    const draw = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      context.clearRect(0, 0, width, height);

      particles.forEach((particle, index) => {
        if (!reducedMotion) particle.y = (particle.y - particle.speed + 100) % 100;
        const x = (particle.x / 100) * width;
        const y = (particle.y / 100) * height;
        const radius = particle.size * particle.z;
        const glow = context.createRadialGradient(x, y, 0, x, y, radius * 7);
        glow.addColorStop(0, `rgba(212, 175, 55, ${0.4 * particle.z})`);
        glow.addColorStop(1, "rgba(212, 175, 55, 0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(x, y, radius * 7, 0, Math.PI * 2);
        context.fill();

        if (index % 4 === 0) {
          context.strokeStyle = `rgba(212, 175, 55, ${0.07 * particle.z})`;
          context.lineWidth = 0.6;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(width * 0.5, height * 0.42);
          context.stroke();
        }
      });

      if (!reducedMotion) animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 -z-10 opacity-70" />;
}