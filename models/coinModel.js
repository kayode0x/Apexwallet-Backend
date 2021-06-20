const mongoose = require('mongoose');

const coinSchema = new mongoose.Schema({
	wallet: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Wallet',
		required: true,
	},
	coin: {
		type: String,
		required: true,
	},
	balance: {
		type: Number,
		required: true,
		min: 0,
	},
	availableBalance: {
		type: Number,
		min: 0,
	},
	locked: {
		type: Number,
		min: 0,
	},
});

const Coin = mongoose.model('Coin', coinSchema);

module.exports = Coin;