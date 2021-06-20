const router = require('express').Router();
const User = require('../models/userModel');
const Wallet = require('../models/walletModel');
const Transaction = require('../models/transactionModel');
const Coin = require('../models/coinModel');
const Message = require('../models/messageModel');
const Auth = require('../auth/auth');
const supportedCoins = require('../utils/supportedCoins');
const coinSymbol = require('../utils/coinSymbol');

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

		const symbol = coinSymbol(coin);

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

		//if the coin doesn't exist in the wallet, create it.
		if (!coinExists) {
			walletBalance = await Number(wallet.balance);
			//prevent buying more coin(s) than what is in the wallet,
			if (amount < 2) return res.status(400).send(`${amount} is too low. You can only buy a minimum of 2 USD`);
			if (Number(amount) > walletBalance) return res.status(400).send(`Can not buy more than ${walletBalance}`);

			//get the current coin you are trying to buy's price
			newCoinPrice = await getCoinPrice(coin);

			//then convert the coin price to the crypto equivalent.
			newAmount = (await Number(amount)) / newCoinPrice;

			//deduct from the wallet
			newWalletBalance = (await walletBalance) - Number(amount);

			const newCoin = await new Coin({
				wallet: user.wallet,
				coin: req.body.coin,
				balance: newAmount,
			});

			//only update balance from a triggered account, don't user PUT/PATCH.
			wallet.balance = newWalletBalance;
			await wallet.save();
			const savedCoin = await newCoin.save();
			await wallet.coins.push(savedCoin);
			await wallet.save();

			//create a new transaction
			const transaction = await new Transaction({
				coin: coin,
				amount: amount,
				type: 'Bought',
				value: newAmount,
				name: `${parseFloat(newAmount).toFixed(6)} ${symbol}`,
			});

			//save the transaction
			const newTransaction = await transaction.save();
			await wallet.transactions.push(newTransaction);
			await wallet.save();

			return res.status(200).send(newTransaction);
		}

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
			name: `${parseFloat(newAmount).toFixed(6)} ${symbol}`,
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

		const symbol = coinSymbol(coin);

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
			name: `${amount} ${symbol}`,
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
		//validate the input.
		const { coin, amount, recipient, method, memo } = req.body;
		if (!coin || !amount || !recipient || !method) return res.status(400).send('Please fill in all fields');

		if (memo !== undefined && memo.length > 50)
			return res.status(400).send("Memo can't be longer than 50 characters");

		const isCoinSupported = supportedCoins.includes(coin);
		if (isCoinSupported === false) return res.status(400).send(`We do not currently support ${coin}`);

		const symbol = coinSymbol(coin);

		//check if the user exists.
		const user = await User.findById(req.user);
		if (!user) return res.status(400).send('Please login to send coins');

		//check if the user has a wallet.
		const wallet = await Wallet.findOne({ user: user }).populate('coins');
		if (!wallet) return res.status(400).send('Please create a wallet before sending coins');

		//check if the coin is already in the wallet.
		const userCoin = await Coin.findOne({ wallet: wallet, coin: coin });
		if (!userCoin) return res.status(400).send(`${coin} is not supported.`);

		//make sure the amount isn't more than the balance and isn't less than 0.
		if (amount > userCoin.balance)
			return res.status(400).send(`You can't send more than ${userCoin.balance} ${symbol}`);
		if (amount <= 0) return res.status(400).send(`Amount must be greater than 0 ${symbol}`);

		let recipientCoin;
		let recipientWallet;
		let theRecipient;

		//allow users chose if they want to send coins with username or address
		if (method === 'username') {
			//check if the recipient exists.
			theRecipient = await User.findOne({ username: recipient.toLowerCase() }).select('+wallet');
			if (!theRecipient) return res.status(400).send(`Couldn't find a user with the username ${recipient}`);

			//prevent the user from sending to their self.
			if (user.username === theRecipient.username)
				return res.status(400).send(`You cannot send ${coin} to yourself`);

			//check if the recipient has a wallet.
			recipientWallet = await Wallet.findOne({ user: theRecipient._id });
			if (!recipientWallet) return res.status(400).send('The recipient does not have a wallet.');

			//check if the user has the coin is already in the wallet.
			recipientCoin = await Coin.findOne({ wallet: recipientWallet, coin: coin });
			if (!recipientCoin) return res.status(400).send(`Recipient doesn't have ${coin}`);
		} else if (method === 'address') {
			//prevent the user from sending to their self.
			if (userCoin._id == recipient) return res.status(400).send(`You cannot send ${coin} to yourself`);
			//check if the recipient exists.
			recipientCoin = await Coin.findById(recipient);
			if (!recipientCoin) return res.status(400).send(`Couldn't find ${coin} with that address`);

			//make sure the recipientCoin matches the coin coming in.
			if (coin !== recipientCoin.coin)
				return res
					.status(400)
					.send(`Here on Apex, that is a ${recipientCoin.coin} address, gotta be careful <3`);

			//check if the recipient has a wallet.
			recipientWallet = await Wallet.findById(recipientCoin.wallet);
			if (!recipientWallet) return res.status(400).send('The recipient does not have a wallet.');

			//find the user so we can get the username.
			theRecipient = await User.findById(recipientWallet.user);
			if (!theRecipient) return res.status(400).send(`Couldn't find a user with the username ${recipient}`);
		}

		//continue trying to send coins.
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
			symbol: symbol,
			type: 'Sent',
			value: amount,
			name: method === 'username' ? `Transfer to ${theRecipient.username}` : `Transfer to ${recipientCoin._id}`,
			memo: memo && memo,
		});

		//save the transaction
		const newUserTransaction = await userTransaction.save();
		await wallet.transactions.push(newUserTransaction);
		await wallet.save();

		//create a new recipient transaction
		const recipientTransaction = await new Transaction({
			coin: coin,
			amount: amount,
			symbol: symbol,
			type: 'Received',
			value: amount,
			name: method === 'username' ? `Transfer from ${user.username}` : `Transfer from ${userCoin._id}`, //set the transaction name based on the method used.
			memo: memo && memo,
		});

		//save the transaction
		const newRecipientTransaction = await recipientTransaction.save();
		await recipientWallet.transactions.push(newRecipientTransaction);
		await recipientWallet.save();

		//send an alert to the recipient
		const message = await new Message({
			title: `${user.name ? user.name : user.username} sent you ${amount} ${symbol}`,
			text: memo ? memo : 'The transaction has been completed, and should show up in no time.',
			user: theRecipient._id,
		});

		//save the message
		const newMessage = await message.save();
		await theRecipient.messages.push(newMessage);
		await theRecipient.save();

		return res.status(200).send(newUserTransaction);
	} catch (error) {
		res.status(500).send(error.message);
	}
});

//lock some amount of coin.

//convert coins.
router.post('/convert', Auth, async (req, res) => {
	//get the coinFrom, amount and coinTo.
	//check the coingecko sdk to see if theres a conversion method.
	//else sell coinFrom as USD, then buy coinTo with the USD.
	const { coinFrom, amount, coinTo } = req.body;
	if (!coinFrom || !amount || !coinTo) return res.status(400).send('Please enter the required fields');

	try {
		async function getCoinPrice(coin1, coin2) {
			const data = await CoinGeckoClient.simple.price({
				ids: [coin1, coin2],
				vs_currencies: ['usd'],
			});
			var coinFromPrice = await data['data'][`${coin1}`]['usd'];
			var coinToPrice = await data['data'][`${coin2}`]['usd'];
			return { coinFromPrice, coinToPrice };
		}

		const bro = await getCoinPrice(coinFrom, coinTo);
		console.log(bro.coinFromPrice);
		return res.status(200).send('Bro ' + bro.coinFromPrice);
	} catch (error) {
		return res.status(500).send(error.message);
	}
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
