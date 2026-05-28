/* ==========================================================================
   CRYPTOVERSE // MARKET INTELLIGENCE & NEWS ENGINE
   Handles mock headline generation, market shock logic, and initial feeds
   ========================================================================== */

const NEWS_TEMPLATES = [
    // Positive Shocks
    {
        headline: "Payment giant Visa announces direct settlement integration with {name} network.",
        impact: "high",
        shockPct: 0.14,
        type: "positive"
    },
    {
        headline: "Antigravity Capital publishes highly bullish research paper, targets higher valuation for {symbol}.",
        impact: "medium",
        shockPct: 0.08,
        type: "positive"
    },
    {
        headline: "Major tech conglomerate chooses {name} as its primary Web3 development standard.",
        impact: "high",
        shockPct: 0.12,
        type: "positive"
    },
    {
        headline: "Whale transaction alert: $80M in USD converted to {symbol} in OTC trade.",
        impact: "high",
        shockPct: 0.10,
        type: "positive"
    },
    {
        headline: "{name} core team releases upgrade 3.0, reducing gas fees by 90%.",
        impact: "extreme",
        shockPct: 0.22,
        type: "positive"
    },
    {
        headline: "Viral meme wave sparks massive retail purchase frenzy for {symbol} token.",
        impact: "extreme",
        shockPct: 0.28,
        type: "positive"
    },
    
    // Negative Shocks
    {
        headline: "Regulators launch inquiry into DeFi projects building on {name}.",
        impact: "high",
        shockPct: -0.12,
        type: "negative"
    },
    {
        headline: "{name} validators report brief coordination delay, network resumes normal speed.",
        impact: "low",
        shockPct: -0.04,
        type: "negative"
    },
    {
        headline: "Audit firm reports critical logic bug in {symbol} liquid pool contract.",
        impact: "extreme",
        shockPct: -0.24,
        type: "negative"
    },
    {
        headline: "Early founder wallet sells off 15% of total supply of {symbol} in centralized exchange.",
        impact: "high",
        shockPct: -0.11,
        type: "negative"
    },
    {
        headline: "Short-seller report targets {name} governance model, raising centralization concerns.",
        impact: "medium",
        shockPct: -0.07,
        type: "negative"
    },
    {
        headline: "Rumors of dev team division sparks sell-off across {symbol} market.",
        impact: "medium",
        shockPct: -0.09,
        type: "negative"
    },

    // Global Shocks
    {
        headline: "Federal Reserve announces rate freeze, boosting risk assets across the board.",
        impact: "high",
        shockPct: 0.06,
        type: "global_positive"
    },
    {
        headline: "Unfavorable CPI inflation index report drags down global stock and crypto markets.",
        impact: "high",
        shockPct: -0.05,
        type: "global_negative"
    }
];

export class NewsEngine {
    constructor(state) {
        this.state = state;
        this.newsLog = [];
        this.generateInitialNews();
    }

    generateInitialNews() {
        const now = Date.now();
        // Generate 5 historical news articles
        for (let i = 5; i > 0; i--) {
            const time = now - i * 15 * 60 * 1000; // 15-minute intervals
            const item = this.createRandomNews(time);
            this.newsLog.push(item);
        }
    }

    createRandomNews(timestamp = Date.now()) {
        const template = NEWS_TEMPLATES[Math.floor(Math.random() * NEWS_TEMPLATES.length)];
        
        let coin = null;
        let headline = template.headline;
        let symbol = 'ALL';

        if (template.type !== 'global_positive' && template.type !== 'global_negative') {
            coin = this.state.coins[Math.floor(Math.random() * this.state.coins.length)];
            // Don't select GMN (stablecoin) for extreme spikes/drops to protect its soft peg
            if (coin.symbol === 'GMN' && (template.impact === 'extreme' || template.impact === 'high')) {
                coin = this.state.coins.find(c => c.symbol !== 'GMN');
            }
            symbol = coin.symbol;
            headline = headline.replace('{name}', coin.name).replace('{symbol}', coin.symbol);
        } else {
            headline = headline.replace('{name}', '').replace('{symbol}', '');
        }

        return {
            id: 'NEWS-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            timestamp,
            headline,
            impact: template.impact,
            shockPct: template.shockPct,
            symbol: symbol,
            type: template.type
        };
    }

    triggerNewsTick() {
        const item = this.createRandomNews();
        this.newsLog.unshift(item);
        
        // Cap news history to 40 items
        if (this.newsLog.length > 40) {
            this.newsLog.pop();
        }

        // Apply price shocks immediately to the state
        if (item.symbol === 'ALL') {
            this.state.coins.forEach(c => {
                // Stabilize GMN stablecoin even during global shocks
                const multiplier = c.symbol === 'GMN' ? 0.05 : 1.0;
                this.state.applyMarketShock(c.symbol, item.shockPct * multiplier);
            });
        } else {
            this.state.applyMarketShock(item.symbol, item.shockPct);
        }

        // Notify app to alert user and refresh UI
        const event = new CustomEvent('news_flash', { detail: item });
        window.dispatchEvent(event);

        return item;
    }
}
