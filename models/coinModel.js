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
				'bitcoin', //btc
				'ethereum', //eth
				'ethereum-classic', //etc
				'litecoin', //ltc
				'dogecoin', //doge
				'ripple', //xrp
				'tether', //usdt
				'tron', //trx
				'binancecoin', //bnb
			],
			message: '{VALUE} is not supported.',
		},
	},
	balance: {
		type: Number,
		required: true,
		min: 0,
	},
});

const Coin = mongoose.model('Coin', coinSchema);

module.exports = Coin;