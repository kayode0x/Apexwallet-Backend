const router = require('express').Router();
const User = require('../models/userModel');
const Wallet = require('../models/walletModel');
const Transaction = require('../models/transactionModel');
const Coin = require('../models/coinModel');
const Auth = require('../auth/auth');

//add or update a coin.
router.post('/', Auth, async (req, res) => {
	try {
		const { coin, amount, type } = req.body;
		if (!coin) return res.status(400).json({ message: 'Please pick a coin' });
		if (!amount) return res.status(400).json({ message: `Select an amount worth of ${coin}` });
		if (!type) return res.status(400).json({ message: 'Are you buying or selling?' });

		const user = await User.findById(req.user).select('+wallet');
		if (!user) return res.status(400).json({ message: 'User does not exist' });
		if (user.isActive === false) return res.status(400).json({ message: 'Verify your account to buy coins 🚀' });
		const wallet = await Wallet.findOne({ _id: user.wallet }).populate('coins');
		if (!wallet) return res.status(400).json({ message: 'No wallet found. Open a wallet to start trading 🚀' });

		//check if the coin is already in the wallet, to prevent double
		const coinExists = await Coin.findOne({ coin: coin });
		if (coinExists) {
			let newWalletBalance;
			let newCoinBalance;
			var coinBalance = Number(coinExists.balance);
			var walletBalance = Number(wallet.balance);

			//we have buy and sell coins, send and receive coming soon 🚀
			if (type === 'BUY') {
				//prevent buying more coin(s) than what is in the wallet,
				if (Number(amount) > wallet.balance)
					return res.status(400).json({ message: `Can not buy more than ${walletBalance}` });

				//deduct from the wallet
				newWalletBalance = walletBalance - Number(amount);
				//add to the coin balance
				newCoinBalance = coinBalance + Number(amount);
			} else {
				//prevent selling more coin(s) than what is in the coin balance
				if (Number(amount) > coinBalance)
					return res.status(400).json({ message: `Can not sell more than ${coinBalance}` });
				//deduct from the coin balance
				newCoinBalance = coinBalance - Number(amount);
				//add to the wallet
				newWalletBalance = walletBalance + Number(amount);
			}
			const updatedWallet = await Wallet.findOneAndUpdate(
				{ _id: user.wallet },
				{ balance: newWalletBalance },
				{ new: true }
			);
			await updatedWallet.save();
			const updatedCoin = await Coin.findOneAndUpdate({ coin: coin }, { balance: newCoinBalance }, { new: true });
			await updatedCoin.save();

			const transaction = await new Transaction({
                coin: coin,
                amount: amount,
                type: type,
            })

            const newTransaction = await transaction.save();
			await wallet.transactions.push(newTransaction);
            await wallet.save();

			return res.send(newTransaction);
		}

		let newBalance;
		if (amount) {
			newBalance = amount;
		} else {
			newBalance = 0;
		}

		const newCoin = await new Coin({
			wallet: user.wallet,
			coin: req.body.coin,
			balance: newBalance,
			type: req.body.type,
		});

		const savedCoin = await newCoin.save();
		await wallet.coins.push(savedCoin);
		await wallet.save();

		res.send(savedCoin);
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
