# Image Resizing Lambda Function

AWS Lambda function that automatically resizes images uploaded to an S3 bucket.

## Features

- **Automatic Image Processing**: Triggers on new image uploads to S3
- **Support for Multiple Formats**: Handles JPEG and PNG images
- **Consistent Output**: All images are resized to 480x480 pixels and converted to JPEG
- **Error Handling**: Comprehensive error handling and logging
- **Validation**: Validates event structure, environment variables, and image types
- **Modular Architecture**: Clean, maintainable code with separated concerns

## Architecture

The function follows a modular architecture with the following components:

### Constants
- `NEW_SIZE_PX`: Target resize dimension (480px)
- `SUPPORTED_IMAGE_TYPES`: Array of supported input content types
- `JPEG_CONTENT_TYPE`: Output content type

### Helper Functions

#### `extractS3Details(record)`
Extracts and validates bucket name and object key from S3 event records.

#### `isSupportedImageType(contentType)`
Validates if the uploaded file is a supported image type.

#### `getS3Object(bucket, key)`
Retrieves an object from S3 with error handling.

#### `resizeImage(buffer)`
Resizes an image buffer using GraphicsMagick.

#### `uploadToS3(bucket, key, imageData)`
Uploads the resized image to the destination S3 bucket.

### Main Handler

#### `exports.handler(event)`
Lambda entry point that orchestrates the image processing workflow:
1. Validates event structure
2. Extracts S3 details from the event
3. Retrieves the original image from S3
4. Validates image type
5. Resizes the image
6. Uploads resized image to destination bucket
7. Returns processing result

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AWS_REGION` | AWS region for S3 client | Yes |
| `DESTINATION_BUCKETNAME` | Target S3 bucket for resized images | Yes |

## Dependencies

- `@aws-sdk/client-s3`: AWS SDK v3 for S3 operations
- `gm`: GraphicsMagick for image manipulation

## Development

### Prerequisites
- Node.js >= 18.0.0
- AWS SAM CLI
- GraphicsMagick system library (provided via Lambda Layer)

### Installation

```bash
cd src
npm install
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Deployment

Use AWS SAM to build and deploy:

```bash
sam build
sam deploy --guided
```

## Usage

Once deployed, simply upload a `.jpg` or `.png` image to the source S3 bucket. The Lambda function will automatically:
1. Detect the new image upload
2. Download the image
3. Resize it to 480x480 pixels
4. Convert it to JPEG format
5. Upload the resized version to the destination bucket

## Error Handling

The function includes comprehensive error handling for:
- Invalid event structures
- Missing environment variables
- S3 retrieval failures
- Unsupported image types
- Image resize failures
- S3 upload failures

All errors are logged to CloudWatch Logs for debugging.

## License

MIT-0

## Author

James Beswick
