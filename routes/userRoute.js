const router = require('express').Router();
const User = require('../models/userModel');
const Auth = require('../auth/auth');

//get user
router.get('/', Auth, async (req, res) => {
    try {
        const user = await User.findById(req.user).select('+wallet +email').populate('wallet');
        if(!user) return res.status(400).json({ message: 'Please log in.'})
        res.status(200).json({ message: user});

    } catch (error) {
        res.status(500).json({message: error.message});
    }
})

//update a user
router.put('/', Auth, async (req, res) => {
    try {
        
    } catch (error) {
        
    }
})

module.exports = router;