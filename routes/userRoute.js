const router = require('express').Router();
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
let usernameRegex = /^([0-9_-]*[a-z][0-9_-]*){3}/;
const Auth = require('../auth/auth');


//create a new user
router.post('/signup', async (req, res) => {
	try {
		//first check if the required fields are present
		const { username, email, password } = req.body;
		if (!username || !email || !password)
			return res.status(400).json({ message: 'Please fill in the required fields' });

		//check if the email exists
		const existingEmail = await User.findOne({ email: req.body.email });
		if (existingEmail) return res.status(400).json({ message: 'Email already exists' });

		//check if the username exists
		const existingUsername = await User.findOne({ username: req.body.username });
		if (existingUsername) return res.status(400).json({ message: 'Username already exists' });

        //password regex
        const matches = username.match(usernameRegex);
        if (!matches) return res.status(400).json({ message: 'Wrong username format. Please try again.' });

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
		res.status(500).json({ message: error.message });
	}
});


//log a user in
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if(!email || !password) return res.status(400).json({ message: 'Please fill in your email and password'});

        //check if user exists
        const user = await User.findOne({ email: email }).select('+password');
        if (!user) return res.status(400).json({ message: 'Invalid credentials provided'})

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
        res.status(500).json({ message: error.message})
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


//get user
router.get('/', Auth, async (req, res) => {
    try {
        const user = await User.findById(req.user).select('+wallet').populate('wallet');
        res.status(200).send(user);

    } catch (error) {
        res.status(500).json({message: error.message});
    }
})


//get a user by email
router.get('/:email', async (req, res) => {
	try {
		const user = await User.find({ email: req.params.email });
		res.status(200).send(user);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

module.exports = router;