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

		const { oldPassword, confirmOldPassword, newPassword } = req.body;
		if (!confirmOldPassword || !oldPassword) return res.status(400).send('Please enter your old password');

		if (!newPassword) return res.status(400).send('Please enter your new password');

		if (oldPassword !== confirmOldPassword) return res.status(400).send('Passwords do not match');

		if (oldPassword.length < 6) return res.status(400).send('Password must be at least 6 characters');

		if (confirmOldPassword.length < 6)
			return res.status(400).send({ message: 'Password must be at least 6 characters' });

        if (newPassword.length < 6) return res.status(400).send('Password must be at least 6 characters');


        const password = bcrypt.hashSync(newPassword, 10);
		user.password = password

        await user.save();

		res.status(200).send('Password changed successfully 🚀');
	} catch (error) {
		res.status(500).send(error.message);
	}
});

module.exports = router;
