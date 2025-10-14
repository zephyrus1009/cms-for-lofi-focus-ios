# Public assets

This directory must exist at deploy time so Strapi can register its static middleware.
Render builds will fail if the folder or its `uploads` subdirectory is missing, even when the AWS S3 upload provider is used.
