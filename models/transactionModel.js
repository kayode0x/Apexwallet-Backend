const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
	coin: {
		type: String,
		required: true,
	},
	date: {
		type: Date,
		default: Date.now,
		required: true,
	},
	amount: {
		type: Number,
		required: true,
	},
	symbol: {
		type: String,
	},
	type: {
		type: String,
		required: true,
	},
	name: {
		type: String,
	},
	memo: {
		type: String,
	},
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
