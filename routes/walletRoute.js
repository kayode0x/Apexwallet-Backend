const router = require('express').Router();
const User = require('../models/userModel');
const Wallet = require('../models/walletModel');
const Auth = require('../auth/auth');
const Coin = require('../models/coinModel');
const Transaction = require('../models/transactionModel');
const supportedCoins = require('../utils/supportedCoins');

//create a new wallet.
router.post('/', Auth, async (req, res) => {
	try {
		const user = await User.findById(req.user);
		if (!user) return res.status(400).send('User does not exist');

		if (user.isActive === false) return res.status(400).send('Verify your account to create a wallet 🚀');

		//check if the user already has a wallet
		const wallet = await Wallet.findOne({ user: user._id });
		if (wallet) return res.status(400).send('You already have a wallet');

		//create a new transaction based on the free cash
		const transaction = await new Transaction({
			coin: 'Free',
			amount: 500,
			type: 'Free',
			value: 500,
			name: 'Free',
		});

		//save the transaction
		const newTransaction = await transaction.save();

		//finally create a wallet for the user
		const newWallet = await new Wallet({
			user: user._id,
			transactions: [newTransaction],
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

		//call the function to add the coins to the wallet.
		supportedCoins.forEach(addCoin);

		//send the user because sending the new wallet isn't working...
		res.status(201).send('Wallet created successfully! 🚀');
	} catch (error) {
		res.status(500).send(error.message);
	}
});

//get the wallet of the logged in user.
router.get('/', Auth, async (req, res) => {
	try {
		//find the logged in user
		const user = await User.findById(req.user);
		if (!user) return res.status(400).send('Please log in');

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
		if (!wallet && user.isActive === false) return res.status(200).send(null);
		if (!wallet && user.isActive === true) return res.status(200).send(null);
		res.send(wallet);
	} catch (error) {
		res.status(500).send(error.message);
	}
});

//send cash to another user.
router.post('/send-cash', Auth, async (req, res) => {
	const user = await User.findById(req.user).select('+wallet');
	if (!user) return res.status(400).send('User does not exist');

	if (user.isActive === false) return res.status(400).send('Verify your account to send cash.');

	//check if the user has a wallet
	const wallet = await Wallet.findOne({ user: user._id });
	if (!wallet) return res.status(400).send("You don't have a wallet");

	try {
		const { amount, recipient } = req.body;

		//validate the input
		if (!amount || !recipient) return res.status(400).send('Please enter an amount to send and a recipient');

		//you can only send a minimum of $2.
		if (amount < 2) return res.status(400).send('You can only send a minimum of $2');

		//check if the amount to send is more than the user's balance.
		if (amount > wallet.balance) return res.status(400).send(`You can't send more than $${wallet.balance}`);

		//check if the recipient exists.
		const theRecipient = await User.findOne({ username: recipient }).select('+wallet');
		if (!theRecipient) return res.status(400).send("Couldn't find the recipient");

		//prevent the user from sending to their self.
		if (user.username === theRecipient.username) return res.status(400).send('You cannot send cash to yourself');

		//check if the recipient has a wallet.
		const recipientWallet = await Wallet.findOne({ user: theRecipient._id });
		if (!recipientWallet) return res.status(400).send('The recipient does not have a wallet.');

		//get the current values of the user & recipient wallet balance.
		let userBalance = wallet.balance;
		let recipientBalance = recipientWallet.balance;

		let newUserBalance = Number(userBalance) - Number(amount);
		let newRecipientBalance = Number(recipientBalance) + Number(amount);

		//save the user and recipient wallet balance with the new values.
		wallet.balance = newUserBalance;
		await wallet.save();

		recipientWallet.balance = newRecipientBalance;
		await recipientWallet.save();

		//create a new user transaction
		const userTransaction = await new Transaction({
			coin: 'Dollars',
			amount: amount,
			type: 'Sent',
			value: amount,
			name: theRecipient.username,
		});

		//save the transaction
		const newUserTransaction = await userTransaction.save();
		await wallet.transactions.push(newUserTransaction);
		await wallet.save();

		//create a new recipient transaction
		const recipientTransaction = await new Transaction({
			coin: 'Dollars',
			amount: amount,
			type: 'Received',
			value: amount,
			name: user.username,
		});

		//save the transaction
		const newRecipientTransaction = await recipientTransaction.save();
		await recipientWallet.transactions.push(newRecipientTransaction);
		await recipientWallet.save();

		res.status(200).send(userTransaction);
	} catch (error) {
		res.status(500).send(error.message);
	}
});

module.exports = router;
