const coinSymbol = (coin) => {
	switch (coin) {
		case 'bitcoin':
			return 'BTC';
		case 'ethereum':
			return 'ETH';
		case 'ethereum-classic':
			return 'ETC';
		case 'litecoin':
			return 'LTC';
		case 'dogecoin':
			return 'DOGE';
		case 'ripple':
			return 'XRP';
		case 'tether':
			return 'USDT';
		case 'binancecoin':
			return 'BNB';
		case 'cardano':
			return 'ADA';
		case 'usd-coin':
			return 'USDC';
		case 'tron':
			return 'TRX';
		case 'bitcoin-cash':
			return 'BCH';
		case 'polkadot':
			return 'DOT';
		case 'uniswap':
			return 'UNI';
		case 'dash':
			return 'DASH';
		case 'decentraland':
			return 'MANA';
		case 'shiba-inu':
			return 'SHIB';
		case 'stellar':
			return 'XLM';
		case 'chainlink':
			return 'LINK';
		case 'solana':
			return 'SOL';
		default:
			null;
	}
};
module.exports = coinSymbol;
