const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Initialize S3 Client for Cloudflare R2
const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

/**
 * Uploads HTML content to Cloudflare R2
 * @param {string} htmlContent - The full HTML string
 * @param {string} slug - The article slug
 * @param {Date} date - The publication date (for folder structure)
 * @returns {Promise<string>} - The path/key of the uploaded file
 */
const uploadArticleHtml = async (htmlContent, slug, date = new Date()) => {
    try {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const key = `${year}/${month}/${day}/${slug}.html`;

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: htmlContent,
            ContentType: 'text/html',
            // Note: R2 doesn't support ACL - use bucket-level public access settings instead
        });

        await s3Client.send(command);
        console.log(`Successfully uploaded HTML to ${key}`);

        // Return the full URL or just the key depending on how we want to access it
        // If public bucket: https://<public-domain>/<key>
        // But for now, returning the Key is safer for storage in DB
        return key;
    } catch (error) {
        console.error('Error uploading to R2:', error);
        throw error;
    }
};

/**
 * Retrieves HTML content stream from Cloudflare R2
 * @param {string} key - The file key
 * @returns {Promise<ReadableStream>}
 */
const getArticleHtml = async (key) => {
    try {
        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        });
        const response = await s3Client.send(command);
        return response.Body;
    } catch (error) {
        console.error('Error fetching from R2:', error);
        throw error;
    }
};

module.exports = {
    uploadArticleHtml,
    getArticleHtml,
    s3Client
};
