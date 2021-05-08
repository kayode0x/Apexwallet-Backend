const router = require('express').Router();
const User = require('../models/userModel');
const Auth = require('../auth/auth');

//get user
router.get('/', Auth, async (req, res) => {
    try {
        const user = await User.findById(req.user).select('+wallet +email').populate('wallet');
        res.status(200).send({ message: user});

    } catch (error) {
        res.status(500).json({message: error.message});
    }
})

module.exports = router;