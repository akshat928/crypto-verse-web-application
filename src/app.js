/* ==========================================================================
   CRYPTOVERSE // MAIN ENTRY POINT
   Bootstraps state, charts, news, UI modules, and drives simulation ticks
   ========================================================================== */

import { AppState } from './state.js';
import { CryptoChart } from './chart.js';
import { NewsEngine } from './news.js';
import { UIManager } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize State
    const state = new AppState();

    // 2. Initialize Canvas Charting View
    // On hover callback updates the price display header dynamically
    const chart = new CryptoChart('trading-chart', (hoveredPoint) => {
        const symbolPriceEl = document.getElementById('chart-coin-price');
        const symbolChangeEl = document.getElementById('chart-coin-change');
        
        if (hoveredPoint) {
            // Show price under hover crosshair
            symbolPriceEl.textContent = '$' + hoveredPoint.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
            
            // Re-calculate change percentage relative to the 24h ago baseline at that hovered instant
            const coin = state.getSelectedCoin();
            const change = hoveredPoint.price - coin.price24hAgo;
            const changePct = (change / coin.price24hAgo) * 100;
            const sign = change >= 0 ? '+' : '';
            
            symbolChangeEl.className = `coin-change-large ${change >= 0 ? 'positive' : 'negative'}`;
            symbolChangeEl.textContent = `${sign}${changePct.toFixed(2)}% (Lookup)`;
        } else {
            // Reset to live price
            const coin = state.getSelectedCoin();
            if (coin) {
                symbolPriceEl.textContent = '$' + coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
                
                const change = coin.price - coin.price24hAgo;
                const changePct = (change / coin.price24hAgo) * 100;
                const sign = change >= 0 ? '+' : '';
                
                symbolChangeEl.className = `coin-change-large ${change >= 0 ? 'positive' : 'negative'}`;
                symbolChangeEl.textContent = `${sign}${changePct.toFixed(2)}%`;
            }
        }
    });

    // 3. Initialize News / Market Shocker
    const news = new NewsEngine(state);

    // 4. Initialize UI manager and DOM listeners
    const ui = new UIManager(
        state, 
        chart,
        // On selection callback
        () => {
            // Price chart updates automatically
        },
        // On trade transaction executed callback
        () => {
            // Transaction logs update automatically
        }
    );

    // 5. Connect initial news list to UI
    ui.newsLog = news.newsLog; // share array ref
    ui.renderNews();

    // 6. Perform first full visual render
    ui.renderAll();

    // 7. Core Simulation Loop (Market Ticks)
    // Runs price drift/fluctuations every 2.5 seconds
    setInterval(() => {
        const tickTime = Date.now();
        state.tickMarket(tickTime);
        
        // Re-render components with fresh tick prices
        ui.renderWatchlist();
        ui.renderTopStats();
        ui.renderDonutChart();
        
        // Update main chart active line only if the user is not actively hovering details
        if (!chart.hoveredPoint) {
            ui.updateActiveChart();
        } else {
            // Still update the background data array in chart class so it remains live
            const activeCoin = state.getSelectedCoin();
            chart.updateData(activeCoin.history, activeCoin.color, state.timeframe, state.chartType);
        }
    }, 2500);

    // 8. Periodic News Flash Engine
    // On average every 30 seconds (15% chance every 4.5 seconds)
    setInterval(() => {
        if (Math.random() < 0.15) {
            news.triggerNewsTick();
        }
    }, 4500);
    
    // Check initial achievements on boot
    state.evaluateGeneralAchievements();
});
