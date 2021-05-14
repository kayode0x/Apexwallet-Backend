const router = require('express').Router();
const User = require('../models/userModel');
const Auth = require('../auth/auth');
const bcrypt = require('bcryptjs');

//get user
router.get('/', Auth, async (req, res) => {
	try {
		const user = await User.findById(req.user).select('+wallet +email').populate('wallet');
		if (!user) return res.status(400).send('Please log in.');
		res.status(200).send(user);
	} catch (error) {
		res.status(500).send(error.message);
	}
});

//update a user

//change the password
router.put('/change-password', Auth, async (req, res) => {
	try {
		const user = await User.findById(req.user).select('+password');
		if (!user) return res.status(400).send('Please log in to change your password');

        //validate the input
		const { currentPassword, confirmCurrentPassword, newPassword } = req.body;
		if (!confirmCurrentPassword || !currentPassword) return res.status(400).send('Please enter your old password');

		if (!newPassword) return res.status(400).send('Please enter your new password');

		if (currentPassword !== confirmCurrentPassword) return res.status(400).send('Passwords do not match');

		if (newPassword.length < 6) return res.status(400).send('Password must be at least 6 characters');

		//check if the password matches
		const correctPassword = await bcrypt.compare(currentPassword, user.password);
		if (!correctPassword) return res.status(400).send("The password you entered does not match the one we have.");

        //hash and save the new password
		const password = bcrypt.hashSync(newPassword, 10);
		user.password = password;

		await user.save();

		res.status(200).send('Password changed successfully 🚀');
	} catch (error) {
		res.status(500).send(error.message);
	}
});

module.exports = router;
