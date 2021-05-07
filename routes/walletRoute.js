const router = require('express').Router();
const User = require('../models/userModel');
const Wallet = require('../models/walletModel');
const Auth = require ('../auth/auth')

router.post('/', Auth, async (req, res) => {
	try {
		const user = await User.findById(req.user);
		if (!user) return res.status(400).json({ message: 'User does not exist' });

		if (user.isActive === false)
			return res.status(400).json({ message: 'Verify your account to create a wallet 🚀' });

		//check if the user already has a wallet
		const wallet = await Wallet.findOne({ user: user._id })
		if(wallet) return res.status(400).json({ message: 'User already has a wallet.'})

		const newWallet = await new Wallet({
			user: user._id,
		});

        const savedWallet = await newWallet.save();

        await User.findOneAndUpdate({ _id: user._id }, { wallet: savedWallet }, { new: true });
        await user.save();

        res.status(201).send(savedWallet);

	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

router.get('/', Auth, async (req, res) => {
	try {
		const wallet = await Wallet.findOne({ user: req.user}).populate('user coins');
		if(!wallet) return res.status(400).json({ message: 'No wallet found. Open a wallet to start trading 🚀' });
        res.send(wallet);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

module.exports = router;
