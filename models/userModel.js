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
        minLength: 2,
        maxLength: 20
    },
	email: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
        select: false,
		match: [
			/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
			'Please provide a valid email',
		],
	},
	password: {
		type: String,
		required: true,
		minLength: 6,
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
