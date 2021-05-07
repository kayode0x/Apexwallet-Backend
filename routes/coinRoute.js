const router = require('express').Router();
const User = require('../models/userModel');
const Wallet = require('../models/walletModel');
const Transaction = require('../models/transactionModel');
const Coin = require('../models/coinModel');
const Auth = require('../auth/auth');

//add or update a coin.
router.post('/', Auth, async (req, res) => {
	try {
		let newWalletBalance;
		let newCoinBalance;
		let coinBalance;
		let walletBalance;

		const { coin, amount, type } = req.body;
		//validate the inputs
		if (!coin) return res.status(400).json({ message: 'Please pick a coin' });
		if (!amount) return res.status(400).json({ message: `Select an amount worth of ${coin}` });
		if (!type) return res.status(400).json({ message: 'Are you buying or selling?' });

		//check if the user exists
		const user = await User.findById(req.user).select('+wallet');
		if (!user) return res.status(400).json({ message: 'User does not exist' });

		//only active users can buy coins
		if (user.isActive === false) return res.status(400).json({ message: 'Verify your account to buy coins 🚀' });

		//check if the wallet exists
		const wallet = await Wallet.findOne({ _id: user.wallet }).populate('coins');
		if (!wallet) return res.status(400).json({ message: 'No wallet found. Open a wallet to start trading 🚀' });

		//check if the coin is already in the wallet, to prevent doubling.
		const coinExists = await Coin.findOne({ coin: coin });

		//we have buy and sell coins, send and receive coming soon 🚀
		if (type === 'BUY') {
			//if the coin is not in the wallet, create it.
			if (!coinExists) {
				walletBalance = await Number(wallet.balance);
				//prevent buying more coin(s) than what is in the wallet,
				if (Number(amount) > walletBalance)
					return res.status(400).json({ message: `Can not buy more than ${walletBalance}` });

				//deduct from the wallet
				newWalletBalance = (await walletBalance) - Number(amount);
				//add to the coin balance
				newCoinBalance = Number(amount);

				const newCoin = await new Coin({
					wallet: user.wallet,
					coin: req.body.coin,
					balance: newCoinBalance,
				});

				//only update balance from a triggered account, don't user PUT/PATCH.
				const updatedWallet = await Wallet.findOneAndUpdate(
					{ _id: user.wallet },
					{ balance: newWalletBalance },
					{ new: true }
				);

				await updatedWallet.save();
				const savedCoin = await newCoin.save();
				await wallet.coins.push(savedCoin);
				await wallet.save();

				const transaction = await new Transaction({
					coin: coin,
					amount: amount,
					type: type,
				});

				//save the transaction
				const newTransaction = await transaction.save();
				await wallet.transactions.push(newTransaction);
				await wallet.save();

				return res.send(newTransaction);
			}

			//if the coin is already in the wallet, update it.
			walletBalance = await Number(wallet.balance);
			coinBalance = await Number(coinExists.balance);

			//prevent buying more coin(s) than what is in the wallet,
			if (Number(amount) > wallet.balance)
				return res.status(400).json({ message: `Can not buy more than $${walletBalance}` });

			//deduct from the wallet
			newWalletBalance = (await walletBalance) - Number(amount);

			//add to the coin balance
			newCoinBalance = (await coinBalance) + Number(amount);

			//only update balance from a triggered account, don't user PUT/PATCH.
			const updatedWallet = await Wallet.findOneAndUpdate(
				{ _id: user.wallet },
				{ balance: newWalletBalance },
				{ new: true }
			);

            //update the wallet, then update the coin balance
			await updatedWallet.save();
            const updatedCoin = await Coin.findOneAndUpdate({ coin: coin }, { balance: newCoinBalance }, { new: true });
			await updatedCoin.save();

            //create a new transaction
			const transaction = await new Transaction({
				coin: coin,
				amount: amount,
				type: type,
			});

            //save the transaction
			const newTransaction = await transaction.save();
			await wallet.transactions.push(newTransaction);
			await wallet.save();
		} else if (type === 'SELL') {
			if (!coinExists) return res.status(400).json({ message: 'Can not sell a coin that you do not own' });
			//prevent selling more coin(s) than what is in the coin balance
			coinBalance = await Number(coinExists.balance);
			walletBalance = await Number(wallet.balance);

			if (Number(amount) > coinBalance)
				return res.status(400).json({ message: `Can not sell more than ${coinBalance} ${coin}` });

			//deduct from the coin balance
			coinBalance = await Number(coinExists.balance);
			newCoinBalance = (await coinBalance) - Number(amount);

			//add to the wallet
			newWalletBalance = (await walletBalance) + Number(amount);

			//only update balance from a triggered account, don't user PUT/PATCH.
			const updatedWallet = await Wallet.findOneAndUpdate(
				{ _id: user.wallet },
				{ balance: newWalletBalance },
				{ new: true }
			);
			await updatedWallet.save();
			const updatedCoin = await Coin.findOneAndUpdate({ coin: coin }, { balance: newCoinBalance }, { new: true });
			await updatedCoin.save();

			//save the transaction
			const transaction = await new Transaction({
				coin: coin,
				amount: amount,
				type: type,
			});

			const newTransaction = await transaction.save();
			await wallet.transactions.push(newTransaction);
			await wallet.save();

			return res.send(newTransaction);
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

//get the coins.
router.get('/', Auth, async (req, res) => {
	try {
		const coin = await Coin.find();
		res.send(coin);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

module.exports = router;
