/* ==========================================================================
   CRYPTOVERSE // CANVAS CHARTING ENGINE
   Handles rendering of high-fidelity Line and Candlestick charts with crosshairs
   ========================================================================== */

export class CryptoChart {
    constructor(canvasId, onHoverCallback) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas with ID ${canvasId} not found.`);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.onHover = onHoverCallback; // Callback to update price metadata on hover
        
        // Internal sizing/padding parameters
        this.padding = { top: 20, right: 70, bottom: 25, left: 10 };
        this.hoveredPoint = null;
        this.mousePos = { x: null, y: null };
        this.chartData = [];
        this.coinColor = '#00e5ff';
        
        this.initEvents();
        this.resize();
    }

    initEvents() {
        window.addEventListener('resize', () => this.resize());
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            // Scaling factors in case the canvas coordinate system size differs from CSS size
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            this.mousePos.x = (e.clientX - rect.left) * scaleX;
            this.mousePos.y = (e.clientY - rect.top) * scaleY;
            
            this.updateHoverState();
            this.draw();
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mousePos = { x: null, y: null };
            this.hoveredPoint = null;
            if (this.onHover) this.onHover(null); // Signal hover ended
            this.draw();
        });
    }

    resize() {
        const parent = this.canvas.parentElement;
        if (parent) {
            this.canvas.width = parent.clientWidth * window.devicePixelRatio;
            this.canvas.height = parent.clientHeight * window.devicePixelRatio;
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
            
            // Adjust scaling
            this.ctx.scale(1, 1);
        }
        this.draw();
    }

    updateData(coinHistory, coinColor, timeframe, chartType) {
        this.coinColor = coinColor || '#00e5ff';
        this.chartType = chartType || 'line';
        
        // Filter history based on timeframe
        const now = Date.now();
        let cutoffTime = now - 60 * 60 * 1000; // default 1H
        if (timeframe === '1m') {
            cutoffTime = now - 30 * 60 * 1000; // Last 30 minutes
        } else if (timeframe === '5m') {
            cutoffTime = now - 150 * 60 * 1000; // Last 2.5 hours
        } else if (timeframe === '1h') {
            cutoffTime = now - 24 * 60 * 60 * 1000; // Last 24 hours
        }
        
        this.chartData = coinHistory.filter(d => d.time >= cutoffTime);
        
        // If data is too sparse, pad it
        if (this.chartData.length < 2) {
            this.chartData = coinHistory.slice(-20);
        }

        this.updateHoverState();
        this.draw();
    }

    updateHoverState() {
        if (!this.mousePos.x || this.chartData.length === 0) {
            this.hoveredPoint = null;
            return;
        }

        const width = this.canvas.width;
        const height = this.canvas.height;
        const chartWidth = width - this.padding.left - this.padding.right;
        const xStep = chartWidth / (this.chartData.length - 1);

        // Find the index of the closest data point based on mouse X coordinate
        const targetX = this.mousePos.x - this.padding.left;
        let index = Math.round(targetX / xStep);
        index = Math.max(0, Math.min(this.chartData.length - 1, index));

        const point = this.chartData[index];
        const valRange = this.getValueRange();
        
        // Calculate coords of this point
        const y = this.getYCoord(point.price, valRange.min, valRange.max);
        const x = this.padding.left + index * xStep;

        this.hoveredPoint = {
            ...point,
            index: index,
            x: x,
            y: y
        };

        if (this.onHover) {
            this.onHover(this.hoveredPoint);
        }
    }

    getValueRange() {
        if (this.chartData.length === 0) return { min: 0, max: 100 };
        
        let min = Infinity;
        let max = -Infinity;
        
        this.chartData.forEach(d => {
            if (d.price < min) min = d.price;
            if (d.price > max) max = d.price;
        });

        // Add 5% padding to top and bottom of value range
        const buffer = (max - min) * 0.05 || min * 0.05 || 1;
        return {
            min: Math.max(0, min - buffer),
            max: max + buffer
        };
    }

    getYCoord(price, minVal, maxVal) {
        const height = this.canvas.height;
        const chartHeight = height - this.padding.top - this.padding.bottom;
        const ratio = (price - minVal) / (maxVal - minVal);
        // Canvas Y starts at top, so subtract from canvas height
        return this.canvas.height - this.padding.bottom - (ratio * chartHeight);
    }

    draw() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        this.ctx.clearRect(0, 0, width, height);

        if (this.chartData.length < 2) {
            this.drawNoData();
            return;
        }

        const range = this.getValueRange();
        
        // Draw grid lines
        this.drawGrid(range.min, range.max);

        // Draw active chart
        if (this.chartType === 'candle') {
            this.drawCandlesticks(range.min, range.max);
        } else {
            this.drawLineChart(range.min, range.max);
        }

        // Draw mouse hover overlay if active
        if (this.hoveredPoint && this.mousePos.x !== null) {
            this.drawCrosshairs(range.min, range.max);
        }
    }

    drawNoData() {
        this.ctx.font = '12px Space Grotesk';
        this.ctx.fillStyle = '#6b7280';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('LOADING MARKET STREAM...', this.canvas.width / 2, this.canvas.height / 2);
    }

    drawGrid(minVal, maxVal) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const chartWidth = width - this.padding.left - this.padding.right;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);

        // Draw 5 horizontal price gridlines
        const lines = 4;
        this.ctx.font = '9px Space Grotesk';
        this.ctx.fillStyle = '#4b5563';
        this.ctx.textAlign = 'left';

        for (let i = 0; i <= lines; i++) {
            const price = minVal + (i / lines) * (maxVal - minVal);
            const y = this.getYCoord(price, minVal, maxVal);

            // Draw line
            this.ctx.beginPath();
            this.ctx.moveTo(this.padding.left, y);
            this.ctx.lineTo(this.padding.left + chartWidth, y);
            this.ctx.stroke();

            // Draw Y-axis text
            this.ctx.setLineDash([]);
            this.ctx.fillText('$' + this.formatPriceLabel(price), this.padding.left + chartWidth + 8, y + 3);
            this.ctx.setLineDash([5, 5]);
        }
        this.ctx.setLineDash([]);
    }

    drawLineChart(minVal, maxVal) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const chartWidth = width - this.padding.left - this.padding.right;
        const xStep = chartWidth / (this.chartData.length - 1);

        // Path creation
        this.ctx.beginPath();
        this.chartData.forEach((d, i) => {
            const x = this.padding.left + i * xStep;
            const y = this.getYCoord(d.price, minVal, maxVal);
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });

        // Style and stroke line chart (neon glow)
        this.ctx.strokeStyle = this.coinColor;
        this.ctx.lineWidth = 2.5;
        this.ctx.shadowColor = this.coinColor;
        this.ctx.shadowBlur = 8;
        this.ctx.stroke();
        
        // Reset shadows for gradient fill
        this.ctx.shadowBlur = 0;

        // Fill area gradient
        const fillGrad = this.ctx.createLinearGradient(0, this.padding.top, 0, height - this.padding.bottom);
        fillGrad.addColorStop(0, this.hexToRgbA(this.coinColor, 0.18));
        fillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        this.ctx.lineTo(this.padding.left + chartWidth, height - this.padding.bottom);
        this.ctx.lineTo(this.padding.left, height - this.padding.bottom);
        this.ctx.closePath();
        
        this.ctx.fillStyle = fillGrad;
        this.ctx.fill();
    }

    drawCandlesticks(minVal, maxVal) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const chartWidth = width - this.padding.left - this.padding.right;
        
        // Aggregate raw ticks into candle bars
        const numCandles = Math.min(32, Math.floor(chartWidth / 14));
        const ticksPerCandle = Math.ceil(this.chartData.length / numCandles);
        const candleWidth = Math.max(4, Math.floor(chartWidth / numCandles) - 3);

        const upColor = '#00ff87';
        const downColor = '#ff3366';

        for (let c = 0; c < numCandles; c++) {
            const startIdx = c * ticksPerCandle;
            const endIdx = Math.min(this.chartData.length - 1, startIdx + ticksPerCandle - 1);
            if (startIdx >= this.chartData.length) break;

            const candleTicks = this.chartData.slice(startIdx, endIdx + 1);
            if (candleTicks.length === 0) continue;

            const open = candleTicks[0].price;
            const close = candleTicks[candleTicks.length - 1].price;
            
            let high = -Infinity;
            let low = Infinity;
            candleTicks.forEach(t => {
                if (t.price > high) high = t.price;
                if (t.price < low) low = t.price;
            });

            // Calculate coordinates
            const x = this.padding.left + (c * (chartWidth / numCandles)) + (chartWidth / numCandles) / 2;
            const yOpen = this.getYCoord(open, minVal, maxVal);
            const yClose = this.getYCoord(close, minVal, maxVal);
            const yHigh = this.getYCoord(high, minVal, maxVal);
            const yLow = this.getYCoord(low, minVal, maxVal);

            const isUp = close >= open;
            const color = isUp ? upColor : downColor;

            this.ctx.strokeStyle = color;
            this.ctx.fillStyle = color;
            this.ctx.lineWidth = 1.2;

            // Draw wick line
            this.ctx.beginPath();
            this.ctx.moveTo(x, yHigh);
            this.ctx.lineTo(x, yLow);
            this.ctx.stroke();

            // Draw body box
            const bodyY = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));
            
            this.ctx.beginPath();
            this.ctx.rect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
            this.ctx.fill();
        }
    }

    drawCrosshairs(minVal, maxVal) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const chartWidth = width - this.padding.left - this.padding.right;

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]);

        // Vertical line
        this.ctx.beginPath();
        this.ctx.moveTo(this.hoveredPoint.x, this.padding.top);
        this.ctx.lineTo(this.hoveredPoint.x, height - this.padding.bottom);
        this.ctx.stroke();

        // Horizontal line
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding.left, this.hoveredPoint.y);
        this.ctx.lineTo(this.padding.left + chartWidth, this.hoveredPoint.y);
        this.ctx.stroke();

        this.ctx.setLineDash([]);

        // Glowing point on line
        this.ctx.beginPath();
        this.ctx.arc(this.hoveredPoint.x, this.hoveredPoint.y, 5, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fff';
        this.ctx.shadowColor = this.coinColor;
        this.ctx.shadowBlur = 10;
        this.ctx.fill();
        this.ctx.strokeStyle = this.coinColor;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.shadowBlur = 0; // reset

        // Draw values tags along axes
        this.drawAxisTagX();
        this.drawAxisTagY(minVal, maxVal);
    }

    drawAxisTagX() {
        const height = this.canvas.height;
        const timeStr = new Date(this.hoveredPoint.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        this.ctx.font = '8px Space Grotesk';
        this.ctx.fillStyle = '#0f172a';
        
        const textWidth = this.ctx.measureText(timeStr).width;
        const boxWidth = textWidth + 12;
        const boxHeight = 16;
        const boxX = Math.max(this.padding.left, Math.min(this.canvas.width - this.padding.right - boxWidth, this.hoveredPoint.x - boxWidth / 2));
        const boxY = height - this.padding.bottom + 4;

        // Draw solid tag background
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        
        // Draw text
        this.ctx.fillStyle = '#000000';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(timeStr, boxX + boxWidth / 2, boxY + 11);
    }

    drawAxisTagY(minVal, maxVal) {
        const width = this.canvas.width;
        const chartWidth = width - this.padding.left - this.padding.right;
        const priceStr = '$' + this.hoveredPoint.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });

        this.ctx.font = '8px Space Grotesk';
        
        const textWidth = this.ctx.measureText(priceStr).width;
        const boxWidth = textWidth + 8;
        const boxHeight = 16;
        const boxX = this.padding.left + chartWidth + 4;
        const boxY = this.hoveredPoint.y - boxHeight / 2;

        // Draw solid tag background
        this.ctx.fillStyle = this.coinColor;
        this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        
        // Draw text
        this.ctx.fillStyle = '#000000';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(priceStr, boxX + 4, boxY + 11);
    }

    // Helper functions
    formatPriceLabel(num) {
        if (num >= 1000) {
            return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
        } else if (num >= 1) {
            return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        } else {
            return num.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
        }
    }

    hexToRgbA(hex, alpha) {
        let c;
        if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
            c = hex.substring(1).split('');
            if (c.length === 3) {
                c = [c[0], c[0], c[1], c[1], c[2], c[2]];
            }
            c = '0x' + c.join('');
            return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
        }
        return hex;
    }
}
