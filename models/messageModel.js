const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
	title: {
		//eg Price alert or money request
		type: String,
		required: true,
	},
	text: {
		type: String,
		required: true,
	},
	image : {
		type: String,
	},
	date: {
		type: Date,
		default: Date.now,
		required: true,
	},
	isRead: {
		type: Boolean,
		default: false,
	},
	redirect: {
		//eg where to redirect the user to onClick
		type: String,
	},
	from: {
		//eg admin/'s username
		type: String,
	},
	hasModal: {
		type: Boolean, // eg if it's supposed to pop up with more information.
		default: false,
	},
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
