const jwt = require("jsonwebtoken");

async function Auth(req, res, next) {
  try {
    const { accessToken } = req.cookies;
    if (!accessToken) return res.status(401).send("Please Login");

    const verified = jwt.verify(accessToken, process.env.JWT_SECRET);

    //if the token is valid, then verify the user.
    req.user = verified.user;
    next(); //use this method to keep moving.
  } catch (error) {
    return res.status(401).send("Please Login");
  }
}

module.exports = Auth;
