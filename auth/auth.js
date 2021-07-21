const jwt = require("jsonwebtoken");
const tokens = require("../middleware/tokens");

async function Auth(req, res, next) {
  try {
    //first check if there is a cookie present
    const { accessToken, refreshToken } = req.cookies;
    if (!accessToken) return res.status(401).send("Please Login");

    const verified = jwt.verify(accessToken, process.env.JWT_SECRET);

    //if the token is valid, then verify the user.
    req.user = verified.user;
    next(); //use this method to keep moving.
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) return res.status(400).send("Please Login");

        const verifiedRefresh = jwt.verify(
          refreshToken,
          process.env.JWT_SECRET
        );
        //generate a new access token
        const { accessToken } = await tokens(verifiedRefresh.user);

        res.status(200).cookie("accessToken", accessToken, {
          expiresIn: "1s",
          httpOnly: true,
          path: "/",
          sameSite: "none",
          secure: true,
        });

        const verified = jwt.verify(accessToken, process.env.JWT_SECRET);
        req.user = verified.user;

        return next();
      } catch (error) {
        return res.status(401).send("Please Login");
      }
    }
    return res.status(401).send("Please Login");
  }
}

module.exports = Auth;
