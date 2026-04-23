class DiagnosticCanvas {
    constructor(canvasId, imageId, overlayId, reportId) {
        this.canvas = document.getElementById(canvasId);
        this.image = document.getElementById(imageId);
        this.overlay = document.getElementById(overlayId);
        this.reportId = reportId;

        // Safety check
        if (!this.canvas || !this.image) {
            console.error('[DiagnosticCanvas] Missing canvas or image element');
            return;
        }

        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.container = this.canvas.parentElement;

        // Force crossOrigin for filters
        if (!this.image.crossOrigin) this.image.crossOrigin = "anonymous";

        // State
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentTool = 'none';
        this.activeFilter = 'none';
        this.measurements = [];
        this.roiBox = null;

        // Visual Rect State (for object-fit: contain)
        this.visualRect = { x: 0, y: 0, w: 0, h: 0 };

        // Color Settings
        this.penColor = '#ef4444';
        this.penWidth = 3;
        this.rulerColor = '#10b981';
        this.roiColor = '#3b82f6';

        // Zoom State
        this.scale = 1;
        this.panning = false;
        this.panX = 0;
        this.panY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        // Source Data State
        this.offscreenCanvas = document.createElement('canvas'); // For reading pixel data
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
        this.isImageLoaded = false;

        this.resizeCanvas();
        this.createTooltip();
        this.attachListeners();

        // Observers
        window.addEventListener('resize', () => this.resizeCanvas());

        // Image Load Handling
        if (this.image.complete && this.image.naturalWidth > 0) {
            this.prepareProbe();
        } else {
            this.image.onload = () => {
                this.prepareProbe();
                this.resizeCanvas();
            };
        }
    }

    createTooltip() {
        if (!document.querySelector('.probe-tooltip')) {
            const tooltip = document.createElement('div');
            tooltip.className = 'probe-tooltip';
            tooltip.style.position = 'fixed';
            tooltip.style.zIndex = '9999';
            tooltip.style.background = 'rgba(0,0,0,0.8)';
            tooltip.style.color = '#fff';
            tooltip.style.padding = '4px 8px';
            tooltip.style.borderRadius = '4px';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.display = 'none';
            tooltip.style.fontSize = '12px';
            document.body.appendChild(tooltip);
        }
    }

    prepareProbe() {
        if (!this.image.naturalWidth) return;
        this.offscreenCanvas.width = this.image.naturalWidth;
        this.offscreenCanvas.height = this.image.naturalHeight;
        // Draw the raw image to offscreen canvas for pixel reading
        try {
            this.offscreenCtx.drawImage(this.image, 0, 0);
            this.isImageLoaded = true;
        } catch (e) {
            console.warn("CORS Error / Source Tainting", e);
        }
    }

    // Crucial: Calculate the actual visual dimensions of the image inside the container
    // accounting for object-fit: contain
    updateVisualRect() {
        if (!this.image || !this.container) return;

        const containerW = this.container.clientWidth;
        const containerH = this.container.clientHeight;
        const imgNatW = this.image.naturalWidth || containerW;
        const imgNatH = this.image.naturalHeight || containerH;

        // Avoid division by zero
        if (imgNatH === 0) return;

        const imgRatio = imgNatW / imgNatH;
        const containerRatio = containerW / containerH;

        let finalW, finalH, finalX, finalY;

        if (containerRatio > imgRatio) {
            // Container is wider than image -> Image is height-constrained
            finalH = containerH;
            finalW = finalH * imgRatio;
            finalY = 0;
            finalX = (containerW - finalW) / 2;
        } else {
            // Container is taller than image -> Image is width-constrained
            finalW = containerW;
            finalH = finalW / imgRatio;
            finalX = 0;
            finalY = (containerH - finalH) / 2;
        }

        this.visualRect = { x: finalX, y: finalY, w: finalW, h: finalH };

        // Match canvas to full container, but we will limit drawing to visualRect
        this.canvas.width = containerW;
        this.canvas.height = containerH;
        this.updateTransform();
    }

    resizeCanvas() {
        this.updateVisualRect();
    }

    // Map screen/mouse coordinates to "Image Space" (0..1 relative to visual image)
    // Then map that to Natural Image pixel
    getPos(e) {
        const rect = this.canvas.getBoundingClientRect();

        // Mouse relative to Canvas Element (Top-Left)
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Apply Inverse Transform (Pan/Zoom)
        // Canvas Transform: translate(panX, panY) scale(scale)
        // So: (mouse - pan) / scale
        const transformedX = (mouseX - this.panX) / this.scale;
        const transformedY = (mouseY - this.panY) / this.scale;

        // Now map to Visual Rect
        // If x is inside [visualRect.x, visualRect.x + w]
        const relativeX = transformedX - this.visualRect.x;
        const relativeY = transformedY - this.visualRect.y;

        // Relaxed validity: Always return true so user can draw anywhere on canvas
        // We only restrict "Probe" or "Filters" processing strictly inside simple bounds if needed
        return {
            x: transformedX, // Canvas CS (for drawing UI like rulers on top)
            y: transformedY,
            relX: relativeX, // Image Relative CS (for pixels)
            relY: relativeY,
            valid: true
        };
    }

    // Map an Image Pixel (natural w/h) back to Canvas Coordinate for display
    project(natX, natY) {
        const ratioX = natX / this.image.naturalWidth;
        const ratioY = natY / this.image.naturalHeight;

        const visualX = this.visualRect.x + (ratioX * this.visualRect.w);
        const visualY = this.visualRect.y + (ratioY * this.visualRect.h);

        return {
            x: (visualX * this.scale) + this.panX,
            y: (visualY * this.scale) + this.panY
        };
    }

    setTool(tool) {
        // Debounce/Toggle logic can go here
        this.currentTool = tool;

        this.canvas.classList.remove('tool-zoom-in', 'tool-grabbing');
        this.canvas.style.cursor = 'default';

        if (tool === 'zoom') {
            this.canvas.classList.add('tool-zoom-in');
            this.canvas.style.cursor = 'grab';
        } else if (['pen', 'ruler', 'roi', 'lens', 'probe'].includes(tool)) {
            this.canvas.style.cursor = 'crosshair';
        }

        // Visual Feedback (Mini Toast)
        const toast = document.createElement('div');
        toast.innerText = `Tool: ${tool.toUpperCase()}`;
        Object.assign(toast.style, {
            position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
            background: '#10b981', color: '#fff', padding: '8px 16px', borderRadius: '20px',
            zIndex: 10000, fontSize: '0.9rem', pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        });
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 1000);

        const tooltip = document.querySelector('.probe-tooltip');
        if (tooltip) tooltip.style.display = 'none';

        if (['thermal', 'edge', 'sharpen', 'grid', 'symmetry', 'segment', 'zscore'].includes(tool)) {
            this.applyFilter(tool);
            this.currentTool = 'none';
        } else if (tool === 'none') {
            this.applyFilter('none');
        } else if (tool === 'invert') {
            this.toggleInvert();
            this.currentTool = 'none';
        }
    }

    applyFilter(filterName) {
        if (!this.isImageLoaded) {
            this.showErrorCallback("Image not fully loaded yet.");
            return;
        }

        if (this.activeFilter === filterName) {
            this.activeFilter = 'none';
        } else {
            this.activeFilter = filterName;
        }

        this.ctx.globalCompositeOperation = 'source-over'; // Reset
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.activeFilter === 'grid') {
            this.image.style.visibility = 'visible';
            this.drawGrid();
            return;
        }

        if (this.activeFilter === 'none') {
            this.image.style.visibility = 'visible';
            this.canvas.style.backgroundColor = 'transparent';
            return;
        }

        try {
            // For Pixel Filters
            const w = this.offscreenCanvas.width;
            const h = this.offscreenCanvas.height;

            // Special case for Symmetry (Geometric)
            if (this.activeFilter === 'symmetry') {
                // 1. Draw Original
                const tempC = document.createElement('canvas');
                tempC.width = w; tempC.height = h;
                const tCtx = tempC.getContext('2d');
                tCtx.drawImage(this.image, 0, 0, w, h);

                // 2. Draw Flipped with Difference
                tCtx.globalCompositeOperation = 'difference';
                tCtx.save();
                tCtx.scale(-1, 1);
                tCtx.drawImage(this.image, -w, 0, w, h);
                tCtx.restore();

                // 3. Boost Brightness/Contrast to make differences visible
                // (Optional, simple diff is often too dark)
                // Let's get pixel data and amplify
                const diffData = tCtx.getImageData(0, 0, w, h);
                const d = diffData.data;
                for (let i = 0; i < d.length; i += 4) {
                    // Amplify difference: x5
                    d[i] = Math.min(255, d[i] * 5);
                    d[i + 1] = Math.min(255, d[i + 1] * 5); // Green/Yellow tint?
                    d[i + 2] = Math.min(255, d[i + 2] * 2);
                }
                tCtx.putImageData(diffData, 0, 0);

                // Render to main
                this.image.style.visibility = 'hidden';
                this.ctx.fillStyle = '#000';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(tempC,
                    this.visualRect.x, this.visualRect.y, this.visualRect.w, this.visualRect.h
                );
                return;
            }

            // Standard Pixel Filters
            const srcData = this.offscreenCtx.getImageData(0, 0, w, h);
            const dstData = this.ctx.createImageData(w, h);

            if (this.activeFilter === 'thermal') this.filterThermal(srcData.data, dstData.data);
            else if (this.activeFilter === 'edge') this.filterSobel(srcData, dstData);
            else if (this.activeFilter === 'sharpen') this.filterConvolve(srcData, dstData, [0, -1, 0, -1, 5, -1, 0, -1, 0]);
            else if (this.activeFilter === 'segment') this.filterSegmentation(srcData.data, dstData.data);
            else if (this.activeFilter === 'zscore') this.filterZScore(srcData.data, dstData.data);

            const tempC = document.createElement('canvas');
            tempC.width = w; tempC.height = h;
            tempC.getContext('2d').putImageData(dstData, 0, 0);

            this.image.style.visibility = 'hidden';
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.drawImage(tempC,
                this.visualRect.x, this.visualRect.y, this.visualRect.w, this.visualRect.h
            );
        } catch (e) {
            console.error("Filter Error (CORS?):", e);
            this.showErrorCallback("Error applying filter: Tainted Canvas (CORS)");
            this.activeFilter = 'none';
            this.image.style.visibility = 'visible';
        }
    }

    showErrorCallback(msg) {
        const toast = document.createElement('div');
        toast.innerText = msg;
        Object.assign(toast.style, {
            position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
            background: '#ef4444', color: '#fff', padding: '8px 16px', borderRadius: '20px',
            zIndex: 10000, fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        });
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // ... Filters ...
    filterThermal(src, dst) {
        for (let i = 0; i < src.length; i += 4) {
            const g = (src[i] + src[i + 1] + src[i + 2]) / 3;
            let r = 0, G = 0, b = 0;
            if (g < 128) { b = 255 - (g * 2); G = g * 2; } else { b = 0; G = 255 - ((g - 128) * 2); r = (g - 128) * 2; }
            dst[i] = r; dst[i + 1] = G; dst[i + 2] = b; dst[i + 3] = 255;
        }
    }
    filterSegmentation(src, dst) {
        for (let i = 0; i < src.length; i += 4) {
            const v = (src[i] + src[i + 1] + src[i + 2]) / 3;
            dst[i + 3] = 255;
            if (v < 30) { dst[i] = 0; dst[i + 1] = 0; dst[i + 2] = 0; } // BG
            else if (v < 80) { dst[i] = 0; dst[i + 1] = 0; dst[i + 2] = 255; dst[i + 3] = 180; } // CSF
            else if (v < 150) { dst[i] = 255; dst[i + 1] = 165; dst[i + 2] = 0; dst[i + 3] = 200; } // Gray
            else if (v < 220) { dst[i] = 255; dst[i + 1] = 255; dst[i + 2] = 255; dst[i + 3] = 220; } // White
            else { dst[i] = 255; dst[i + 1] = 0; dst[i + 2] = 0; } // High Int
        }
    }

    filterZScore(src, dst) {
        let sum = 0, count = 0;
        for (let i = 0; i < src.length; i += 4) { if (src[i] > 15) { sum += src[i]; count++; } }
        const mean = count > 0 ? sum / count : 0;

        for (let i = 0; i < src.length; i += 4) {
            const v = src[i];
            dst[i + 3] = 255;
            if (v < 15) { dst[i] = 0; dst[i + 1] = 0; dst[i + 2] = 0; continue; }

            const diff = v - mean;
            if (diff > 50) { dst[i] = 255; dst[i + 1] = 0; dst[i + 2] = 0; }
            else if (diff > 20) { dst[i] = 255; dst[i + 1] = 255; dst[i + 2] = 0; }
            else if (diff < -20) { dst[i] = 0; dst[i + 1] = 0; dst[i + 2] = 255; }
            else { dst[i] = v; dst[i + 1] = v; dst[i + 2] = v; dst[i + 3] = 100; }
        }
    }

    filterSobel(src, dst) {
        // Simplified edge for brevity/speed
        const w = src.width; const h = src.height; const d = src.data; const res = dst.data;
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const i = (y * w + x) * 4;
                const gx = -d[i - 4] + d[i + 4]; // Simple H gradient
                const gy = -d[i - w * 4] + d[i + w * 4]; // Simple V gradient
                const mag = Math.abs(gx) + Math.abs(gy);
                res[i] = mag; res[i + 1] = mag; res[i + 2] = mag; res[i + 3] = 255;
            }
        }
    }
    filterConvolve(src, dst, k) {
        this.realConvolve(src, dst, k);
    }
    realConvolve(src, dst, kernel) {
        const w = src.width; const h = src.height; const d = src.data; const r = dst.data;
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                let rAcc = 0, gAcc = 0, bAcc = 0;
                // 3x3
                for (let ky = 0; ky < 3; ky++) {
                    for (let kx = 0; kx < 3; kx++) {
                        const idx = ((y + ky - 1) * w + (x + kx - 1)) * 4;
                        const kv = kernel[ky * 3 + kx];
                        rAcc += d[idx] * kv; gAcc += d[idx + 1] * kv; bAcc += d[idx + 2] * kv;
                    }
                }
                const tidx = (y * w + x) * 4;
                r[tidx] = rAcc; r[tidx + 1] = gAcc; r[tidx + 2] = bAcc; r[tidx + 3] = 255;
            }
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;

        this.ctx.beginPath();
        // Draw grid over visual rect
        const startX = this.visualRect.x;
        const startY = this.visualRect.y;
        const endX = startX + this.visualRect.w;
        const endY = startY + this.visualRect.h;

        // Draw visuals
        this.ctx.strokeRect(startX, startY, this.visualRect.w, this.visualRect.h);

        // Internal Grid
        for (let x = startX; x < endX; x += 50) {
            this.ctx.moveTo(x, startY); this.ctx.lineTo(x, endY);
        }
        for (let y = startY; y < endY; y += 50) {
            this.ctx.moveTo(startX, y); this.ctx.lineTo(endX, y);
        }
        this.ctx.stroke();
    }

    toggleInvert() {
        this.container.classList.toggle('invert-filter');
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.activeFilter = 'none';
        this.image.style.visibility = 'visible';
        this.canvas.style.backgroundColor = 'transparent';
        this.container.classList.remove('invert-filter');
        this.measurements = [];
        this.panX = 0; this.panY = 0; this.scale = 1;
        this.updateTransform();
        const panel = document.querySelector('.histogram-panel');
        if (panel) panel.style.display = 'none';
    }

    attachListeners() {
        if (!this.canvas) return;
        this.canvas.addEventListener('mousedown', (e) => this.startAction(e));
        this.canvas.addEventListener('mousemove', (e) => this.moveAction(e));
        this.canvas.addEventListener('mouseup', (e) => this.endAction(e));
        this.canvas.addEventListener('mouseout', (e) => {
            this.isDrawing = false;
            this.panning = false;
        });
        this.canvas.addEventListener('wheel', (e) => {
            if (this.currentTool === 'zoom') {
                e.preventDefault();
                this.handleWheel(e);
            }
        });
    }

    startAction(e) {
        if (this.currentTool === 'zoom') {
            this.panning = true;
            this.canvas.style.cursor = 'grabbing';
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        } else if (['pen', 'ruler', 'roi'].includes(this.currentTool)) {
            this.startDraw(e);
        }
    }

    moveAction(e) {
        if (this.currentTool === 'zoom' && this.panning) {
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            this.panX += dx;
            this.panY += dy;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.updateTransform();
        } else if (this.currentTool === 'probe') {
            this.handleProbe(e);
        } else if (this.currentTool === 'lens') {
            this.handleLens(e);
        } else {
            this.draw(e);
        }
    }

    endAction(e) {
        if (this.currentTool === 'zoom') {
            this.panning = false;
            this.canvas.style.cursor = 'grab';
        } else {
            this.endDraw(e);
        }
    }

    handleWheel(e) {
        const zoomIntensity = 0.1;
        const direction = e.deltaY < 0 ? 1 : -1;
        const newScale = this.scale + (direction * zoomIntensity);
        this.scale = Math.min(Math.max(1, newScale), 5);
        this.updateTransform();
    }

    updateTransform() {
        const t = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
        this.image.style.transform = t;
        // Apply transform to canvas as well to match
        this.canvas.style.transform = t;
        this.image.style.transformOrigin = 'center center';
        this.canvas.style.transformOrigin = 'center center';
    }

    // Tools
    handleProbe(e) {
        const pos = this.getPos(e);
        if (!pos.valid || !this.isImageLoaded) return;

        try {
            const natX = Math.floor((pos.relX / this.visualRect.w) * this.image.naturalWidth);
            const natY = Math.floor((pos.relY / this.visualRect.h) * this.image.naturalHeight);

            // Boundary checks
            if (natX < 0 || natX >= this.image.naturalWidth || natY < 0 || natY >= this.image.naturalHeight) return;

            const p = this.offscreenCtx.getImageData(natX, natY, 1, 1).data;
            const v = Math.round((p[0] + p[1] + p[2]) / 3);

            const t = document.querySelector('.probe-tooltip');
            if (t) {
                t.style.display = 'block';
                t.style.left = (e.clientX + 15) + 'px';
                t.style.top = (e.clientY + 15) + 'px';
                t.innerText = `HU: ${v} | RGB: ${p[0]},${p[1]},${p[2]}`;
            }
        } catch (err) { }
    }

    handleLens(e) {
        if (this.activeFilter !== 'none') return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const pos = this.getPos(e); // Canvas coords
        if (!pos.valid) return;

        const radius = 80;
        const zoom = 2;

        // Visual source coords
        const sx = pos.relX; // relative to visual rect
        const sy = pos.relY;

        // Scaling back to natural image source
        const ratioW = this.image.naturalWidth / this.visualRect.w;
        const ratioH = this.image.naturalHeight / this.visualRect.h;

        const sNatX = (sx - radius / zoom) * ratioW;
        const sNatY = (sy - radius / zoom) * ratioH;
        const sNatW = (radius * 2 / zoom) * ratioW;
        const sNatH = (radius * 2 / zoom) * ratioH;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2); // Draw Magnifier at MOUSE position (canvas coords)
        this.ctx.lineWidth = 2; this.ctx.strokeStyle = '#fff';
        this.ctx.stroke();
        this.ctx.clip();
        // Draw from natural image (higher res)
        try {
            this.ctx.drawImage(this.image, sNatX, sNatY, sNatW, sNatH, pos.x - radius, pos.y - radius, radius * 2, radius * 2);
        } catch (e) { }
        this.ctx.restore();
    }

    startDraw(e) {
        this.isDrawing = true;
        const pos = this.getPos(e);
        this.startX = pos.x;
        this.startY = pos.y;

        if (this.currentTool === 'pen') {
            this.ctx.beginPath();
            this.ctx.moveTo(this.startX, this.startY);
            this.ctx.strokeStyle = this.penColor;
            this.ctx.lineWidth = this.penWidth / this.scale;
            this.ctx.lineCap = 'round';
        } else if (['ruler', 'roi'].includes(this.currentTool)) {
            this.savedCanvasState = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    draw(e) {
        if (!this.isDrawing) return;
        const pos = this.getPos(e);

        if (this.currentTool === 'pen') {
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
        } else if (this.currentTool === 'ruler') {
            this.ctx.putImageData(this.savedCanvasState, 0, 0);
            this.ctx.beginPath();
            this.ctx.moveTo(this.startX, this.startY);
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.strokeStyle = this.rulerColor;
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
            // Text
            const d = Math.sqrt(Math.pow(pos.x - this.startX, 2) + Math.pow(pos.y - this.startY, 2));
            this.ctx.fillStyle = this.rulerColor;
            this.ctx.font = "14px monospace";
            this.ctx.fillText((d / 2).toFixed(1) + "mm", pos.x + 10, pos.y);
        } else if (this.currentTool === 'roi') {
            this.ctx.putImageData(this.savedCanvasState, 0, 0);
            this.ctx.strokeStyle = this.roiColor;
            const w = pos.x - this.startX;
            const h = pos.y - this.startY;
            this.ctx.strokeRect(this.startX, this.startY, w, h);
            this.ctx.fillStyle = "rgba(59,130,246,0.2)";
            this.ctx.fillRect(this.startX, this.startY, w, h);
        }
    }

    endDraw(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;
        if (this.currentTool === 'roi') {
            const pos = this.getPos(e);
            this.calculateHistogram(this.startX, this.startY, pos.x - this.startX, pos.y - this.startY);
        }
    }

    calculateHistogram(bx, by, bw, bh) {
        const panel = document.querySelector('.histogram-panel');
        if (!panel) return;

        // Ensure positive dimensions for calculation
        let x = bw < 0 ? bx + bw : bx;
        let y = bh < 0 ? by + bh : by;
        let w = Math.abs(bw);
        let h = Math.abs(bh);

        // Try to get stats
        try {
            // Map Canvas Box -> Visual Image Box -> Natural Image Box
            const vBx = x - this.visualRect.x;
            const vBy = y - this.visualRect.y;

            // Ratio
            const scaleX = this.image.naturalWidth / this.visualRect.w;
            const scaleY = this.image.naturalHeight / this.visualRect.h;

            const natX = Math.floor(vBx * scaleX);
            const natY = Math.floor(vBy * scaleY);
            const natW = Math.floor(w * scaleX);
            const natH = Math.floor(h * scaleY);


            // Safety
            if (natW <= 0 || natH <= 0) return;

            // Save Normalized ROI for API (0-1 range)
            this.lastRoi = {
                x: natX / this.image.naturalWidth,
                y: natY / this.image.naturalHeight,
                w: natW / this.image.naturalWidth,
                h: natH / this.image.naturalHeight
            };

            const data = this.offscreenCtx.getImageData(natX, natY, natW, natH).data;
            let min = 255, max = 0, sum = 0, count = 0;
            const buckets = new Array(50).fill(0); // 50 bins for smoother graph

            for (let i = 0; i < data.length; i += 4) {
                const val = (data[i] + data[i + 1] + data[i + 2]) / 3; // Grayscale avg
                if (val < min) min = val;
                if (val > max) max = val;
                sum += val;
                count++;

                // Histogram Bucket
                const bucketIdx = Math.floor((val / 255) * 49);
                if (buckets[bucketIdx] !== undefined) buckets[bucketIdx]++;
            }
            const avg = count > 0 ? (sum / count).toFixed(1) : 0;
            const maxBucket = Math.max(...buckets);

            // Render stats + Graph Canvas
            const graphId = `hist-canvas-${Date.now()}`;
            panel.innerHTML = `
                <div style="font-size:0.85rem; font-weight:600; margin-bottom:0.5rem; color:#fff;">ROI Statistics</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.8rem; color:#ccc;">
                    <div>Min Intensity: <span style="color:#fff">${Math.round(min)}</span></div>
                    <div>Max Intensity: <span style="color:#fff">${Math.round(max)}</span></div>
                    <div>Mean Intensity: <span style="color:#10b981">${avg}</span></div>
                    <div>Area: <span style="color:#fff">${(count * 0.264).toFixed(0)} mm²</span></div>
                    <div style="grid-column: span 2; color:#fcd34d; border-top:1px solid rgba(255,255,255,0.1); padding-top:4px; margin-top:4px;">
                        Est. Volume (Target): ~${((count * 0.264) * 0.5 * 0.001).toFixed(2)} cm³
                    </div>
                </div>
                <div style="margin-top:0.5rem; height:4px; background:rgba(255,255,255,0.1); border-radius:2px; margin-bottom: 0.8rem;">
                    <div style="width:${(avg / 255) * 100}%; height:100%; background:var(--primary); border-radius:2px;"></div>
                </div>
                <!-- Dynamic Histogram Graph -->
                <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:8px;">
                     <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:4px;">Intensity Distribution</div>
                     <canvas id="${graphId}" width="240" height="60" style="width:100%; height:60px;"></canvas>
                </div>
                <!-- Manual Annotation Button -->
                <button id="save-roi-btn" class="btn-xs" 
                    style="width:100%; margin-top:10px; background:linear-gradient(to right, #dc2626, #ef4444); color:white; border:none; padding:8px; border-radius:4px; cursor:pointer; font-weight:600; font-size:0.8rem;"
                    onclick="diagnosticCanvas.saveCurrentRoiAsTumor()">
                    🎯 Mark as Tumor & Update Report
                </button>
            `;
            panel.style.display = 'block';

            // Draw Graph immediately
            requestAnimationFrame(() => {
                const cvs = document.getElementById(graphId);
                if (!cvs) return;
                const ctx = cvs.getContext('2d');
                ctx.clearRect(0, 0, cvs.width, cvs.height);

                // Styles
                const barWidth = cvs.width / buckets.length;
                const gradient = ctx.createLinearGradient(0, 0, 0, cvs.height);
                gradient.addColorStop(0, '#34d399');
                gradient.addColorStop(1, '#059669');

                ctx.fillStyle = gradient;

                buckets.forEach((count, i) => {
                    const h = (count / maxBucket) * cvs.height;
                    const x = i * barWidth;
                    const y = cvs.height - h;
                    ctx.fillRect(x, y, barWidth - 1, h); // -1 for gap
                });
            });

        } catch (e) {
            console.error(e);
            panel.innerHTML = '<div style="color:#ef4444; font-size:0.8rem;">ROI Data Unavailable (CORS/Bounds)</div>';
            panel.style.display = 'block';
        }
    }

    playAnimation() {
        this.container.classList.add('scanning');
        setTimeout(() => this.container.classList.remove('scanning'), 2000);
    }

    async saveCurrentRoiAsTumor() {
        if (!this.lastRoi || !this.reportId) {
            this.showErrorCallback("No active selection or report ID missing.");
            return;
        }

        const btn = document.getElementById('save-roi-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerText = "Processing...";
        }

        try {
            const res = await fetch(`${API_URL}/api/reports/${this.reportId}/annotation`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(this.lastRoi)
            });

            if (res.ok) {
                const data = await res.json();
                this.showErrorCallback("✅ Annotation Saved! Refreshing...");
                if (btn) btn.innerText = "Saved!";

                // Trigger a refresh (reload page or re-render)
                // Simply reloading is safest to ensure all state (images, analytics) matches server
                setTimeout(() => {
                    location.reload();
                }, 1000);
            } else {
                const err = await res.json();
                this.showErrorCallback("Error: " + (err.detail || "Update failed"));
                if (btn) btn.innerText = "Failed";
                btn.disabled = false;
            }

        } catch (e) {
            console.error(e);
            this.showErrorCallback("Connection Error");
            if (btn) btn.innerText = "Failed";
            btn.disabled = false;
        }
    }
}


window.diagnosticCanvas = null;
function initDiagnosticTools(cid, iid, oid, reportId) {
    if (window.diagnosticCanvas) {
        // Optionally destroy old one
    }
    window.diagnosticCanvas = new DiagnosticCanvas(cid, iid, oid, reportId);

    document.querySelectorAll('.tool-btn').forEach(btn => {
        // Clone to remove old listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', (e) => {
            const tool = e.currentTarget.dataset.tool;
            if (tool === 'clear') { window.diagnosticCanvas.clear(); return; }
            if (tool === 'play') { window.diagnosticCanvas.playAnimation(); return; }

            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            window.diagnosticCanvas.setTool(tool);
        });
    });
}

// Expose Diagnostic Tools
window.initDiagnosticTools = initDiagnosticTools;

// Missing Features Restoration
window.drawBlueprint = function (canvasId, imageUrl) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Explicitly set dimensions if not already set, using parent
    if (canvas.width === 0 || canvas.height === 0) {
        canvas.width = canvas.parentElement ? canvas.parentElement.offsetWidth : 300;
        canvas.height = canvas.parentElement ? canvas.parentElement.offsetHeight : 300;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;

    img.onload = () => {
        // Re-check dims on load in case container resized
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;

        // Draw image fit to canvas (contain)
        const hRatio = canvas.width / img.width;
        const vRatio = canvas.height / img.height;
        const ratio = Math.min(hRatio, vRatio);
        const centerShift_x = (canvas.width - img.width * ratio) / 2;
        const centerShift_y = (canvas.height - img.height * ratio) / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, img.width, img.height, centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);

        // Retrieve pixel data for edge detection (Blueprint Look)
        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const w = canvas.width;
            const h = canvas.height;

            // Sobel Edge Detection
            const grayscale = new Uint8ClampedArray(w * h);
            for (let i = 0; i < data.length; i += 4) {
                grayscale[i / 4] = (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11);
            }

            const output = ctx.createImageData(w, h);
            const outData = output.data;

            for (let y = 1; y < h - 1; y++) {
                for (let x = 1; x < w - 1; x++) {
                    const idx = y * w + x;
                    const gx = -grayscale[idx - 1] + grayscale[idx + 1];
                    const gy = -grayscale[idx - w] + grayscale[idx + w];
                    const mag = Math.abs(gx) + Math.abs(gy);

                    const outIdx = idx * 4;
                    // Only draw edges
                    if (mag > 20) {
                        outData[outIdx] = 0;   // R
                        outData[outIdx + 1] = 200; // G (Cyan-ish)
                        outData[outIdx + 2] = 255; // B
                        outData[outIdx + 3] = 255; // Alpha
                    } else {
                        outData[outIdx + 3] = 0; // Transparent background
                    }
                }
            }
            ctx.putImageData(output, 0, 0);
        } catch (e) {
            console.warn("Blueprint effect blocked by CORS or error", e);
        }
    };
};

window.initHologramEffect = function (containerId, canvasId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Add grid background if not present
    container.style.backgroundImage = `
        linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
    `;
    container.style.backgroundSize = '20px 20px';

    // Create Scanning Line if not exists
    if (!container.querySelector('.hologram-scan-line')) {
        const scanLine = document.createElement('div');
        scanLine.className = 'hologram-scan-line';
        scanLine.style.position = 'absolute';
        scanLine.style.top = '0';
        scanLine.style.left = '0';
        scanLine.style.width = '100%';
        scanLine.style.height = '4px';
        scanLine.style.background = 'cyan';
        scanLine.style.boxShadow = '0 0 15px cyan';
        scanLine.style.opacity = '0.7';
        scanLine.style.animation = 'scanMove 3s linear infinite';
        scanLine.style.pointerEvents = 'none';

        container.appendChild(scanLine);
    }

    // Define animation if not exists
    if (!document.getElementById('scan-anim-style')) {
        const style = document.createElement('style');
        style.id = 'scan-anim-style';
        style.innerHTML = `
            @keyframes scanMove {
                0% { top: 0%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 100%; opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
};
