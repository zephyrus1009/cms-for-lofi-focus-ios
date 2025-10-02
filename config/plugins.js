module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        accessKeyId: env('AWS_ACCESS_KEY_ID'),
        secretAccessKey: env('AWS_SECRET_ACCESS_KEY'),
        endpoint: env('S3_ENDPOINT'),
        params: {
          Bucket: env('S3_BUCKET'),
        },
        s3ForcePathStyle: true,
        signatureVersion: 'v4',
        region: env('S3_REGION', 'auto'),
      },
      actionOptions: {
        upload: {},
        delete: {},
      },
    },
  },
});