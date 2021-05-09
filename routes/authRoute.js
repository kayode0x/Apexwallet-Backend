const router = require('express').Router();
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const usernameRegex = /^[a-zA-Z]+$/;
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
const sendEmail = require('../utils/sendEmail');

//create a new user
router.post('/signup', async (req, res) => {
	try {
		//first check if the required fields are present
		const { username, email, password } = req.body;
		if (!username || !email || !password)
			return res.status(420).json({ message: 'Please fill in the required fields' });

		//check if the email exists
		const existingEmail = await User.findOne({ email: req.body.email });
		if (existingEmail) return res.status(400).send({ message: 'The email address is already taken' });

		//check if the username exists
		const existingUsername = await User.findOne({ username: req.body.username });
		if (existingUsername) return res.status(400).json({ message: 'The username is already taken' });

		//email regex
		const matchesEmail = email.match(emailRegex);
		if (!matchesEmail) return res.status(400).json({ message: 'Please provide a valid email address' });

		//username regex
		if (username.length < 2 || username.length > 20)
			return res.status(400).json({ message: 'Username must be between 2 and 20 characters long' });
		const matchesUsername = username.match(usernameRegex);
		if (!matchesUsername) return res.status(400).json({ message: 'Please pick an alphabet only username.' });

		//password regex
		if (password.length < 6)
			return res.status(400).json({ message: 'Password must be at least 6 characters long' });

		//save the user
		const newUser = await new User({
			username: req.body.username,
			email: req.body.email,
			password: bcrypt.hashSync(req.body.password, 10),
		});

		await newUser.save();

		//sign user in automatically after signing up
		const token = await jwt.sign({ user: newUser._id }, process.env.JWT_SECRET, {
			expiresIn: '1d',
		});

		const verificationToken = newUser.getVerifyEmailToken();

		await newUser.save();

		const apexURL = 'apexwallet.app';

		//send email verification link
		const verificationURL = `http://${apexURL}/verify/${verificationToken}`;

		const message = `
            <p>Hi there ${req.body.username}!,</p>
            <p>We would like to welcome you on board.</p>
            <p>But before you do anything, it's required that you verify your email address just so we know it's you.</p>
            <p>Click this <a href="${verificationURL}" clicktracking=off>link</a> to verify your account and start trading.</p>  
            <p>Apex Team. 🚀</p>
        `;

		try {
			await sendEmail({
				to: newUser.email,
				subject: 'Welcome to Apex 🚀',
				text: message,
			});

			res.status(201)
				.cookie('jwt_token', token, {
					httpOnly: true,
					maxAge: 24 * 60 * 60 * 1000,
					sameSite: 'none',
					secure: true,
				})
				.send();
		} catch (error) {
			newUser.verifyEmailToken = undefined;

			await newUser.save();

			return res.status(500).json({ message: "Couldn't send the reset email" });
		}
	} catch (error) {
		console.log(error);
		console.log(error.message);
		res.status(500).json({ message: error.message });
	}
});

//verify the user's email address
router.put('/verify/:verificationToken', async (req, res) => {
	const verifyEmailToken = crypto.createHash('sha256').update(req.params.verificationToken).digest('hex');

	try {
		//find the user by the verification token
		const user = await User.findOne({ verifyEmailToken: verifyEmailToken });

		if (!user) return res.status(404).json({ message: 'User not found' });

		//then change the user's status to active
		user.isActive = true;

		//void the token
		user.verifyEmailToken = undefined;

		//finally save the user
		await user.save();

		//then sign and send the jwt token.
		const token = await jwt.sign(
			{ user: user._id },
			process.env.JWT_SECRET,
			{ expiresIn: 86400 } //expires in 24 hours.
		);
		res.status(200)
			.cookie('jwt_token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000, sameSite: 'none', secure: true })
			.send();
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

//log a user in
router.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) return res.status(400).json({ message: 'Please fill in your email and password' });

		//check if user exists
		const user = await User.findOne({ email: email }).select('+password');
		if (!user) return res.status(400).json({ message: 'Invalid credentials provided' });

		//check if the password matches
		const correctPassword = await bcrypt.compare(password, user.password);
		if (!correctPassword) return res.status(400).json({ message: 'Invalid credentials provided' });

		const token = await jwt.sign(
			{ user: user._id },
			process.env.JWT_SECRET,
			{ expiresIn: 86400 } //expires in 24 hours.
		);
		res.status(200)
			.cookie('jwt_token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000, sameSite: 'none', secure: true })
			.send();
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

//check if the user is logged in
router.get('/loggedin', (req, res) => {
	try {
		const token = req.cookies.jwt_token;
		if (!token) {
			return res.json(false);
		}
		//verify the token
		jwt.verify(token, process.env.JWT_SECRET);
		res.send(true);
	} catch (err) {
		res.json(false);
	}
});

//log a user out
router.post('/logout', async (req, res) => {
	try {
		res.status(200)
			.cookie('jwt_token', '', {
				expiresIn: new Date(0),
				httpOnly: true,
			})
			.send();
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

//forgot password
router.post('/forgot-password', async (req, res) => {
	const { email } = req.body;
	try {
		//check if an email is sent
		if (!email) return res.status(400).json({ message: 'Please provide an email address' });

		//check if the user exists
		const user = await User.findOne({ email: email }).select('+email');
		if (!user) return res.status(400).json({ message: "Couldn't send the reset email. User not found.." });

		const resetToken = user.getResetPasswordToken();

		await user.save();

		const apexURL = 'apexwallet.app';

		const resetUrl = `http://${apexURL}/reset-password/${resetToken}`;

		const message = `
            <p>Hi there,</p>
            <p>We heard you are having problems with your password.</p>
            <p>Click this <a href="${resetUrl}" clicktracking=off>link</a> to reset your password</p>  
        `;

		try {
			await sendEmail({
				to: user.email,
				subject: 'Password Reset Request',
				text: message,
			});

			res.status(200).json({ message: 'Email sent successfully' });
		} catch (error) {
			user.resetPasswordToken = undefined;
			user.resetPasswordExpire = undefined;

			await user.save();

			return res.status(500).json({ message: "Couldn't send the reset email" });
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

//reset the password
router.put('/reset-password/:resetToken', async (req, res) => {
	const resetPasswordToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

	try {
		//find the user by the token
		const user = await User.findOne({
			resetPasswordToken: resetPasswordToken,
			resetPasswordExpire: { $gt: Date.now() },
		});

		if (!user) return res.status(400).json({ message: 'Invalid reset token' }).select('+verifyEmailToken');

		const { password, confirmPassword } = req.body;

		if (!confirmPassword || !password) return res.status(400).json({ message: 'Please fill in your password' });

		if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
		if (confirmPassword.length < 6)
			return res.status(400).json({ message: 'Password must be at least 6 characters' });

		if (confirmPassword !== password) return res.status(400).json({ message: 'Passwords do not match' });

		const newPassword = bcrypt.hashSync(password, 10);

		//set the user's password to the new one.
		user.password = newPassword;

		//void the token and make it expire
		user.resetPasswordToken = undefined;
		user.resetPasswordExpire = undefined;

		//finally save the user
		await user.save();

		//then sign and send the jwt token.
		const token = await jwt.sign(
			{ user: user._id },
			process.env.JWT_SECRET,
			{ expiresIn: 86400 } //expires in 24 hours.
		);
		res.status(200)
			.cookie('jwt_token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000, sameSite: 'none', secure: true })
			.send();
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

module.exports = router;
