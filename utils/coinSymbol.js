const coinSymbol = (coin) => {
    let symbol;
    if (coin === 'bitcoin') {
		symbol = 'BTC';
		return symbol;
	} else if (coin === 'ethereum') {
		symbol = 'ETH';
		return symbol;
	} else if (coin === 'ethereum-classic') {
		symbol = 'ETC';
		return symbol;
	} else if (coin === 'litecoin') {
		symbol = 'LTC';
		return symbol;
	} else if (coin === 'dogecoin') {
		symbol = 'DOGE';
		return symbol;
	} else if (coin === 'ripple') {
		symbol = 'XRP';
		return symbol;
	} else if (coin === 'tether') {
		symbol = 'USDT';
		return symbol;
	} else if (coin === 'binancecoin') {
		symbol = 'BNB';
		return symbol;
	} else if (coin === 'cardano') {
		symbol = 'ADA';
		return symbol;
	} else if (coin === 'usd-coin') {
		symbol = 'USDC';
		return symbol;
	} else if (coin === 'tron') {
		symbol = 'TRX';
		return symbol;
	} else if (coin === 'bitcoin-cash') {
		symbol = 'BCH';
		return symbol;
	} else if (coin === 'polkadot') {
		symbol = 'DOT';
		return symbol;
	} else if (coin === 'uniswap') {
		symbol = 'UNI';
		return symbol;
	} else if (coin === 'dash') {
		symbol = 'DASH';
		return symbol;
	} else return null;
}

module.exports = coinSymbol;
