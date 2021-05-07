const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	coins: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Coin',
		},
	],
	balance: {
		type: Number,
		required: true,
		default: 500,
		min: 0,
	},
	transactions: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Transaction',
		},
	],
});

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
