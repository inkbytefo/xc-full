import { useEffect, useMemo, useRef } from "react";

type RGB = readonly [number, number, number];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ] as const;
}

function wavePalette(height01: number): RGB {
  const low: RGB = [10, 10, 12];
  const mid: RGB = [148, 70, 91];
  const high: RGB = [189, 106, 114];
  if (height01 <= 0.5) return lerpColor(low, mid, height01 / 0.5);
  return lerpColor(mid, high, (height01 - 0.5) / 0.5);
}

export function DotWaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const pointsRef = useRef<ReadonlyArray<{ x: number; y: number }>>([]);
  const isReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const canvasEl: HTMLCanvasElement = canvas;
    const ctx: CanvasRenderingContext2D = context;

    const DOT_SPACING = 28;

    function rebuildGrid(width: number, height: number): void {
      const points: Array<{ x: number; y: number }> = [];
      const cols = Math.ceil(width / DOT_SPACING);
      const rows = Math.ceil(height / DOT_SPACING);

      for (let row = 0; row <= rows; row += 1) {
        for (let col = 0; col <= cols; col += 1) {
          points.push({ x: col * DOT_SPACING, y: row * DOT_SPACING });
        }
      }

      pointsRef.current = points;
    }

    function resize(): void {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvasEl.style.width = `${width}px`;
      canvasEl.style.height = `${height}px`;
      canvasEl.width = Math.floor(width * dpr);
      canvasEl.height = Math.floor(height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildGrid(width, height);
    }

    function onMouseMove(event: MouseEvent): void {
      mouseRef.current = { x: event.clientX, y: event.clientY };
    }

    function onMouseLeave(): void {
      mouseRef.current = null;
    }

    function drawFrame(timeMs: number): void {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const time = timeMs * 0.001;

      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;
      const baseAmplitude = 0.9;
      const mouseRadius = 180;
      const mouseRadiusInv = 1 / mouseRadius;

      for (const p of pointsRef.current) {
        const x = p.x;
        const y = p.y;

        const w =
          Math.sin(x * 0.0015 + y * 0.002 + time * 1.25) +
          Math.cos(x * 0.0011 - y * 0.0017 + time * 0.95);

        const height01 = clamp(0.5 + w * 0.25, 0, 1);

        let proximity = 0;
        if (mouse) {
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          proximity = clamp(1 - dist * mouseRadiusInv, 0, 1);
        }

        const amplitude = baseAmplitude + proximity * 1.1;
        const r = 0.8 + amplitude * (0.35 + height01 * 1.2);
        const alpha = clamp(0.05 + height01 * 0.25 + proximity * 0.18, 0, 0.6);

        const [cr, cg, cb] = wavePalette(height01);
        ctx.fillStyle = `rgb(${cr} ${cg} ${cb} / ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function animate(timeMs: number): void {
      drawFrame(timeMs);
      animationFrameIdRef.current = window.requestAnimationFrame(animate);
    }

    function start(): void {
      if (animationFrameIdRef.current != null) return;
      animationFrameIdRef.current = window.requestAnimationFrame(animate);
    }

    function stop(): void {
      if (animationFrameIdRef.current == null) return;
      window.cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    function onVisibilityChange(): void {
      if (document.visibilityState === "visible") start();
      else stop();
    }

    resize();

    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseleave", onMouseLeave, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    if (isReducedMotion) drawFrame(performance.now());
    else start();

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none select-none"
    />
  );
}
