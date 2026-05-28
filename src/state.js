/* ==========================================================================
   CRYPTOVERSE // STATE ENGINE
   Manages simulation state, transaction history, achievements, and persistent storage
   ========================================================================== */

const STORAGE_KEY = 'cryptoverse_sim_state';

// Constants for assets initial specifications
export const INITIAL_COINS = [
    { symbol: 'BTC', name: 'Bitcoin', price: 67240.00, volatility: 0.006, drift: 0.00005, color: '#f7931a' },
    { symbol: 'ETH', name: 'Ethereum', price: 3480.00, volatility: 0.008, drift: 0.00007, color: '#627eea' },
    { symbol: 'SOL', name: 'Solana', price: 168.50, volatility: 0.015, drift: 0.00015, color: '#14f195' },
    { symbol: 'ANT', name: 'Antigravity Token', price: 12.40, volatility: 0.025, drift: 0.00030, color: '#00e5ff' },
    { symbol: 'ADA', name: 'Cardano', price: 0.46, volatility: 0.012, drift: -0.00002, color: '#0033ad' },
    { symbol: 'GMN', name: 'Gemini Coin', price: 1.00, volatility: 0.0015, drift: 0.00000, color: '#0055ff' }
];

export const INITIAL_ACHIEVEMENTS = [
    { id: 'first_trade', title: 'First Trade', description: 'Execute any buy or sell order.', unlocked: false, svg: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
    { id: 'diversified', title: 'Asset Allocator', description: 'Hold 4 or more different cryptocurrencies simultaneously.', unlocked: false, svg: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z' },
    { id: 'whale', title: 'Crypto Whale', description: 'Reach a total net worth of $250,000 USD.', unlocked: false, svg: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-1 5h2v6h-2v-6z' },
    { id: 'diamond_hands', title: 'Diamond Hands', description: 'Sell a coin for more than 50% profit over average buy price.', unlocked: false, svg: 'M12 2L2 9l10 13 10-13L12 2zm1 14.5V18h-2v-1.5c-1.1 0-2-.9-2-2h2c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1c-1.65 0-3-.85-3-2.5s1.35-2.5 3-2.5V7h2v1.5c1.1 0 2 .9 2 2h-2c0-.55-.45-1-1-1s-1 .45-1 1 .45 1 1 1c1.65 0 3 .85 3 2.5s-1.35 2.5-3 2.5z' },
    { id: 'paper_hands', title: 'Paper Hands', description: 'Sell any holding at a loss.', unlocked: false, svg: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z' },
    { id: 'all_in', title: 'All In', description: 'Reduce USD balance to less than $10.00 while holding assets.', unlocked: false, svg: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z' },
    { id: 'moonshot', title: 'Moonshot', description: 'Hold a single crypto position valued at over $100,000 USD.', unlocked: false, svg: 'M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z' },
    { id: 'antigravitational', title: 'Anti-Gravitational', description: 'Hold at least 1,000 Antigravity Tokens (ANT).', unlocked: false, svg: 'M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z' }
];

export class AppState {
    constructor() {
        this.loadState();
    }

    loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                this.cash = parsed.cash ?? 50000.00;
                this.holdings = parsed.holdings ?? {};
                this.transactions = parsed.transactions ?? [];
                
                // Load coins and reconstruct their history
                this.coins = parsed.coins ? parsed.coins.map(stored => {
                    const template = INITIAL_COINS.find(c => c.symbol === stored.symbol) || stored;
                    return {
                        ...template,
                        price: stored.price,
                        price24hAgo: stored.price24hAgo ?? template.price,
                        history: stored.history || []
                    };
                }) : this.generateInitialMockCoins();

                // Load achievements
                this.achievements = INITIAL_ACHIEVEMENTS.map(ach => {
                    const savedAch = parsed.achievements?.find(a => a.id === ach.id);
                    return {
                        ...ach,
                        unlocked: savedAch ? savedAch.unlocked : false
                    };
                });

                this.selectedCoinSymbol = parsed.selectedCoinSymbol ?? 'BTC';
                this.timeframe = parsed.timeframe ?? '1m';
                this.chartType = parsed.chartType ?? 'line';
                this.soundEnabled = parsed.soundEnabled ?? true;
                return;
            }
        } catch (e) {
            console.error('Failed to load state from localStorage, initializing fresh', e);
        }

        // Initialize default fresh state
        this.resetToDefaults();
    }

    saveState() {
        try {
            const dataToSave = {
                cash: this.cash,
                holdings: this.holdings,
                transactions: this.transactions,
                coins: this.coins.map(c => ({
                    symbol: c.symbol,
                    price: c.price,
                    price24hAgo: c.price24hAgo,
                    history: c.history
                })),
                achievements: this.achievements.map(a => ({
                    id: a.id,
                    unlocked: a.unlocked
                })),
                selectedCoinSymbol: this.selectedCoinSymbol,
                timeframe: this.timeframe,
                chartType: this.chartType,
                soundEnabled: this.soundEnabled
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (e) {
            console.error('Failed to save state to localStorage', e);
        }
    }

    resetToDefaults() {
        this.cash = 50000.00;
        this.holdings = {};
        this.transactions = [];
        this.coins = this.generateInitialMockCoins();
        this.achievements = INITIAL_ACHIEVEMENTS.map(a => ({ ...a, unlocked: false }));
        this.selectedCoinSymbol = 'BTC';
        this.timeframe = '1m';
        this.chartType = 'line';
        this.soundEnabled = true;
        this.saveState();
    }

    generateInitialMockCoins() {
        const now = Date.now();
        return INITIAL_COINS.map(coin => {
            const history = [];
            // Generate 150 points of historical data backwards
            let currentPrice = coin.price;
            
            // Generate historical values using a random walk backwards
            for (let i = 150; i >= 0; i--) {
                const time = now - i * 60 * 1000; // 1-minute steps
                const randomChange = (Math.random() - 0.5 - coin.drift) * coin.volatility;
                // Move backwards
                currentPrice = currentPrice / (1 + randomChange);
                history.push({ time, price: currentPrice });
            }
            
            // Set current price and 24h ago baseline
            const generatedPrice = coin.price;
            const price24hAgo = history[0].price;

            return {
                ...coin,
                price: generatedPrice,
                price24hAgo: price24hAgo,
                history: history
            };
        });
    }

    getSelectedCoin() {
        return this.coins.find(c => c.symbol === this.selectedCoinSymbol);
    }

    getNetWorth() {
        let holdingsValue = 0;
        for (const [symbol, holding] of Object.entries(this.holdings)) {
            const coin = this.coins.find(c => c.symbol === symbol);
            if (coin && holding.amount > 0) {
                holdingsValue += holding.amount * coin.price;
            }
        }
        return this.cash + holdingsValue;
    }

    // Orders Execution
    executeOrder(symbol, side, type, amount, limitPrice = null) {
        const coin = this.coins.find(c => c.symbol === symbol);
        if (!coin) throw new Error('Asset not found');

        const executePrice = (type === 'limit' && limitPrice !== null) ? limitPrice : coin.price;
        const totalCost = amount * executePrice;

        if (amount <= 0) {
            throw new Error('Order amount must be greater than zero');
        }

        if (side === 'BUY') {
            if (this.cash < totalCost) {
                throw new Error(`Insufficient USD funds. Required: $${totalCost.toFixed(2)}, Available: $${this.cash.toFixed(2)}`);
            }

            // Update holdings
            if (!this.holdings[symbol]) {
                this.holdings[symbol] = { amount: 0, avgBuyPrice: 0 };
            }

            const currentHolding = this.holdings[symbol];
            const newAmount = currentHolding.amount + amount;
            const newAvgBuyPrice = ((currentHolding.amount * currentHolding.avgBuyPrice) + totalCost) / newAmount;

            this.holdings[symbol] = {
                amount: newAmount,
                avgBuyPrice: newAvgBuyPrice
            };
            this.cash -= totalCost;

        } else if (side === 'SELL') {
            const currentHolding = this.holdings[symbol];
            if (!currentHolding || currentHolding.amount < amount) {
                const held = currentHolding ? currentHolding.amount : 0;
                throw new Error(`Insufficient asset quantity. Selling: ${amount} ${symbol}, Owned: ${held} ${symbol}`);
            }

            const avgBuyPrice = currentHolding.avgBuyPrice;
            const pnl = totalCost - (amount * avgBuyPrice);
            const pnlPercent = avgBuyPrice > 0 ? (executePrice - avgBuyPrice) / avgBuyPrice : 0;

            currentHolding.amount -= amount;
            if (currentHolding.amount <= 0) {
                delete this.holdings[symbol];
            }

            this.cash += totalCost;

            // Trigger potential achievement updates
            this.evaluateSellAchievements(symbol, executePrice, avgBuyPrice, pnl, amount);
        }

        // Record Transaction
        const transaction = {
            id: 'TX-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            timestamp: Date.now(),
            type: side,
            symbol: symbol,
            amount: amount,
            price: executePrice,
            total: totalCost
        };
        this.transactions.unshift(transaction);

        // General achievements checks
        this.evaluateGeneralAchievements();

        this.saveState();
        return transaction;
    }

    // Real-Time Price Updater Hook
    tickMarket(time) {
        this.coins.forEach(coin => {
            // Apply standard volatility walk
            // Double dynamic factor to make ticks feel exciting
            const changePct = (Math.random() - 0.48 + coin.drift) * coin.volatility;
            coin.price = Math.max(0.00001, coin.price * (1 + changePct));
            
            // Append to historical arrays
            coin.history.push({ time, price: coin.price });
            
            // Maintain a buffer of max 300 data points to prevent memory bloat
            if (coin.history.length > 300) {
                coin.history.shift();
            }
        });

        // Save progress occasionally
        this.saveState();
    }

    // Apply direct shock overrides from news triggers
    applyMarketShock(symbol, shockPct) {
        const coin = this.coins.find(c => c.symbol === symbol);
        if (coin) {
            coin.price = Math.max(0.00001, coin.price * (1 + shockPct));
            coin.history.push({ time: Date.now(), price: coin.price });
            this.saveState();
        }
    }

    // Achievements Evaluators
    evaluateSellAchievements(symbol, sellPrice, buyPrice, pnl, amount) {
        // Paper Hands (sold for a loss)
        if (pnl < -0.01) {
            this.unlockAchievement('paper_hands');
        }

        // Diamond Hands (sold for > 50% gain)
        if (buyPrice > 0 && (sellPrice - buyPrice) / buyPrice >= 0.5) {
            this.unlockAchievement('diamond_hands');
        }
    }

    evaluateGeneralAchievements() {
        // First Trade
        if (this.transactions.length >= 1) {
            this.unlockAchievement('first_trade');
        }

        // Diversified (Hold 4+ distinct assets with values)
        const assetsHeld = Object.keys(this.holdings).filter(symbol => this.holdings[symbol].amount > 0.00001);
        if (assetsHeld.length >= 4) {
            this.unlockAchievement('diversified');
        }

        // Whale
        if (this.getNetWorth() >= 250000.00) {
            this.unlockAchievement('whale');
        }

        // All In
        if (this.cash < 10.00 && assetsHeld.length > 0) {
            this.unlockAchievement('all_in');
        }

        // Moonshot (Single position > $100k)
        for (const symbol of assetsHeld) {
            const coin = this.coins.find(c => c.symbol === symbol);
            if (coin) {
                const posValue = this.holdings[symbol].amount * coin.price;
                if (posValue >= 100000.00) {
                    this.unlockAchievement('moonshot');
                }
            }
        }

        // Antigravitational (Hold 1000+ ANT)
        if (this.holdings['ANT'] && this.holdings['ANT'].amount >= 1000) {
            this.unlockAchievement('antigravitational');
        }
    }

    unlockAchievement(id) {
        const achievement = this.achievements.find(a => a.id === id);
        if (achievement && !achievement.unlocked) {
            achievement.unlocked = true;
            this.saveState();
            
            // Dispatch dynamic window event so the UI can listen and spawn a toast
            const event = new CustomEvent('achievement_unlocked', { detail: achievement });
            window.dispatchEvent(event);
        }
    }
}
