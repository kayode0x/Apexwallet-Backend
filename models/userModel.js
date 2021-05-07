const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
	name: {
		type: String,
		default: '',
	},
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
	email: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
        select: false,
	},
	password: {
		type: String,
		required: true,
        select: false,
	},
	image: {
		type: String,
		default: '',
	},
	wallet: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Wallet',
        select: false,
	},
	dateJoined: {
		type: Date,
		default: Date.now,
		required: true,
        select: false,
	},
    isActive: {
        type: Boolean,
        required: true,
        default: false,
    },
	resetPasswordToken: String,
	resetPasswordExpire: Date,
});

const User = mongoose.model('User', userSchema);

module.exports = User;
