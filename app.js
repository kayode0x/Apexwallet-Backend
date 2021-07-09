const express = require('express');
const app = express();
require('dotenv/config');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const PORT = process.env.PORT || 9000;
const mongoose = require('mongoose');

//parse all json objects, cookies and use cors.
app.use(express.json());
app.use(cookieParser());

const corsOptions = {
	//To allow requests from client
	origin: [
		'https://apexwallet.app',
		'https://apexx.netlify.app',
		'http://192.168.1.98:3000',
		'http://localhost:3000',
		'http://localhost:3001',
	],
	credentials: true,
	exposedHeaders: ['set-cookie'],
};

app.use(cors(corsOptions));

//import routes
const userRoute = require('./routes/userRoute');
const walletRoute = require('./routes/walletRoute');
const coinRoute = require('./routes/coinRoute');
const authRoute = require('./routes/authRoute');
const messageRoute = require('./routes/messageRoute');

//routes
app.use('/v1/user', userRoute);
app.use('/v1/wallet', walletRoute);
app.use('/v1/coin', coinRoute);
app.use('/v1/auth', authRoute);
app.use('/v1/message', messageRoute);

//api endpoint.
app.get('/', (req, res) => {
	res.send('We are live 🚀');
});

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
	console.log('Server up and running 🚀');
});
