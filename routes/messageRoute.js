const Message = require('../models/messageModel');
const User = require('../models/userModel');
const Auth = require('../auth/auth');
const router = require('express').Router();

//mark a message as read
router.put('/open-message', Auth, async (req, res) => {
	try {
		const { messageId } = req.body;
		if (!messageId) return res.status(400).send('Please provide a message id');

		const message = await Message.findById(messageId);
		if (!message) return res.status(400).send('Message not found');

		message.isRead = true;
		await message.save();
		return res.status(200).send();
	} catch (error) {
		res.status(500).send(error.message);
	}
});

//send a broadcast message
router.post('/', Auth, async (req, res) => {
	try {
		const { title, text, from, redirect, hasModal, image } = req.body;
		if (!title || !text) return res.status(400).send('Please add a broadcast message');

		//find the user and make sure s/he is an admin
		const userExists = await User.findById(req.user);
		if (!userExists) return res.status(400).send('Please log in');
		if (userExists.isAdmin !== true) return res.status(400).send('You are not an administrator');

		//load all the users in the database
		const users = await User.find({});

		//send the broadcast message with
		const sendBroadCast = async (user) => {
			const message = await new Message({
				title: title,
				text: text,
				user: user._id,
				from: from ? from : userExists.username,
				redirect: redirect && `/${redirect}`,
                hasModal: hasModal,
                image: image && image
			});

			//save the message
			const newMessage = await message.save();
			await user.messages.push(newMessage);
			await user.save();
		};
		users.forEach((user) => sendBroadCast(user));
		return res.status(200).send('Success');

	} catch (error) {
		res.status(500).send(error.message);
	}
});

//delete broadcast message
router.delete('/messages', Auth, async (req, res) => {
	try {
		
		//load all the users in the database
		await Message.deleteMany({ title: 'Coin conversion is live 🚀'});

		return res.status(200).send("Done");
	} catch (error) {
		res.status(500).send(error.message);
	}
});

module.exports = router;
