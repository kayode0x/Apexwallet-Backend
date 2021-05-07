const mongoose = require('mongoose');

const coinSchema = new mongoose.Schema({
	wallet: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Wallet',
		required: true,
	},
	coin: {
		type: String,
		enum: {
			values: [
				'BTC', //Bitcoin
				'ETH', //Ethereum
				'LTC', //Litecoin
				'DOGE', //Dogecoin
				'XRP', //Ripple
				'USDT', //Tether
			],
			message: '{VALUE} is not supported.',
		},
	},
	balance: {
		type: Number,
		required: true,
		min: 0,
	},
	type: {
		type: String,
		enum: {
			values: ['BUY', 'SELL'],
			message: '{VALUE} is not supported.'
		},
	},
});

const Coin = mongoose.model('Coin', coinSchema);

module.exports = Coin;