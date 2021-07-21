const jwt = require("jsonwebtoken");

//ES6 function to generate new access and refresh tokens, then store them in the cookie.
const tokens = (user) => {
  //Generate a new access token
  const accessToken = jwt.sign({ user: user }, process.env.JWT_SECRET, {
    expiresIn: "10m",
  });

  //Generate a new refresh token
  const refreshToken = jwt.sign({ user: user }, process.env.JWT_SECRET, {
    expiresIn: "1y",
  });
  return { accessToken, refreshToken };
};

module.exports = tokens;
