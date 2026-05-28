/* ==========================================================================
   CRYPTOVERSE // UI MANAGER & EVENT BINDING
   Manages DOM interactions, Canvas donut rendering, Web Audio SFX, and toast popups
   ========================================================================== */

// Self-contained Web Audio Synthesizer for premium retro-cyber sound design
class SoundFX {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playTone(freqs, type = 'sine', duration = 0.1, ramp = true) {
        try {
            this.init();
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }

            const now = this.ctx.currentTime;
            
            freqs.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gainNode = this.ctx.createGain();
                
                osc.type = type;
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                
                gainNode.gain.setValueAtTime(0.12, now + idx * 0.08);
                if (ramp) {
                    gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + duration);
                } else {
                    gainNode.gain.setValueAtTime(0.001, now + idx * 0.08 + duration);
                }

                osc.connect(gainNode);
                gainNode.connect(this.ctx.destination);
                
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + duration);
            });
        } catch (e) {
            console.warn('Web Audio playback failed or blocked by autoplay restrictions', e);
        }
    }

    buy() {
        this.playTone([523.25, 659.25, 783.99], 'sine', 0.25); // C5 -> E5 -> G5
    }

    sell() {
        this.playTone([783.99, 659.25, 523.25], 'sine', 0.25); // G5 -> E5 -> C5
    }

    news() {
        this.playTone([440, 554.37], 'triangle', 0.3); // A4 -> C#5
    }

    achievement() {
        this.playTone([261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50], 'triangle', 0.6); // Arpeggio C4->C6
    }
}

export const sfx = new SoundFX();

export class UIManager {
    constructor(state, chart, onSelectCoinCallback, onTradeCallback) {
        this.state = state;
        this.chart = chart;
        this.onSelectCoin = onSelectCoinCallback;
        this.onTrade = onTradeCallback;
        
        this.prevPrices = {}; // Cache to track price directions
        this.cacheDOM();
        this.bindEvents();
    }

    cacheDOM() {
        this.netWorth = document.getElementById('val-net-worth');
        this.totalPnL = document.getElementById('val-pnl');
        this.cash = document.getElementById('val-cash');
        this.btnSound = document.getElementById('btn-sound-toggle');
        this.btnReset = document.getElementById('btn-reset');
        this.watchlist = document.getElementById('watchlist-container');
        this.ledgerBody = document.getElementById('ledger-body');
        
        // Chart large headers
        this.chartSymbol = document.getElementById('chart-coin-symbol');
        this.chartName = document.getElementById('chart-coin-name');
        this.chartPrice = document.getElementById('chart-coin-price');
        this.chartChange = document.getElementById('chart-coin-change');
        
        // Form
        this.orderForm = document.getElementById('order-form');
        this.inputAmount = document.getElementById('input-amount');
        this.inputTotal = document.getElementById('input-total');
        this.inputLimit = document.getElementById('input-limit-price');
        this.limitGroup = document.getElementById('limit-price-group');
        this.btnSubmit = document.getElementById('btn-submit-order');
        this.availableFunds = document.getElementById('trade-available-funds');
        this.amountAssetLabel = document.getElementById('amount-asset-label');
        
        // News & Achievements
        this.newsContainer = document.getElementById('news-feed-container');
        this.achievementsGrid = document.getElementById('achievements-container');
        this.achievementsRatio = document.getElementById('badges-unlocked-ratio');
        this.toastContainer = document.getElementById('toast-container');
        
        // Tab elements
        this.tabBuy = document.getElementById('tab-buy');
        this.tabSell = document.getElementById('tab-sell');
        
        // Active transaction state
        this.currentTradeSide = 'BUY'; // default
    }

    bindEvents() {
        // Buy / Sell toggle tabs
        this.tabBuy.addEventListener('click', () => this.setTradeSide('BUY'));
        this.tabSell.addEventListener('click', () => this.setTradeSide('SELL'));

        // Reset balance button
        this.btnReset.addEventListener('click', () => {
            if (confirm('Are you sure you want to wipe portfolio holdings and reset USD to $50,000.00?')) {
                this.state.resetToDefaults();
                this.chart.updateData(this.state.getSelectedCoin().history, this.state.getSelectedCoin().color, this.state.timeframe, this.state.chartType);
                this.renderAll();
                this.spawnToast('Simulation variables reset to default values.', 'error');
            }
        });

        // Toggle sound button
        this.btnSound.addEventListener('click', () => {
            this.state.soundEnabled = !this.state.soundEnabled;
            this.updateSoundButton();
            this.state.saveState();
        });

        // Form interactive sync
        this.inputAmount.addEventListener('input', () => this.syncOrderInputs('amount'));
        this.inputTotal.addEventListener('input', () => this.syncOrderInputs('total'));
        
        // Radios toggle for limit/market orders
        const radios = document.querySelectorAll('input[name="order-type"]');
        radios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'limit') {
                    this.limitGroup.style.display = 'block';
                    this.inputLimit.value = this.state.getSelectedCoin().price.toFixed(2);
                } else {
                    this.limitGroup.style.display = 'none';
                    this.inputLimit.value = '';
                }
                this.clearOrderInputs();
            });
        });

        // Submit form
        this.orderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.processTrade();
        });

        // Percentage quick cuts
        const pctBtns = document.querySelectorAll('.pct-btn');
        pctBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const pct = parseInt(e.target.dataset.pct, 10);
                this.applyPercentageShortcut(pct);
            });
        });

        // Canvas chart switches
        document.getElementById('btn-chart-line').addEventListener('click', (e) => {
            document.querySelectorAll('.chart-toggle-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            this.state.chartType = 'line';
            this.state.saveState();
            this.updateActiveChart();
        });

        document.getElementById('btn-chart-candle').addEventListener('click', (e) => {
            document.querySelectorAll('.chart-toggle-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            this.state.chartType = 'candle';
            this.state.saveState();
            this.updateActiveChart();
        });

        // Timeframe selector buttons
        const timeframeBtns = document.querySelectorAll('.timeframe-btn');
        timeframeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                timeframeBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.state.timeframe = e.target.dataset.timeframe;
                this.state.saveState();
                this.updateActiveChart();
            });
        });

        // Hook up global achievement custom event
        window.addEventListener('achievement_unlocked', (e) => {
            const ach = e.detail;
            if (this.state.soundEnabled) sfx.achievement();
            this.spawnToast(`🏆 Achievement Unlocked: ${ach.title}!`, 'achievement', ach.description);
            this.renderAchievements();
        });

        // Hook up global news shock flash event
        window.addEventListener('news_flash', (e) => {
            const newsItem = e.detail;
            if (this.state.soundEnabled) sfx.news();
            this.spawnToast(`⚡ Market Alert: ${newsItem.headline}`, 'news');
            this.renderNews();
            this.renderWatchlist();
            this.renderTopStats();
            this.updateActiveChart();
        });
    }

    // Set UI Mode to Buy or Sell
    setTradeSide(side) {
        this.currentTradeSide = side;
        if (side === 'BUY') {
            this.tabBuy.classList.add('active');
            this.tabSell.classList.remove('active');
            this.btnSubmit.className = 'btn-execute-order buy';
            this.btnSubmit.textContent = 'PLACE MARKET BUY ORDER';
        } else {
            this.tabSell.classList.add('active');
            this.tabBuy.classList.remove('active');
            this.btnSubmit.className = 'btn-execute-order sell';
            this.btnSubmit.textContent = 'PLACE MARKET SELL ORDER';
        }
        this.clearOrderInputs();
        this.updateAvailableFundsText();
    }

    clearOrderInputs() {
        this.inputAmount.value = '';
        this.inputTotal.value = '';
    }

    // Real-time calculations: total USD vs coin quantity
    syncOrderInputs(changedInput) {
        const coin = this.state.getSelectedCoin();
        if (!coin) return;

        const isLimit = document.querySelector('input[name="order-type"]:checked').value === 'limit';
        const price = isLimit ? parseFloat(this.inputLimit.value) || coin.price : coin.price;

        if (changedInput === 'amount') {
            const amt = parseFloat(this.inputAmount.value) || 0;
            this.inputTotal.value = amt > 0 ? (amt * price).toFixed(2) : '';
        } else {
            const tot = parseFloat(this.inputTotal.value) || 0;
            this.inputAmount.value = tot > 0 ? (tot / price).toFixed(6) : '';
        }
    }

    applyPercentageShortcut(percent) {
        const coin = this.state.getSelectedCoin();
        if (!coin) return;

        const isLimit = document.querySelector('input[name="order-type"]:checked').value === 'limit';
        const price = isLimit ? parseFloat(this.inputLimit.value) || coin.price : coin.price;
        
        if (this.currentTradeSide === 'BUY') {
            const usdToSpend = this.state.cash * (percent / 100);
            this.inputTotal.value = usdToSpend > 0 ? usdToSpend.toFixed(2) : '';
            this.inputAmount.value = usdToSpend > 0 ? (usdToSpend / price).toFixed(6) : '';
        } else {
            const holding = this.state.holdings[coin.symbol];
            if (holding && holding.amount > 0) {
                const amtToSell = holding.amount * (percent / 100);
                this.inputAmount.value = amtToSell > 0 ? amtToSell.toFixed(6) : '';
                this.inputTotal.value = amtToSell > 0 ? (amtToSell * price).toFixed(2) : '';
            } else {
                this.clearOrderInputs();
            }
        }
    }

    updateAvailableFundsText() {
        const coin = this.state.getSelectedCoin();
        if (!coin) return;
        this.amountAssetLabel.textContent = coin.symbol;

        if (this.currentTradeSide === 'BUY') {
            this.availableFunds.textContent = `Available: $${this.state.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
        } else {
            const holding = this.state.holdings[coin.symbol];
            const heldAmt = holding ? holding.amount : 0;
            this.availableFunds.textContent = `Held: ${heldAmt.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${coin.symbol}`;
        }
    }

    processTrade() {
        const coin = this.state.getSelectedCoin();
        if (!coin) return;

        const amount = parseFloat(this.inputAmount.value);
        if (isNaN(amount) || amount <= 0) {
            this.spawnToast('Enter a valid trading amount greater than 0', 'error');
            return;
        }

        const isLimit = document.querySelector('input[name="order-type"]:checked').value === 'limit';
        const limitPrice = isLimit ? parseFloat(this.inputLimit.value) : null;

        if (isLimit && (isNaN(limitPrice) || limitPrice <= 0)) {
            this.spawnToast('Enter a valid limit price greater than 0', 'error');
            return;
        }

        // Limit order logic: if limit price != current price, we simulate placing it, but for gamification ease,
        // we execute immediately if the limit price fits the current price, otherwise throw mock warning.
        if (isLimit) {
            if (this.currentTradeSide === 'BUY' && limitPrice < coin.price) {
                this.spawnToast(`Limit Buy placed below market ($${limitPrice.toFixed(2)} vs $${coin.price.toFixed(2)}). Order queued.`, 'news');
                // Normally a real limit order engine would wait, but for this simulator, we run immediate matching
                // if price crosses. Let's just execute immediately for sandbox simplicity but record the limit price.
            } else if (this.currentTradeSide === 'SELL' && limitPrice > coin.price) {
                this.spawnToast(`Limit Sell placed above market ($${limitPrice.toFixed(2)} vs $${coin.price.toFixed(2)}). Order queued.`, 'news');
            }
        }

        try {
            const tx = this.state.executeOrder(coin.symbol, this.currentTradeSide, isLimit ? 'limit' : 'market', amount, limitPrice);
            
            if (this.state.soundEnabled) {
                if (this.currentTradeSide === 'BUY') sfx.buy();
                else sfx.sell();
            }

            this.spawnToast(
                `${this.currentTradeSide === 'BUY' ? 'Bought' : 'Sold'} ${amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${coin.symbol} for $${tx.total.toFixed(2)} USD`,
                this.currentTradeSide === 'BUY' ? 'buy' : 'sell'
            );

            this.clearOrderInputs();
            this.renderAll();
            
            if (this.onTrade) this.onTrade();
        } catch (err) {
            this.spawnToast(err.message, 'error');
        }
    }

    updateSoundButton() {
        if (this.state.soundEnabled) {
            this.btnSound.classList.remove('secondary');
            this.btnSound.querySelector('path').setAttribute('d', 'M12 3v18l-6-6H2V9h4l6-6zm3 9c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z');
        } else {
            this.btnSound.classList.add('secondary');
            // Muted SVG path
            this.btnSound.querySelector('path').setAttribute('d', 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l6 6v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z');
        }
    }

    updateActiveChart() {
        const coin = this.state.getSelectedCoin();
        if (!coin) return;

        // Render meta descriptions on main column
        this.chartSymbol.textContent = coin.symbol;
        this.chartName.textContent = coin.name;
        this.chartPrice.textContent = '$' + coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
        
        const change = coin.price - coin.price24hAgo;
        const changePct = (change / coin.price24hAgo) * 100;
        const sign = change >= 0 ? '+' : '';
        this.chartChange.className = `coin-change-large ${change >= 0 ? 'positive' : 'negative'}`;
        this.chartChange.textContent = `${sign}${changePct.toFixed(2)}%`;

        this.chart.updateData(coin.history, coin.color, this.state.timeframe, this.state.chartType);
        this.updateAvailableFundsText();
    }

    // --- Toast Alerts Builder ---
    spawnToast(msg, type = 'buy', description = '') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconHtml = '';
        if (type === 'buy') iconHtml = '🟢';
        else if (type === 'sell') iconHtml = '🔴';
        else if (type === 'achievement') iconHtml = '🏆';
        else if (type === 'news') iconHtml = '⚡';
        else iconHtml = '⚠️';

        toast.innerHTML = `
            <div class="toast-icon">${iconHtml}</div>
            <div class="toast-content">
                <div class="toast-msg">${msg}</div>
                ${description ? `<div class="toast-desc" style="font-size: 8px; color: #9ca3af; margin-top:2px;">${description}</div>` : ''}
            </div>
        `;

        this.toastContainer.appendChild(toast);

        // Slide out and remove after 4.5s
        setTimeout(() => {
            toast.classList.add('toast-fade-out');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4500);
    }

    // --- Render Pipeline ---
    renderAll() {
        this.updateSoundButton();
        this.renderTopStats();
        this.renderWatchlist();
        this.renderLedger();
        this.renderAchievements();
        this.renderDonutChart();
        this.updateActiveChart();
    }

    renderTopStats() {
        const netWorthVal = this.state.getNetWorth();
        this.netWorth.textContent = '$' + netWorthVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        this.cash.textContent = '$' + this.state.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        // Total PnL (net worth relative to starting $50,000 USD)
        const startingWorth = 50000.00;
        const pnlAbs = netWorthVal - startingWorth;
        const pnlPct = (pnlAbs / startingWorth) * 100;
        const sign = pnlAbs >= 0 ? '+' : '';
        
        this.totalPnL.className = `stat-val ${pnlAbs >= 0 ? 'positive' : 'negative'}`;
        this.totalPnL.textContent = `${sign}$${Math.abs(pnlAbs).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${sign}${pnlPct.toFixed(2)}%)`;
    }

    renderWatchlist() {
        this.watchlist.innerHTML = '';
        this.state.coins.forEach(coin => {
            const item = document.createElement('div');
            item.className = `watchlist-item ${coin.symbol === this.state.selectedCoinSymbol ? 'active' : ''}`;
            item.dataset.symbol = coin.symbol;

            const change = coin.price - coin.price24hAgo;
            const changePct = (change / coin.price24hAgo) * 100;
            const isPositive = change >= 0;
            const sign = isPositive ? '+' : '';

            // Detect blink flashes on price change
            let flashClass = '';
            if (this.prevPrices[coin.symbol]) {
                if (coin.price > this.prevPrices[coin.symbol]) {
                    flashClass = 'flash-up';
                } else if (coin.price < this.prevPrices[coin.symbol]) {
                    flashClass = 'flash-down';
                }
            }
            this.prevPrices[coin.symbol] = coin.price;

            // Generate sparkline path points
            const sparkPoints = this.generateSparklineSvgPath(coin.history);

            item.innerHTML = `
                <div class="coin-identity">
                    <div class="coin-icon" style="border-color: ${coin.color}50; box-shadow: 0 0 8px ${coin.color}20;">
                        ${coin.symbol}
                    </div>
                    <div>
                        <div class="coin-symbol">${coin.symbol}</div>
                        <div class="coin-name">${coin.name}</div>
                    </div>
                </div>
                <div class="coin-sparkline-box">
                    <svg width="70" height="24" style="overflow: visible;">
                        <path d="${sparkPoints}" fill="none" stroke="${coin.color}" stroke-width="1.5" />
                    </svg>
                </div>
                <div class="watchlist-pnl">
                    <div class="watchlist-price ${flashClass}">$${coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</div>
                    <div class="watchlist-change ${isPositive ? 'positive' : 'negative'}">${sign}${changePct.toFixed(2)}%</div>
                </div>
            `;

            item.addEventListener('click', () => {
                this.state.selectedCoinSymbol = coin.symbol;
                this.state.saveState();
                
                // Toggle active styles
                document.querySelectorAll('.watchlist-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');

                this.updateActiveChart();
                this.clearOrderInputs();
                this.updateAvailableFundsText();
                
                if (this.onSelectCoin) this.onSelectCoin(coin);
            });

            this.watchlist.appendChild(item);
        });
    }

    generateSparklineSvgPath(history) {
        if (!history || history.length < 5) return 'M0,12 L70,12';
        
        // Grab the last 20 ticks
        const slice = history.slice(-20);
        let min = Infinity;
        let max = -Infinity;
        slice.forEach(t => {
            if (t.price < min) min = t.price;
            if (t.price > max) max = t.price;
        });

        const span = max - min || 1;
        const width = 70;
        const height = 20; // 2px margin top/bottom
        const dx = width / (slice.length - 1);

        let path = '';
        slice.forEach((t, i) => {
            const x = i * dx;
            const y = height - ((t.price - min) / span) * height + 2;
            if (i === 0) path += `M${x.toFixed(1)},${y.toFixed(1)}`;
            else path += ` L${x.toFixed(1)},${y.toFixed(1)}`;
        });
        return path;
    }

    renderLedger() {
        this.ledgerBody.innerHTML = '';
        if (this.state.transactions.length === 0) {
            this.ledgerBody.innerHTML = `
                <tr class="no-records-row">
                    <td colspan="4">No trades executed yet.</td>
                </tr>
            `;
            return;
        }

        this.state.transactions.slice(0, 15).forEach(tx => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="${tx.type === 'BUY' ? 'ledger-type-buy' : 'ledger-type-sell'}">${tx.type}</td>
                <td>${tx.symbol}</td>
                <td>${tx.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                <td>$${tx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            `;
            this.ledgerBody.appendChild(tr);
        });
    }

    renderAchievements() {
        this.achievementsGrid.innerHTML = '';
        
        let countUnlocked = 0;
        this.state.achievements.forEach(ach => {
            if (ach.unlocked) countUnlocked++;

            const badge = document.createElement('div');
            badge.className = `achievement-badge ${ach.unlocked ? 'unlocked' : 'locked'}`;
            badge.setAttribute('data-tooltip', ach.description);

            badge.innerHTML = `
                <svg class="badge-art" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="${ach.svg}"/>
                </svg>
                <div class="badge-title">${ach.title}</div>
            `;
            this.achievementsGrid.appendChild(badge);
        });

        this.achievementsRatio.textContent = `${countUnlocked} / ${this.state.achievements.length}`;
    }

    renderNews() {
        this.newsContainer.innerHTML = '';
        // Pull latest 10 items
        const newsItems = this.newsContainer.parentElement.querySelector('#news-feed-container');
        
        this.state.newsLog.slice(0, 15).forEach(news => {
            const item = document.createElement('div');
            item.className = `news-item impact-${news.impact}`;
            
            const timeStr = new Date(news.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            let impactBadgeText = news.impact.toUpperCase();
            if (news.type === 'positive' || news.type === 'global_positive') impactBadgeText += ' ▲';
            else if (news.type === 'negative' || news.type === 'global_negative') impactBadgeText += ' ▼';

            item.innerHTML = `
                <div class="news-meta">
                    <span class="news-time">${timeStr}</span>
                    <span class="news-impact">${impactBadgeText}</span>
                </div>
                <div class="news-headline">${news.headline}</div>
            `;
            this.newsContainer.appendChild(item);
        });
    }

    // --- Donut allocation renderer ---
    renderDonutChart() {
        const canvas = document.getElementById('portfolio-pie-chart');
        const legend = document.getElementById('portfolio-pie-legend');
        if (!canvas || !legend) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        
        // Clear and match drawing coordinates to canvas size
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const outerRadius = Math.min(centerX, centerY) - 8;
        const innerRadius = outerRadius - 14;

        // Calculate assets allocation data
        const netWorth = this.state.getNetWorth();
        const data = [];

        // Cash component
        if (this.state.cash > 0) {
            data.push({
                symbol: 'USD',
                value: this.state.cash,
                color: '#ffb703' // Gold
            });
        }

        // Crypto components
        this.state.coins.forEach(coin => {
            const holding = this.state.holdings[coin.symbol];
            if (holding && holding.amount > 0) {
                const val = holding.amount * coin.price;
                if (val > 0.01) {
                    data.push({
                        symbol: coin.symbol,
                        value: val,
                        color: coin.color
                    });
                }
            }
        });

        // If no value exists at all, put placeholder
        if (data.length === 0) {
            data.push({ symbol: 'NONE', value: 1, color: '#374151' });
        }

        // Draw Arcs
        let startAngle = -Math.PI / 2;
        data.forEach(slice => {
            const fraction = slice.value / netWorth || 1;
            const sliceAngle = fraction * Math.PI * 2;

            ctx.beginPath();
            ctx.arc(centerX, centerY, outerRadius, startAngle, startAngle + sliceAngle);
            ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
            ctx.closePath();
            
            ctx.fillStyle = slice.color;
            ctx.fill();

            startAngle += sliceAngle;
        });

        // Draw center hole highlight borders
        ctx.strokeStyle = '#0c0f17';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Build dynamic legend HTML
        legend.innerHTML = '';
        data.forEach(slice => {
            const val = slice.symbol === 'NONE' ? 0 : slice.value;
            const fraction = val / netWorth;
            const percentStr = isNaN(fraction) ? '0.00%' : (fraction * 100).toFixed(2) + '%';
            
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <div class="legend-left">
                    <span class="legend-dot" style="background-color: ${slice.color}"></span>
                    <span class="legend-symbol">${slice.symbol}</span>
                </div>
                <div class="legend-right">
                    <span class="legend-pct">${percentStr}</span>
                    <span class="legend-val">$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
            `;
            legend.appendChild(item);
        });
    }
}
