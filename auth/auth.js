const jwt = require('jsonwebtoken');

function Auth(req, res, next) {
	try {
		//first check if there is a cookie present
		const token = req.cookies.jwt_token;
		if (!token) return res.status(401).json({ message: 'Unauthorized' });

		//if there is a cookie, verify it.
		const verified = jwt.verify(token, process.env.JWT_SECRET);

		//if the token is valid, then verify the user.
		req.user = verified.user;
		next(); //use this method to keep moving.
	} catch (error) {
		res.status(401).json({ message: 'Unauthorized' });
	}
}

module.exports = Auth;
