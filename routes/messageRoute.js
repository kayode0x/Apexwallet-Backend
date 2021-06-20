const Message = require('../models/messageModel');
const Auth = require('../auth/auth');
const router = require('express').Router();

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

module.exports = router;
