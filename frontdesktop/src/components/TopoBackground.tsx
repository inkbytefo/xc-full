import React, { useRef, useEffect, useState } from 'react';
import { FastNoise } from '../utils/noise';

export const TopoBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = dimensions.width * dpr;
        canvas.height = dimensions.height * dpr;
        canvas.style.width = `${dimensions.width}px`;
        canvas.style.height = `${dimensions.height}px`;
        ctx.scale(dpr, dpr);

        // Aesthetic Config
        const noise = new FastNoise(Math.random() * 1000);
        const cellSize = 12; // Slightly larger for performance
        const cols = Math.ceil(dimensions.width / cellSize) + 1;
        const rows = Math.ceil(dimensions.height / cellSize) + 1;

        // Monochrome Palette matching app dark mode
        const bgFill = '#050505'; // Almost black
        const gridDotColor = '#1a1a1a';
        const contourColorDark = '#1c1c1c';
        const contourColorLight = '#262626'; // Subtle grey

        let time = 0;
        let animationFrameId: number;

        const draw = () => {
            // Clear with dark bg
            ctx.fillStyle = bgFill;
            ctx.fillRect(0, 0, dimensions.width, dimensions.height);

            // 1. Draw Static "Digital Weave" Texture
            ctx.fillStyle = gridDotColor;
            for (let x = 0; x < dimensions.width; x += 10) {
                for (let y = 0; y < dimensions.height; y += 10) {
                    if ((x + y + time / 100) % 7 > 2) {
                        ctx.fillRect(x, y, 1.5, 1.5);
                    }
                }
            }

            // 2. Generate Topography Data
            const values: number[] = new Array(cols * rows);
            const zoom = 0.003;
            const zTime = time * 0.0001; // Slow drift

            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const xVal = x * cellSize;
                    const yVal = y * cellSize;

                    let n = noise.noise3D(xVal * zoom, yVal * zoom, zTime);
                    n += 0.3 * noise.noise3D(xVal * zoom * 4, yVal * zoom * 4, zTime * 2);

                    values[y * cols + x] = n;
                }
            }

            // 3. Marching Squares (Isolines)
            const levels = [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6];

            levels.forEach((threshold, index) => {
                ctx.beginPath();
                const isMajor = index % 2 === 0;
                ctx.lineWidth = isMajor ? 1.5 : 0.5;
                ctx.strokeStyle = isMajor ? contourColorLight : contourColorDark;

                for (let y = 0; y < rows - 1; y++) {
                    for (let x = 0; x < cols - 1; x++) {
                        const bl = values[(y + 1) * cols + x];
                        const br = values[(y + 1) * cols + (x + 1)];
                        const tr = values[y * cols + (x + 1)];
                        const tl = values[y * cols + x];

                        let state = 0;
                        if (bl > threshold) state |= 1;
                        if (br > threshold) state |= 2;
                        if (tr > threshold) state |= 4;
                        if (tl > threshold) state |= 8;

                        if (state === 0 || state === 15) continue;

                        const getX = (v1: number, v2: number) => (threshold - v1) / (v2 - v1);

                        const cx = x * cellSize;
                        const cy = y * cellSize;

                        const a = { x: cx + cellSize * getX(bl, br), y: cy + cellSize };
                        const b = { x: cx + cellSize, y: cy + cellSize * (1 - getX(br, tr)) };
                        const c = { x: cx + cellSize * getX(tl, tr), y: cy };
                        const d = { x: cx, y: cy + cellSize * (1 - getX(bl, tl)) };

                        switch (state) {
                            case 1: ctx.moveTo(d.x, d.y); ctx.lineTo(a.x, a.y); break;
                            case 2: ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); break;
                            case 3: ctx.moveTo(d.x, d.y); ctx.lineTo(b.x, b.y); break;
                            case 4: ctx.moveTo(c.x, c.y); ctx.lineTo(b.x, b.y); break;
                            case 5: ctx.moveTo(d.x, d.y); ctx.lineTo(a.x, a.y); ctx.moveTo(c.x, c.y); ctx.lineTo(b.x, b.y); break;
                            case 6: ctx.moveTo(c.x, c.y); ctx.lineTo(a.x, a.y); break;
                            case 7: ctx.moveTo(d.x, d.y); ctx.lineTo(c.x, c.y); break;
                            case 8: ctx.moveTo(d.x, d.y); ctx.lineTo(c.x, c.y); break;
                            case 9: ctx.moveTo(c.x, c.y); ctx.lineTo(a.x, a.y); break;
                            case 10: ctx.moveTo(d.x, d.y); ctx.lineTo(c.x, c.y); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); break;
                            case 11: ctx.moveTo(c.x, c.y); ctx.lineTo(b.x, b.y); break;
                            case 12: ctx.moveTo(d.x, d.y); ctx.lineTo(b.x, b.y); break;
                            case 13: ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); break;
                            case 14: ctx.moveTo(d.x, d.y); ctx.lineTo(a.x, a.y); break;
                        }
                    }
                }
                ctx.stroke();
            });

            time += 15;
            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => cancelAnimationFrame(animationFrameId);
    }, [dimensions]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none select-none"
            style={{ zIndex: 0 }}
        />
    );
};
