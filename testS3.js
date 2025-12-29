require('dotenv').config();
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || "dermscope-s3-photos";
const username = "CutiScope_Dev_002"; // Simulating Admin View for this user

const sanitizeForS3 = (name) => {
    if (!name) return "";
    return name.toLowerCase().replace(/[^a-z0-9_-]/g, '').substring(0, 50);
};

async function simulateAdminFetch() {
    console.log(`\n--- Simulating Admin View for User: '${username}' ---`);

    let primaryPrefix = username + "/";
    const wildcard = ""; // Simulating root view

    if (wildcard) {
        primaryPrefix += wildcard.endsWith('/') ? wildcard : wildcard + '/';
    }

    const prefixesToFetch = [primaryPrefix];

    if (!wildcard) {
        const sanitized = sanitizeForS3(username) + "/";
        if (sanitized !== primaryPrefix) {
            prefixesToFetch.push(sanitized);
        }
    }

    console.log("Prefixes to fetch:", prefixesToFetch);

    const allFolders = [];
    const allImages = [];
    const processedKeys = new Set();

    for (const prefix of prefixesToFetch) {
        try {
            console.log(`Querying S3 for prefix: ${prefix}`);
            const command = new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                Prefix: prefix,
                Delimiter: "/"
            });

            const data = await s3Client.send(command);

            // Process Folders
            if (data.CommonPrefixes) {
                console.log(`Found ${data.CommonPrefixes.length} folders in ${prefix}`);
                data.CommonPrefixes.forEach((p) => {
                    if (processedKeys.has(p.Prefix)) return;
                    processedKeys.add(p.Prefix);

                    const parts = p.Prefix.split('/');
                    const folderName = parts[parts.length - 2];
                    allFolders.push({
                        name: folderName,
                        key: p.Prefix
                    });
                });
            }

            // Process Images
            if (data.Contents) {
                console.log(`Found ${data.Contents.length} items in ${prefix}`);
                data.Contents.forEach((item) => {
                    if (item.Key.endsWith('/')) return;
                    if (item.Key === prefix) return;
                    if (processedKeys.has(item.Key)) return;

                    // Simulate signing (we just count it here)
                    allImages.push({
                        key: item.Key,
                        size: item.Size
                    });
                    processedKeys.add(item.Key);
                });
            }
        } catch (innerErr) {
            console.error(`Error fetching prefix ${prefix}:`, innerErr);
        }
    }

    console.log("\n--- Final Results ---");
    console.log("Total Folders:", allFolders.length);
    console.log("Folders:", allFolders);
    console.log("Total Images:", allImages.length);
    console.log("Images:", allImages);
}

simulateAdminFetch();
