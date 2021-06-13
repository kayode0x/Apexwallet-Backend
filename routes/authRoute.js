const router = require('express').Router();
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const usernameRegex = /^[a-zA-Z]+$/;
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
const sendEmail = require('../utils/sendEmail');
const Auth = require('../auth/auth')

//create a new user
router.post('/signup', async (req, res) => {
	try {
		//first check if the required fields are present
		const { username, email, password } = req.body;
		if (!username || !email || !password)
			return res.status(400).send('Please fill in the required fields');

		//check if the email exists
		const existingEmail = await User.findOne({ email: req.body.email });
		if (existingEmail) return res.status(400).send('The email address is already taken');

		//check if the username exists
		const existingUsername = await User.findOne({ username: req.body.username });
		if (existingUsername) return res.status(400).send('The username is already taken');

		//email regex
		const matchesEmail = email.match(emailRegex);
		if (!matchesEmail) return res.status(400).send('Please provide a valid email address');

		//username regex
		if (username.length < 2 || username.length > 20)
			return res.status(400).send('Username must be between 2 and 20 characters long');
		const matchesUsername = username.match(usernameRegex);
		if (!matchesUsername) return res.status(400).send('Please pick an alphabet only username.');

		//password regex
		if (password.length < 6)
			return res.status(400).send('Password must be at least 6 characters long');

		//save the user
		const newUser = await new User({
			username: req.body.username,
			email: req.body.email,
			password: bcrypt.hashSync(req.body.password, 10),
		});

		await newUser.save();

		//sign user in automatically after signing up
		const token = await jwt.sign({ user: newUser._id }, process.env.JWT_SECRET);

		const verificationToken = newUser.getVerifyEmailToken();

		await newUser.save();

		const apexURL = 'https://apexwallet.app';

		//send email verification link
		const verificationURL = `${apexURL}/verify?token=${verificationToken}`;

		const message = `
            <p>Hi there ${req.body.username.toUpperCase()}!, welcome to Apex 🚀</p>
            <p>Before doing anything, we recommend verifying your account to use most of the features available.</p>
            <a href="${verificationURL}" clicktracking=off>Verify Account</a>
            <p>Apex Wallet. 🚀</p>
        `;

		try {
			await sendEmail({
				to: newUser.email,
				subject: 'Welcome to Apex 🚀',
				text: message,
			});

			res.status(201)
				.cookie('jwt_token', token, {
					httpOnly: true, path:'/', sameSite: 'none', secure: true
				})
				.send();
		} catch (error) {
			newUser.verifyEmailToken = undefined;

			await newUser.save();

			return res.status(500).send("Couldn't send the verification email");
		}
	} catch (error) {
		res.status(500).send(error.message);
	}
});

//verify the user's email address
router.put('/verify', async (req, res) => {
	const verifyEmailToken = await crypto.createHash('sha256').update(req.body.token).digest('hex');

	try {
		//find the user by the verification token
		const user = await User.findOne({ verifyEmailToken: verifyEmailToken }).select('+verifyEmailToken');

		if (!user) return res.status(404).send('Your account has already been verified.');

		//prevent active users from trying to verify their account again
		if(user.isActive === true) {
			user.verifyEmailToken = undefined;
			return res.status(400).send('Your account has already been verified.');
		}

		//then change the user's status to active
		user.isActive = true;

		//void the token
		user.verifyEmailToken = undefined;

		//finally save the user
		await user.save();

		const token = await jwt.sign({ user: user._id }, process.env.JWT_SECRET);
		res.status(200)
			.cookie('jwt_token', token, {
				httpOnly: true,
				path: '/',
				sameSite: 'none',
				secure: true,
			})
			.send('Account verified 🚀');
	} catch (error) {
		res.status(500).send(error.message);
	}
});

router.post('/resend-verification-link', Auth, async (req, res) => {
	try {
		const user = await User.findById(req.user).select('+email');
		if (!user) return res.status(400).send('Please login');

		if(user.isActive === true) {
			return res.status(400).send('Account has already been verified');
		}

		const verificationToken = user.getVerifyEmailToken();

		await user.save();

		const apexURL = 'https://apexwallet.app';

		//send email verification link
		const verificationURL = `${apexURL}/verify?token=${verificationToken}`;

		const message = `
            <p>Hi there ${user.username.toUpperCase()}!,</p>
            <p>Here's a new link to verify your account.</p>
            <a href="${verificationURL}" clicktracking=off>Verify Account</a>
            <p>Apex Wallet. 🚀</p>
        `;

		try {
			await sendEmail({
				to: user.email,
				subject: 'Verification Link 🚀',
				text: message,
			});

			res.status(200).send('Verification Link Sent!');
		} catch (error) {
			user.verifyEmailToken = undefined;

			await user.save();

			return res.status(500).send("Couldn't send the verification email");
		}
	} catch (error) {
		res.status(500).send(error.message);
	}
})

//log a user in
router.post('/login', async (req, res) => {
	try {
		const { username, password } = req.body;
		if (!username || !password) return res.status(400).send('Please fill in your username and password');

		//check if user exists
		const user = await User.findOne({ username: username }).select('+password');
		if (!user) return res.status(400).send('Invalid credentials provided');

		//check if the password matches
		const correctPassword = await bcrypt.compare(password, user.password);
		if (!correctPassword) return res.status(400).send('Invalid credentials provided');

		const token = await jwt.sign({ user: user._id }, process.env.JWT_SECRET);
		res.status(200)
			.cookie('jwt_token', token, {
				httpOnly: true,
				path: '/',
				sameSite: 'none',
				secure: true,
			})
			.send();
	} catch (error) {
		res.status(500).send(error.message);
	}
});

//check if the user is logged in
router.get('/loggedin', (req, res) => {
	try {
		const token = req.cookies.jwt_token;
		if (!token) {
			return res.send(false);
		}
		//verify the token
		jwt.verify(token, process.env.JWT_SECRET);
		res.send(true);
	} catch (err) {
		res.send(false);
	}
});

//log a user out
router.post('/logout', async (req, res) => {
	try {
		res.status(200)
			.cookie('jwt_token', '', {
				expiresIn: new Date(0),
				httpOnly: true,
				path: '/',
				sameSite: 'none',
				secure: true,
			})
			.send();
	} catch (error) {
		res.status(500).send(error.message);
	}
});

//forgot password
router.post('/forgot-password', async (req, res) => {
	const { email } = req.body;
	try {

		//check if an email is sent
		if (!email) return res.status(400).send('Please provide an email address');

		//check if the user exists
		const user = await User.findOne({ email: email }).select('+email');
		if (!user) return res.status(400).send("Couldn't send the reset email. User not found..");

		const resetToken = user.getResetPasswordToken();

		await user.save();

		const apexURL = 'https://apexwallet.app';

		const resetUrl = `${apexURL}/reset?token=${resetToken}`;

		const message = `
            <p>Hi there,</p>
            <p>We heard you are having problems with your password.</p>
            <p>Click this <a href="${resetUrl}" clicktracking=off>link</a> to reset your password, link expires in 10 minutes.</p>  
        `;

		try {
			await sendEmail({
				to: user.email,
				subject: 'Password Reset Request',
				text: message,
			});

			res.status(200).send('Email sent successfully');
		} catch (error) {
			user.resetPasswordToken = undefined;
			user.resetPasswordExpire = undefined;

			await user.save();

			return res.status(500).send("Couldn't send the reset email");
		}
	} catch (error) {
		res.status(500).send(error.message);
	}
});

//reset the password
router.put('/reset-password/', async (req, res) => {
	try {
		const resetPasswordToken = crypto.createHash('sha256').update(req.body.token).digest('hex');

		//find the user by the token
		const user = await User.findOne({
			resetPasswordToken: resetPasswordToken,
			resetPasswordExpire: { $gt: Date.now() },
		});

		if (!user) return res.status(400).send('Invalid reset token');

		const { password, confirmPassword } = req.body;

		if (!confirmPassword || !password) return res.status(400).send('Please fill in your password');

		if (password.length < 6) return res.status(400).send('Password must be at least 6 characters');
		if (confirmPassword.length < 6)
			return res.status(400).send({ message: 'Password must be at least 6 characters' });

		if (confirmPassword !== password) return res.status(400).send('Passwords do not match');

		const newPassword = bcrypt.hashSync(password, 10);

		//set the user's password to the new one.
		user.password = newPassword;

		//void the token and make it expire
		user.resetPasswordToken = undefined;
		user.resetPasswordExpire = undefined;

		//finally save the user
		await user.save();

		res.status(200).send("Password reset success. 🚀");
	} catch (error) {
		res.status(500).send(error.message);
	}
});


module.exports = router;
