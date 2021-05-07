const router = require('express').Router();
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usernameRegex = /^[a-zA-Z]+$/;
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

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
        if(!matchesEmail) return res.status(400).json({ message: 'Please provide a valid email address' });

		//username regex
        if(username.length < 2 || username.length > 20) return res.status(400).json({ message: 'Username must be between 2 and 20 characters long'});
		const matchesUsername = username.match(usernameRegex);
		if (!matchesUsername) return res.status(400).json({ message: 'Please pick an alphabet only username.' });

        //password regex
        if (password.length < 6 ) return res.status(400).json({ message: 'Password must be at least 6 characters long'});

		//save the user
		const newUser = await new User({
			username: req.body.username,
			email: req.body.email,
			password: bcrypt.hashSync(req.body.password, 10),
		});

		await newUser.save();

		//sign user in automatically after signing up
		const token = await jwt.sign({ user: newUser._id, isAdmin: newUser.isAdmin }, process.env.JWT_SECRET, {
			expiresIn: '1d',
		});
		res.status(201).cookie('jwt_token', token, { httpOnly: true }).send();
	} catch (error) {
        console.log(error)
        console.log(error.message)
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
		res.status(200).cookie('jwt_token', token, { httpOnly: true }).send();
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

module.exports = router;
