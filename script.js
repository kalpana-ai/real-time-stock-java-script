class StockTracker {
    constructor() {
      this.stocks = new Map();
      this.apiKey = '6b362f30ce9345429b257140dcc16e63';
      this.ws = null;
      this.connectWebSocket();
    }
  
    connectWebSocket() {
      this.ws = new WebSocket('wss://ws.twelvedata.com/v1/quotes/price?apikey=' + this.apiKey);
  
      this.ws.onopen = () => console.log('WebSocket connection established');
  
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.event === 'price' && data.symbol && data.price) {
          this.updateStockPrice(data.symbol, parseFloat(data.price));
        }
      };
  
      this.ws.onerror = (error) => console.error('WebSocket error:', error);
  
      this.ws.onclose = () => {
        console.log('WebSocket closed, retrying...');
        setTimeout(() => this.connectWebSocket(), 2000);
      };
    }
  
    async fetchInitialPrice(symbol) {
      try {
        const response = await fetch(`https://api.twelvedata.com/price?symbol=${symbol}&apikey=${this.apiKey}`);
        const data = await response.json();
        if (data && data.price) {
          this.updateStockPrice(symbol, parseFloat(data.price));
        }
      } catch (error) {
        console.error('Error fetching initial price:', error);
      }
    }
  
    addStock(symbol) {
      symbol = symbol.toUpperCase();
      if (!this.stocks.has(symbol)) {
        this.stocks.set(symbol, { price: 0, lastPrice: 0, timestamp: Date.now() });
        this.createStockElement(symbol);
        this.subscribeToStock(symbol);
        this.fetchInitialPrice(symbol);
      }
    }
  
    subscribeToStock(symbol) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const msg = JSON.stringify({ action: 'subscribe', params: { symbols: symbol } });
        this.ws.send(msg);
      } else {
        setTimeout(() => this.subscribeToStock(symbol), 1000);
      }
    }
  
    createStockElement(symbol) {
      const container = document.getElementById('stockList');
      const stockDiv = document.createElement('div');
      stockDiv.id = `stock-${symbol}`;
      stockDiv.className = 'stock-container';
      stockDiv.innerHTML = `
        <h3>${symbol}</h3>
        <p>Price: <span class="price" id="price-${symbol}">-</span></p>
        <p>Last Updated: <span id="time-${symbol}">-</span></p>
        <div id="chart-${symbol}" style="height: 400px;"></div>
        <button onclick="stockTracker.removeStock('${symbol}')">Remove</button>
      `;
      container.appendChild(stockDiv);
  
      new TradingView.widget({
        "width": "100%",
        "height": 400,
        "symbol": symbol,
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "light",
        "style": "1",
        "locale": "en",
        "toolbar_bg": "#f1f3f6",
        "enable_publishing": false,
        "allow_symbol_change": false,
        "container_id": `chart-${symbol}`
      });
    }
  
    removeStock(symbol) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'unsubscribe', params: { symbols: symbol } }));
      }
      this.stocks.delete(symbol);
      const el = document.getElementById(`stock-${symbol}`);
      if (el) el.remove();
    }
  
    updateStockPrice(symbol, newPrice) {
      if (this.stocks.has(symbol)) {
        const stock = this.stocks.get(symbol);
        stock.lastPrice = stock.price;
        stock.price = newPrice;
        stock.timestamp = Date.now();
  
        const priceEl = document.getElementById(`price-${symbol}`);
        const timeEl = document.getElementById(`time-${symbol}`);
  
        if (priceEl && timeEl) {
          priceEl.textContent = `$${newPrice.toFixed(2)}`;
          priceEl.className = 'price';
          priceEl.classList.add(newPrice > stock.lastPrice ? 'price-up' : 'price-down');
          timeEl.textContent = new Date(stock.timestamp).toLocaleTimeString();
        }
      }
    }
  }
  
  const stockTracker = new StockTracker();
  
  function addStock() {
    const input = document.getElementById('stockSymbol');
    const symbol = input.value.trim();
    if (symbol) {
      stockTracker.addStock(symbol);
      input.value = '';
    }
  }
  
  document.getElementById('stockSymbol').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addStock();
  });
  