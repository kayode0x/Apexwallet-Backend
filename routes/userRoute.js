const router = require('express').Router();
const User = require('../models/userModel');
const Auth = require('../auth/auth');
const bcrypt = require('bcryptjs');

//multer to upload an image.
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { uploadImage, downloadImage } = require('../utils/s3');

//delete an image after upload to s3.
const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);

//get user
router.get('/', Auth, async (req, res) => {
	try {
		const user = await User.findById(req.user).select('+wallet +email').populate('wallet messages');
		if (!user) return res.status(400).send('Please log in.');
		res.status(200).send(user);
	} catch (error) {
		res.status(500).send(error.message);
	}
});

//get the user's display image.
router.get('/image', Auth, async (req, res) => {
	try {
		const user = await User.findById(req.user);
		if (!user) return res.status(400).send('Please log in.');
		const key = user.image;
		if (!key) return res.status(400).send('');
		const findImage = await downloadImage(key);
		findImage.pipe(res);
	} catch (error) {
		res.status(500).send(error.message);
	}
});

//change the display picture
router.put('/image', Auth, upload.single('image'), async (req, res) => {
	try {
		const user = await User.findById(req.user);
		if (!user) return res.status(400).send('Please log in to change your display picture');

		const image = req.file;
		if (!image) return res.status(400).send('Please pick an image');

		//upload the new image to s3.
		const result = await uploadImage(image);

		//delete the image from apex's server
		await unlinkFile(image.path);

		user.image = result.Key;

		await user.save();

		return res.status(200).send('Image uploaded successfully.');
	} catch (error) {
		res.status(500).send(error.message);
	}
});

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
		if (!correctPassword) return res.status(400).send('The password you entered is incorrect');

		//hash and save the new password
		const password = bcrypt.hashSync(newPassword, 10);
		user.password = password;

		await user.save();

		res.status(200).send('Password changed successfully 🚀');
	} catch (error) {
		res.status(500).send(error.message);
	}
});

//change the name
router.put('/change-name', Auth, async (req, res) => {
	try {
		const user = await User.findById(req.user);
		if (!user) return res.status(400).send('Please login to change your name');

		const { name } = req.body;
		if (!name) return res.status(400).send('Please enter your display name');

		if (name.trim().length === 0) return res.status(400).send('Name can not be empty');
		if (name.length > 20) return res.status(400).send('Display name must be less than 20 characters');

		user.name = name;

		await user.save();

		res.status(200).send('Display name changed successfully 🚀');
	} catch (error) {
		res.status(500).send(error.message);
	}
});

//add a coin to the watch listen
router.post('/watch-list', Auth, async (req, res) => {
	try {
		const user = await User.findById(req.user);
		if (!user) return res.status(400).send('Please log in to watch a coin');

		const { name, coinId } = req.body;
		if (!name || !coinId) return res.status(400).send('Enter the name of the coin to watch');

		if (name.trim().length === 0) return res.status(400).send('Name can not be empty');

		// check if the coin is already in the watch list
		const watchListArray = user.watchList;
		const checkWatched = (obj) => obj.coinId === coinId;
		if (watchListArray.some(checkWatched) === true) return res.status(400).send('Coin already in the watch list');

		const watchedCoin = { name: name, coinId: coinId };

		await user.watchList.push(watchedCoin);
		await user.save();
		res.status(201).send('Now watching ' + name);
	} catch (error) {
		res.status(500).send(error.message);
	}
});

//remove from watch list
router.put('/watch-list', Auth, async (req, res) => {
	try {
		const user = await User.findById(req.user);
		if (!user) return res.status(400).send('Please log in to view your watch list');

		const { name, coinId } = req.body;

		if (!coinId) return res.status(400).send('Please enter a coin to unwatch');

		//check if th e coin is already in the watch list
		let watchListArray = user.watchList;
		const checkWatched = (obj) => obj.coinId === coinId;
		if (watchListArray.some(checkWatched) === false) return res.status(400).send('Coin not being watched');

		watchListArray = watchListArray.filter((coin) => coin.coinId !== coinId);

		user.watchList = watchListArray;
		await user.save();

		return res.status(200).send('Unwatched ' + name);
	} catch (error) {
		res.status(500).send(error.message);
	}
});

//change the user's card design
router.put('/card-design', Auth, async (req, res) => {
	try {
		const user = await User.findById(req.user);
		if (!user) return res.status(400).send('Please log in to change your card design');

		const { cardDesign } = req.body;

		if (!cardDesign) return res.status(400).send('Please pick a card design');

		user.cardDesign = cardDesign;

		await user.save();

		return res.status(200).send('Card design changed successfully');
	} catch (error) {
		res.status(500).send(error.message);
	}
});

module.exports = router;
