const router = require('express').Router();
const User = require('../models/userModel');
const Wallet = require('../models/walletModel');
const Transaction = require('../models/transactionModel');
const Coin = require('../models/coinModel');
const Auth = require('../auth/auth');
const supportedCoins = require('../utils/supportedCoins');

//coin gecko
const CoinGecko = require('coingecko-api');
//Initiate the CoinGecko API Client
const CoinGeckoClient = new CoinGecko();

//buy coins
router.post('/buy', Auth, async (req, res) => {
	try {
		let newWalletBalance; //updated wallet balance.
		let newCoinBalance; // updated coin balance.
		let coinBalance; //old coin balance.
		let walletBalance; //old wallet balance.
		let newCoinPrice;
		let newAmount; //convert the original amount to the crypto equivalent

		//function to get the latest coin price *market
		async function getCoinPrice(coin) {
			const data = await CoinGeckoClient.simple.price({
				ids: [coin],
				vs_currencies: ['usd'],
			});
			var coinPrice = await data['data'][`${coin}`]['usd'];
			return coinPrice;
		}

		const { coin, amount } = req.body;

		//validate the inputs
		if (!coin) return res.status(400).send('Please pick a coin');
		const isCoinSupported = supportedCoins.includes(coin);
		if (isCoinSupported === false) return res.status(400).send(`We do not currently support ${coin}`);

		if (!amount) return res.status(400).send(`Select an amount worth of ${coin}`);

		//check if the user exists
		const user = await User.findById(req.user).select('+wallet');
		if (!user) return res.status(400).send('User does not exist');

		//only active users can buy coins
		if (user.isActive === false) return res.status(400).send('Verify your account to buy coins 🚀');
		if (user.wallet === undefined && user.isActive === true) {
			return res.send('You can open a wallet now to start trading 🚀');
		}
		//check if the wallet exists
		const wallet = await Wallet.findOne({ _id: user.wallet }).populate('coins');
		if (!wallet) return res.status(400).send('No wallet found. Open a wallet to start trading 🚀');

		//check if the coin is already in the wallet, to prevent doubling.
		const coinExists = await Coin.findOne({ wallet: wallet, coin: coin });
		if (!coinExists) return res.status(400).send(`${coin} is not supported.`);

		walletBalance = await Number(wallet.balance);
		coinBalance = await Number(coinExists.balance);

		if (amount < 2) return res.status(400).send(`${amount} is too low. You can only buy a minimum of 2 USD`);

		//prevent buying more coin(s) than what is in the wallet,
		if (Number(amount) > wallet.balance) return res.status(400).send(`Can not buy more than $${walletBalance}`);

		//get the current coin you are trying to buy's price
		newCoinPrice = await getCoinPrice(coin);

		//then convert the coin price to the crypto equivalent.
		newAmount = (await Number(amount)) / newCoinPrice;

		//deduct from the wallet
		newWalletBalance = (await walletBalance) - Number(amount);

		//add to the coin balance
		newCoinBalance = (await coinBalance) + newAmount;

		//only update balance from a triggered account, don't user PUT/PATCH.
		wallet.balance = newWalletBalance;

		//update the wallet, then update the coin balance
		await wallet.save();

		coinExists.balance = newCoinBalance;
		await coinExists.save();

		//create a new transaction
		const transaction = await new Transaction({
			coin: coin,
			amount: amount,
			type: 'Bought',
			value: newAmount,
			name: `${coin} @ ${parseFloat(newAmount).toFixed(6)}`,
		});

		//save the transaction
		const newTransaction = await transaction.save();
		await wallet.transactions.push(newTransaction);
		await wallet.save();

		return res.status(200).send(newTransaction);
	} catch (error) {
		res.status(500).send(error.message);
	}
});

//sell coins
router.post('/sell', Auth, async (req, res) => {
	try {
		let newWalletBalance; //updated wallet balance.
		let newCoinBalance; // updated coin balance.
		let coinBalance; //old coin balance.
		let walletBalance; //old wallet balance.
		let newCoinPrice;
		let newAmount; //convert the original amount to the crypto equivalent

		//function to get the latest coin price *market
		async function getCoinPrice(coin) {
			const data = await CoinGeckoClient.simple.price({
				ids: [coin],
				vs_currencies: ['usd'],
			});
			var coinPrice = await data['data'][`${coin}`]['usd'];
			return coinPrice;
		}

		const { coin, amount } = req.body;

		//validate the inputs
		if (!coin) return res.status(400).send('Please pick a coin');
		const isCoinSupported = supportedCoins.includes(coin);
		if (isCoinSupported === false) return res.status(400).send(`We do not currently support ${coin}`);

		if (!amount) return res.status(400).send(`Select an amount worth of ${coin}`);

		//check if the user exists
		const user = await User.findById(req.user).select('+wallet');
		if (!user) return res.status(400).send('User does not exist');

		//only active users can buy coins
		if (user.isActive === false) return res.status(400).send('Verify your account to buy coins 🚀');
		if (user.wallet === undefined && user.isActive === true) {
			return res.send('You can open a wallet now to start trading 🚀');
		}
		//check if the wallet exists
		const wallet = await Wallet.findOne({ _id: user.wallet }).populate('coins');
		if (!wallet) return res.status(400).send('No wallet found. Open a wallet to start trading 🚀');

		//check if the coin is already in the wallet, to prevent doubling.
		const coinExists = await Coin.findOne({ wallet: wallet, coin: coin });
		if (!coinExists) return res.status(400).send('Can not sell a coin that you do not own');

		//prevent selling more coin(s) than what is in the coin balance
		coinBalance = await Number(coinExists.balance);
		walletBalance = await Number(wallet.balance);

		if (Number(amount) > coinBalance) return res.status(400).send(`Can not sell more than ${coinBalance} ${coin}`);

		//get the current coin you are trying to buy's price
		newCoinPrice = await getCoinPrice(coin);

		//then convert the coin price to the crypto equivalent.
		newAmount = (await Number(amount)) * newCoinPrice;

		//deduct from the coin balance
		newCoinBalance = (await coinBalance) - Number(amount);

		//add to the wallet
		newWalletBalance = (await walletBalance) + newAmount;

		//only update balance from a triggered account, don't user PUT/PATCH.
		wallet.balance = newWalletBalance;
		await wallet.save();

		coinExists.balance = newCoinBalance;
		await coinExists.save();

		//save the transaction
		const transaction = await new Transaction({
			coin: coin,
			amount: newAmount,
			type: 'Sold',
			value: amount,
			name: `${coin} @ ${amount}`,
		});

		const newTransaction = await transaction.save();
		await wallet.transactions.push(newTransaction);
		await wallet.save();

		return res.status(200).send(newTransaction);
	} catch (error) {
		res.status(500).send(error.message);
	}
});

//send coins to another user.
router.post('/send', Auth, async (req, res) => {
	try {
		//check if the user exists.
		const user = await User.findById(req.user);
		if (!user) return res.status(400).send('Please login to send coins');

		//check if the user has a wallet.
		const wallet = await Wallet.findOne({ user: user }).populate('coins');
		if (!wallet) return res.status(400).send('Please create a wallet before sending coins');

		//validate the input.
		const { coin, amount, recipient } = req.body;
		if (!coin || !amount || !recipient) return res.status(400).send('Please fill in all fields');

		//check if the recipient exists.
		const theRecipient = await User.findOne({ username: recipient }).select('+wallet');
		if (!theRecipient) return res.status(400).send(`Couldn't find a user with the username ${recipient}`);

		//check if the recipient has a wallet.
		const recipientWallet = await Wallet.findOne({ user: theRecipient._id });
		if (!recipientWallet) return res.status(400).send('The recipient does not have a wallet.');

		//prevent the user from sending to their self.
		if (user.username === theRecipient.username) return res.status(400).send(`You cannot send ${coin} to yourself`);

		const isCoinSupported = supportedCoins.includes(coin);
		if (isCoinSupported === false) return res.status(400).send(`We do not currently support ${coin}`);

		//check if the coin is already in the wallet.
		const userCoin = await Coin.findOne({ wallet: wallet, coin: coin });
		if (!userCoin) return res.status(400).send(`${coin} is not supported.`);

		//check if the user has the coin is already in the wallet.
		const recipientCoin = await Coin.findOne({ wallet: recipientWallet, coin: coin });
		if (!recipientCoin) return res.status(400).send(`Recipient doesn't have ${coin}`);

		//make sure the amount isn't more than the balance and isn't less than 0.
		if (amount > userCoin.balance) return res.status(400).send(`You can't send more than ${userCoin.balance}`);
		if (amount <= 0) return res.status(400).send('Amount must be greater than 0');

		let userBalance = userCoin.balance;
		let recipientBalance = recipientCoin.balance;

		let newUserBalance = Number(userBalance) - Number(amount);
		let newRecipientBalance = Number(recipientBalance) + Number(amount);

		//save the user and recipient wallet balance with the new values.
		userCoin.balance = newUserBalance;
		await userCoin.save();

		recipientCoin.balance = newRecipientBalance;
		await recipientCoin.save();

		//create a new user transaction
		const userTransaction = await new Transaction({
			coin: coin,
			amount: amount,
			type: 'Sent',
			value: amount,
			name: `${theRecipient.username} (${coin})`,
		});

		//save the transaction
		const newUserTransaction = await userTransaction.save();
		await wallet.transactions.push(newUserTransaction);
		await wallet.save();

		//create a new recipient transaction
		const recipientTransaction = await new Transaction({
			coin: coin,
			amount: amount,
			type: 'Received',
			value: amount,
			name: `${user.username} (${coin})`,
		});

		//save the transaction
		const newRecipientTransaction = await recipientTransaction.save();
		await recipientWallet.transactions.push(newRecipientTransaction);
		await recipientWallet.save();

		return res.status(200).send(newUserTransaction);
	} catch (error) {
		res.status(500).send(error.message);
	}
});

//convert coins.
router.post('/convert', Auth, async (req, res) => {
	//get the coinFrom, amount and coinTo.
	//check the coingecko sdk to see if theres a conversion method.
	//else sell coinFrom as USD, then buy coinTo with the USD.
});

//request coin from another user.
router.post('/request-coin', Auth, async (req, res) => {
	//requires amount and the person to request from.
	//use nodemailer to send a notification.
	//create a notifications model that stores all notifications of the logged in user.
	//try to allow auto payments with a single click
});

//get the coins.
router.get('/', Auth, async (req, res) => {
	try {
		const user = await User.findById(req.user).select('+wallet');
		if (!user) return res.status(400).send('User not found');
		if (user.isActive === false) return res.status(400).send('Verify your account to buy coins 🚀');
		if (user.wallet === undefined && user.isActive === true) {
			return res.send('You can open a wallet now to start trading 🚀');
		}
		const coin = await Coin.find({ wallet: user.wallet });
		if (coin.length === 0 && user.isActive === true) return res.status(200).send('No coins yet.. Buy now 🚀');
		res.send(coin);
	} catch (error) {
		res.status(500).send(error.message);
	}
});

module.exports = router;
