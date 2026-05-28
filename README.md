# Cryptoverse Trading Lab

Cryptoverse Trading Lab is a real-time cryptocurrency portfolio tracking and trading simulation web application. Built entirely as a frontend application, it provides an interactive dashboard interface to monitor asset prices, analyze market trends using multiple chart views, simulate mock transactions, and track performance achievements.


## Core Features

- **Portfolio Monitoring:** Dynamically tracks and updates user Net Worth, Total Returns, and Available USD based on simulated market movements.
- **Live Feed Watchlist:** Displays key performance metrics for digital assets like Bitcoin, including live spot prices and percentage changes.
- **Interactive Charts:** Allows users to switch seamlessly between a Line chart for quick trend analysis and a Candlestick chart for deeper price action visualization.
- **Gamified Achievements:** Includes a built-in milestone engine that tracks and displays performance badges as users hit mock trading targets.
- **Transaction Ledger:** Maintains a detailed historical record of execution parameters, including the type, asset, size, and price for every simulated trade.

## Tech Stack

- **Structure:** HTML5
- **Styling:** Custom CSS (Modern dark-mode interface with neon accent highlights)
- **Logic & Actions:** Native JavaScript (DOM manipulation, state management, and event-driven updates)

## Project Structure

```text
crypto-verse-web-application/
│
├── src/
│   ├── assets/       # Icons, logos, and images
│   └── js/           # Scripts handling calculations and chart UI logic
│
├── .gitignore        # Excludes local backups and compressed zip files
├── index.html        # Main dashboard layout
├── README.md         # Project documentation
└── styles.css        # Global styles and responsive layout rules
