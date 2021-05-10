const express = require('express');
const app = express();
require('dotenv/config');
const cors = require('cors')
const cookieParser = require('cookie-parser');
const PORT = process.env.PORT || 9000;
const mongoose = require('mongoose');


//parse all json objects, cookies and use cors.
app.use(express.json());
app.use(cookieParser());
// const apexURL = 'https://apexwallet.app';
// app.use(cors({ origin: apexURL, credentials: true }));


//import routes
const userRoute = require('./routes/userRoute');
const walletRoute = require('./routes/walletRoute');
const coinRoute = require('./routes/coinRoute');
const authRoute = require('./routes/authRoute');


//routes
app.use('/api/v1/user', userRoute);
app.use('/api/v1/wallet', walletRoute);
app.use('/api/v1/coin', coinRoute);
app.use('/api/v1/auth', authRoute);


//api endpoint.
app.get('/', (req, res) =>{
    res.send('We are live 🚀');
})


//connect to the mongodb
mongoose.connect(
	process.env.MONGO_URL,
	{
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useCreateIndex: true,
		useFindAndModify: false,
	},
	(err) => {
		if (err) {
			console.log(err.message);
		}
		console.log('Connected to mongodb 🚀');
	}
);


//listen
app.listen(PORT, () => {
    console.log('Server up and running 🚀')
})