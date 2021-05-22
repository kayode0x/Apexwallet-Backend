const router = require('express').Router();
const User = require('../models/userModel');
const Wallet = require('../models/walletModel');
const Transaction = require('../models/transactionModel');
const Coin = require('../models/coinModel');
const Auth = require('../auth/auth');

//coin gecko
const CoinGecko = require('coingecko-api');
//Initiate the CoinGecko API Client
const CoinGeckoClient = new CoinGecko();

//add or update a coin.
router.post('/', Auth, async (req, res) => {
	//Auth needs to go back.
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

		const { coin, amount, type } = req.body;

		const supportedCoins = [
			'bitcoin',
			'ethereum',
			'ethereum-classic',
			'litecoin',
			'dogecoin',
			'ripple',
			'tether',
			'binancecoin',
			'cardano',
			'usd-coin',
			'tron',
			'bitcoin-cash',
			'polkadot',
			'uniswap',
			'dash',
			'decentraland', //check wallet route to make sure it matches
		];
		const supportedTypes = ['buy', 'sell'];

		//validate the inputs
		if (!coin) return res.status(400).send('Please pick a coin');
		const isCoinSupported = supportedCoins.includes(coin);
		if (isCoinSupported === false) return res.status(400).send(`We do not support currently ${coin}`);

		if (!amount) return res.status(400).send(`Select an amount worth of ${coin}`);
		if (!type) return res.status(400).send('Are you buying or selling?');
		const isTypeSupported = supportedTypes.includes(type);
		if (isTypeSupported === false) return res.status(400).send('We only support Buying and Selling coins for now.');

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
		if (!coinExists) return res.status(400).send(`${coin} is not supported.`)

		//we have buy and sell coins, send and receive coming soon 🚀
		if (type === 'buy') {
			//if the coin is not in the wallet, create it.

			// don't create for now.

			// this is for when we support a new coin.
			if (!coinExists) {
				walletBalance = await Number(wallet.balance);
				//prevent buying more coin(s) than what is in the wallet,
				if (amount < 2)
					return res.status(400).send(`${amount} is too low. You can only buy a minimum of 2 USD`);
				if (Number(amount) > walletBalance)
					return res.status(400).send(`Can not buy more than ${walletBalance}`);

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

				const transaction = await new Transaction({
					coin: coin,
					amount: amount,
					type: 'Bought',
					value: newAmount,
				});

				//save the transaction
				const newTransaction = await transaction.save();
				await wallet.transactions.push(newTransaction);
				await wallet.save();

				return res.status(200).send(newTransaction);
			}

			//if the coin is already in the wallet, update it.
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
			});

			//save the transaction
			const newTransaction = await transaction.save();
			await wallet.transactions.push(newTransaction);
			await wallet.save();

			return res.status(200).send(newTransaction);
		} else if (type === 'sell') {
			if (!coinExists) return res.status(400).send('Can not sell a coin that you do not own');
			//prevent selling more coin(s) than what is in the coin balance
			coinBalance = await Number(coinExists.balance);
			walletBalance = await Number(wallet.balance);

			if (Number(amount) > coinBalance)
				return res.status(400).send(`Can not sell more than ${coinBalance} ${coin}`);

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
			});

			const newTransaction = await transaction.save();
			await wallet.transactions.push(newTransaction);
			await wallet.save();

			return res.status(200).send(newTransaction);
		} //add send and receive here.
	} catch (error) {
		res.status(500).send(error.message);
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
		if (coin.length === 0 && user.isActive === true)
			return res.status(200).send('No coins yet.. Buy now 🚀');
		res.send(coin);
	} catch (error) {
		res.status(500).send(error.message);
	}
});

module.exports = router;
