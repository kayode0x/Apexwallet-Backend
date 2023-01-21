require('dotenv/config');
const S3 = require('aws-sdk/clients/s3');

const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

//multer to upload an image.
const multer = require('multer');
const multerS3 = require('multer-s3');
const bucketName = process.env.AWS_BUCKET_NAME;

const s3 = new S3({ region, accessKeyId, secretKey });

const fileFilter = async (req, file, cb) => {
	if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/)) {
		req.fileValidationError = 'Only image files are allowed';
		return cb(new Error('Only image files are allowed'), false);
	}
	cb(null, true);
};

const upload = multer({
	fileFilter,
	onError: function (err, next) {
		next(err);
	},
	storage: multerS3({
		acl: 'public-read',
		contentType: multerS3.AUTO_CONTENT_TYPE,
		s3: s3,
		bucket: bucketName,
		metadata: function (req, file, cb) {
			cb(null, { fieldName: file.fieldname });
		},
		key: function (req, file, cb) {
			cb(null, Date.now().toString() + '-' + file.originalname);
		},
	}),
}).single('image');

const remove = (key) => {
	s3.deleteObject(
		{
			Bucket: bucketName,
			Key: key,
		},
	);
};

module.exports = { upload, remove };
