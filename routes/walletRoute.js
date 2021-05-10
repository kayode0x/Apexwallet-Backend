const router = require('express').Router();
const User = require('../models/userModel');
const Wallet = require('../models/walletModel');
const Auth = require('../auth/auth');
const Coin = require('../models/coinModel');
const Transaction = require('../models/transactionModel');


//coin gecko
const CoinGecko = require('coingecko-api');
//Initiate the CoinGecko API Client
const CoinGeckoClient = new CoinGecko();


router.post('/', Auth, async (req, res) => {
	try {
		const user = await User.findById(req.user);
		if (!user) return res.status(400).send('User does not exist');

		if (user.isActive === false)
			return res.status(400).send('Verify your account to create a wallet 🚀');

		//check if the user already has a wallet
		const wallet = await Wallet.findOne({ user: user._id });
		if (wallet) return res.status(400).send('You already have a wallet');

		//create a new transaction based on the free cash
		const transaction = await new Transaction({
			coin: 'Dollars',
			amount: 500,
			type: 'Free',
			value: 500,
		});

		//save the transaction
		const newTransaction = await transaction.save();

		//finally create a wallet for the user
		const newWallet = await new Wallet({
			user: user._id,
			transactions: [newTransaction, ]
		});
		//save the wallet with the new data
		const savedWallet = await newWallet.save();

		//also update the user
		await User.findOneAndUpdate({ _id: user._id }, { wallet: savedWallet }, { new: true });
		await user.save();

		//on creating a wallet, auto add all the coins we support into the wallet.
		async function addCoin(coin) {
			try {
				const userWallet = await Wallet.findOne({ user: req.user });
				const newCoins = await new Coin({
					wallet: userWallet,
					coin: coin,
					balance: 0,
				});

				const savedCoin = await newCoins.save();
				await userWallet.coins.push(savedCoin);
				await userWallet.save();
			} catch (error) {
				res.status(500).send(error.message);
			}
		}

		//list of all the coins that we support. add more coins if needed.
		[
			'bitcoin',
			'ethereum',
			'ethereum-classic',
			'litecoin',
			'dogecoin',
			'ripple',
			'tether',
			'binancecoin',
			'tron',
		].forEach(addCoin); //call the function to add the coins to the wallet.

		//send the user because sending the new wallet isn't working...
		res.status(201).send(newTransaction);
	} catch (error) {
		res.status(500).send(error.message );
	}
});


//get the wallet of the logged in user.
router.get('/', Auth, async (req, res) => {
	try {
		//find the logged in user
		const user = await User.findById(req.user);
		if (!user) return res.status(400).send("Please log in");

		const wallet = await Wallet.findOne({ user: req.user })
			.populate('user coins')
			.populate({
				path: 'transactions',
				options: {
					sort: {
						date: -1,
					},
				},
			});
		if (!wallet && user.isActive === false)
			return res.status(200).send('Verify your email address to Open a wallet 🚀' );
		if (!wallet && user.isActive === true)
			return res.status(200).send('No wallet found. Open a wallet to start trading 🚀' );
		res.send(wallet);
	} catch (error) {
		res.status(500).send(error.message);
	}
});

module.exports = router;
