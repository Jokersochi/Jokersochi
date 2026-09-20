/*! Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const { GetObjectCommand, PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const gm = require('gm');

// Constants
const NEW_SIZE_PX = 480;
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const JPEG_CONTENT_TYPE = 'image/jpeg';

// Initialize S3 client with region from environment
const s3Client = new S3Client({ region: process.env.AWS_REGION });

/**
 * Extracts bucket name and key from S3 event record
 * @param {Object} record - S3 event record
 * @returns {Object} Object containing bucket name and key
 */
const extractS3Details = (record) => {
    const bucketName = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    
    if (!bucketName || !key) {
        throw new Error('Invalid S3 event structure: missing bucket name or object key');
    }
    
    return { bucketName, key };
};

/**
 * Validates if the object is a supported image type
 * @param {string} contentType - The content type of the object
 * @returns {boolean} True if supported, false otherwise
 */
const isSupportedImageType = (contentType) => {
    return SUPPORTED_IMAGE_TYPES.includes(contentType);
};

/**
 * Retrieves an object from S3
 * @param {string} bucket - The source bucket name
 * @param {string} key - The object key
 * @returns {Promise<Object>} S3 object with Body and ContentType
 */
const getS3Object = async (bucket, key) => {
    try {
        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key
        });
        
        const response = await s3Client.send(command);
        
        if (!response.Body) {
            throw new Error(`Object ${key} not found in bucket ${bucket}`);
        }
        
        return response;
    } catch (error) {
        console.error(`Error retrieving object from S3: ${error.message}`);
        throw error;
    }
};

/**
 * Resizes an image buffer to the specified dimensions
 * @param {Buffer} buffer - The input image buffer
 * @returns {Promise<Buffer>} The resized image buffer
 */
const resizeImage = async (buffer) => {
    return new Promise((resolve, reject) => {
        gm(buffer)
            .resize(NEW_SIZE_PX, NEW_SIZE_PX)
            .toBuffer('jpg', (error, data) => {
                if (error) {
                    console.error('Error resizing image:', error.message);
                    return reject(new Error(`Image resize failed: ${error.message}`));
                }
                resolve(data);
            });
    });
};

/**
 * Uploads resized image to destination S3 bucket
 * @param {string} bucket - The destination bucket name
 * @param {string} key - The object key
 * @param {Buffer} imageData - The resized image data
 * @returns {Promise<Object>} S3 put object response
 */
const uploadToS3 = async (bucket, key, imageData) => {
    try {
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: JPEG_CONTENT_TYPE,
            Body: imageData,
        });
        
        const response = await s3Client.send(command);
        console.log(`Successfully uploaded resized image to ${bucket}/${key}`);
        return response;
    } catch (error) {
        console.error(`Error uploading to S3: ${error.message}`);
        throw new Error(`Failed to upload resized image: ${error.message}`);
    }
};

/**
 * Lambda handler function for processing S3 upload events
 * @param {Object} event - S3 event object
 * @returns {Promise<Object>} Response object with status and details
 */
exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    // Validate event structure
    if (!event || !event.Records || event.Records.length === 0) {
        throw new Error('Invalid event: no records found');
    }
    
    const record = event.Records[0];
    const destinationBucket = process.env.DESTINATION_BUCKETNAME;
    
    // Validate environment configuration
    if (!destinationBucket) {
        throw new Error('DESTINATION_BUCKETNAME environment variable is not set');
    }
    
    try {
        // Extract S3 details from event
        const { bucketName: sourceBucket, key } = extractS3Details(record);
        console.log(`Processing file: ${key} from bucket: ${sourceBucket}`);
        
        // Retrieve object from S3
        const s3Object = await getS3Object(sourceBucket, key);
        
        // Validate image type
        if (!isSupportedImageType(s3Object.ContentType)) {
            console.warn(`Unsupported image type: ${s3Object.ContentType}. Skipping processing.`);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Skipped: unsupported image type',
                    contentType: s3Object.ContentType
                })
            };
        }
        
        // Resize the image
        console.log('Resizing image...');
        const resizedImageData = await resizeImage(s3Object.Body);
        
        // Upload resized image to destination bucket
        const uploadResult = await uploadToS3(destinationBucket, key, resizedImageData);
        
        console.log('Image processing completed successfully');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Image processed successfully',
                sourceBucket,
                destinationBucket,
                key,
                originalContentType: s3Object.ContentType,
                outputContentType: JPEG_CONTENT_TYPE
            })
        };
        
    } catch (error) {
        console.error('Error processing image:', error.message);
        throw error;
    }
};
