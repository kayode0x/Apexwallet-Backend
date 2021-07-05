require('dotenv/config');
const S3 = require('aws-sdk/clients/s3');
const fs = require('fs');

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

const s3 = new S3({ region, accessKeyId, secretKey });

//upload a new image to s3
function uploadImage(image) {
	const fileStream = fs.createReadStream(image.path);

	const uploadParams = {
		Bucket: bucketName,
		Body: fileStream,
		Key: image.filename,
	};

	return s3.upload(uploadParams).promise();
}
exports.uploadImage = uploadImage;

//download an image from s3
function downloadImage(key) {
	const downloadParams = {
		Key: key,
		Bucket: bucketName,
	};

	return s3.getObject(downloadParams).createReadStream();
}
exports.downloadImage = downloadImage;
