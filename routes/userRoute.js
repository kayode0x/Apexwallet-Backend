const router = require('express').Router();
const User = require('../models/userModel');
const Auth = require('../auth/auth');
const bcrypt = require('bcryptjs');
const { upload, remove } = require('../utils/image');

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

//change the display picture
router.put('/image', Auth, upload, async (req, res) => {
	try {
		const user = await User.findById(req.user);
		if (!user) return res.status(400).send('Please log in to change your display picture');

		if (req.file) {
			if (req.file.size > 3145728)
				return res.status(400).send('Image size is too large, max size allowed is 3MB');
		}

		upload(req, res, async function (err) {
			if (req.fileValidationError) {
				return res.status(400).send(req.fileValidationError);
			}

			//check if the user uploaded an image
			const image = req.file;
			if (!image) return res.status(400).send('Please pick an image');

			//check if the user has an image
			if (user.image !== '') {
				//get the image key from the user's image
				const key = user.image.split('/')[3];

				// call the remove image method
				await remove(key);

				user.image = '';
				await user.save();
			}

			//set the user's image
			user.image = image.location;
			await user.save();

			return res.status(200).send('Image uploaded successfully.');
		});
	} catch (error) {
		res.status(500).send(error.message);
	}
});

router.delete('/image', Auth, async (req, res) => {
	try {
		const user = await User.findById(req.user);
		if (!user) return res.status(400).send('Please log in to change your display picture');

		if (user.image !== '') {
			//get the image key from the user's image
			const key = user.image.split('/')[3];

			// call the remove image method
			await remove(key);

			user.image = '';
			await user.save();

			return res.status(200).send('Image deleted successfully.');
		} else return res.status(400).send("You don't have a display picture.");
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

// router.post('/all', Auth, async (req, res) => {
// 	try {
// 		const users = await User.find({});
// 		const addField = async (user) => {
// 			let level = 1;
// 			user.level = level;
// 			await user.save();
// 		};
// 		users.forEach((user) => addField(user));
// 		return res.status(200).send(users);
// 	} catch (error) {
// 		res.status(500).send(error.message);
// 	}
// });

module.exports = router;
