import { useEffect, useMemo, useRef } from "react";

type Vec2 = Readonly<{ x: number; y: number }>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function NeonGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const mouseRef = useRef<Vec2 | null>(null);
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

    function resize(): void {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvasEl.style.width = `${width}px`;
      canvasEl.style.height = `${height}px`;
      canvasEl.width = Math.floor(width * dpr);
      canvasEl.height = Math.floor(height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function onMouseMove(event: MouseEvent): void {
      mouseRef.current = { x: event.clientX, y: event.clientY };
    }

    function onMouseLeave(): void {
      mouseRef.current = null;
    }

    function drawGrid(
      width: number,
      height: number,
      spacing: number,
      offsetX: number,
      offsetY: number,
      strokeStyle: string,
      lineWidth: number
    ): void {
      ctx.save();
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = strokeStyle;

      ctx.beginPath();
      for (let x = -spacing; x <= width + spacing; x += spacing) {
        const xx = x + offsetX;
        ctx.moveTo(xx, -spacing);
        ctx.lineTo(xx, height + spacing);
      }
      for (let y = -spacing; y <= height + spacing; y += spacing) {
        const yy = y + offsetY;
        ctx.moveTo(-spacing, yy);
        ctx.lineTo(width + spacing, yy);
      }
      ctx.stroke();
      ctx.restore();
    }

    function drawFrame(timeMs: number): void {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const time = timeMs * 0.001;

      ctx.clearRect(0, 0, width, height);

      const baseGradient = ctx.createRadialGradient(
        width * 0.5,
        height * 0.35,
        0,
        width * 0.5,
        height * 0.35,
        Math.max(width, height) * 0.9
      );
      baseGradient.addColorStop(0, "rgba(189, 106, 114, 0.08)");
      baseGradient.addColorStop(0.45, "rgba(148, 70, 91, 0.05)");
      baseGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = baseGradient;
      ctx.fillRect(0, 0, width, height);

      const minor = 28;
      const major = 64;
      const driftX = (time * 10) % major;
      const driftY = (time * 6) % major;

      drawGrid(
        width,
        height,
        minor,
        (driftX % minor) - minor,
        (driftY % minor) - minor,
        "rgba(130, 255, 245, 0.05)",
        1
      );

      drawGrid(
        width,
        height,
        major,
        (driftX % major) - major,
        (driftY % major) - major,
        "rgba(168, 85, 247, 0.08)",
        1
      );

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowBlur = 14;
      ctx.shadowColor = "rgba(130, 255, 245, 0.35)";
      drawGrid(
        width,
        height,
        major * 4,
        ((driftX * 0.6) % (major * 4)) - major * 4,
        ((driftY * 0.6) % (major * 4)) - major * 4,
        "rgba(130, 255, 245, 0.08)",
        1.25
      );
      ctx.restore();

      const sweepY = (time * 50) % (height + 260) - 130;
      const sweep = ctx.createLinearGradient(0, sweepY - 180, 0, sweepY + 180);
      sweep.addColorStop(0, "rgba(0, 0, 0, 0)");
      sweep.addColorStop(0.45, "rgba(130, 255, 245, 0.00)");
      sweep.addColorStop(0.5, "rgba(130, 255, 245, 0.08)");
      sweep.addColorStop(0.55, "rgba(130, 255, 245, 0.00)");
      sweep.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = sweep;
      ctx.fillRect(0, 0, width, height);

      const mouse = mouseRef.current;
      if (mouse) {
        const r = Math.max(220, Math.min(width, height) * 0.22);
        const glow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, r);
        glow.addColorStop(0, "rgba(130, 255, 245, 0.13)");
        glow.addColorStop(0.35, "rgba(168, 85, 247, 0.08)");
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        const snap = 64;
        const snappedX = Math.round((mouse.x - driftX) / snap) * snap + driftX;
        const snappedY = Math.round((mouse.y - driftY) / snap) * snap + driftY;
        const dx = snappedX - mouse.x;
        const dy = snappedY - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const influence = clamp(1 - dist / 220, 0, 1);

        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.shadowBlur = 18;
        ctx.shadowColor = "rgba(168, 85, 247, 0.6)";
        ctx.fillStyle = `rgba(168, 85, 247, ${0.08 + influence * 0.22})`;
        ctx.beginPath();
        ctx.arc(snappedX, snappedY, 2.2 + influence * 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
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

