const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

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
	watchList: [
		{
			name: String,
			coinId: String,
		}
	],
	resetPasswordToken: String,
	resetPasswordExpire: Date,
	verifyEmailToken: {
		type: String,
		select: false,
	},
});

userSchema.methods.getResetPasswordToken = function () {
	const resetToken = crypto.randomBytes(20).toString('hex');

	this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

	this.resetPasswordExpire = Date.now() + 10 * (60 * 1000); //expires in 10 minutes

	return resetToken;
};

userSchema.methods.getVerifyEmailToken = function () {
	const verificationToken = crypto.randomBytes(20).toString('hex');
	this.verifyEmailToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

	return verificationToken;
}

const User = mongoose.model('User', userSchema);

module.exports = User;
