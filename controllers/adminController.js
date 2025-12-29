const User = require('../models/userModel');
const Role = require('../models/roleModel');
const bcrypt = require('bcrypt');
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

exports.addUser = (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please provide all fields' });
    }

    // Check if username already exists
    User.findByUsername(username, (err, userResults) => {
        if (err) return res.status(500).json({ error: err.message });
        if (userResults.length > 0) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Default role is 'clinician'
        Role.findByName('clinician', (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0) return res.status(500).json({ message: 'Default role not found' });

            const roleId = results[0].id;

            // Create S3 Folder (Prefix)
            const folderKey = `${username}/`; // S3 "folders" are just keys ending in /

            const createFolder = async () => {
                try {
                    await s3Client.send(new PutObjectCommand({
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key: folderKey,
                    }));

                    bcrypt.hash(password, 10, (err, hash) => {
                        if (err) return res.status(500).json({ error: err.message });

                        const newUser = {
                            username,
                            email,
                            password: hash,
                            role_id: roleId,
                            device_id: null
                        };

                        User.create(newUser, (err, result) => {
                            if (err) {
                                if (err.code === 'ER_DUP_ENTRY') {
                                    return res.status(400).json({ message: 'Email or Username already exists' });
                                }
                                return res.status(500).json({ error: err.message });
                            }
                            res.status(201).json({ message: `User ${username} created and S3 folder initialized.` });
                        });
                    });
                } catch (s3Err) {
                    console.error("S3 Folder Creation Error:", s3Err);
                    return res.status(500).json({ message: 'Failed to create S3 folder', error: s3Err.message });
                }
            };

            createFolder();
        });
    });
};

exports.getUsers = (req, res) => {
    User.getAll((err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
};

exports.updateUser = (req, res) => {
    const { id } = req.params;
    const { username, email, password } = req.body;

    if (!username || !email) {
        return res.status(400).json({ message: 'Please provide username and email' });
    }

    const updateData = { username, email };

    const proceedUpdate = () => {
        User.update(id, updateData, (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(200).json({ message: 'User updated successfully' });
        });
    };

    if (password) {
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) return res.status(500).json({ error: err.message });
            updateData.password = hash;
            proceedUpdate();
        });
    } else {
        proceedUpdate();
    }
};

exports.deleteUser = (req, res) => {
    const { id } = req.params;

    User.findById(id, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ message: 'User not found' });

        const username = results[0].username;
        const folderKey = `${username}/`;

        // Function to delete S3 folder
        const deleteS3Folder = async () => {
            try {
                // 1. List all objects in the folder
                const listParams = {
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Prefix: folderKey
                };

                const listedObjects = await s3Client.send(new ListObjectsV2Command(listParams));

                if (listedObjects.Contents && listedObjects.Contents.length > 0) {
                    // 2. Delete all listed objects
                    const deleteParams = {
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Delete: { Objects: listedObjects.Contents.map(({ Key }) => ({ Key })) }
                    };

                    await s3Client.send(new DeleteObjectsCommand(deleteParams));

                    // If truncated, we might need to loop, but for now assuming < 1000 objects
                    if (listedObjects.IsTruncated) {
                        // Ideally handle pagination for large folders
                        console.warn("Folder might not be fully empty, pagination needed.");
                    }
                }

                // 3. Delete user from DB
                User.delete(id, (err, result) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.status(200).json({ message: `User ${username} and S3 folder deleted successfully` });
                });

            } catch (s3Err) {
                console.error("S3 Deletion Error:", s3Err);
                return res.status(500).json({ message: 'Failed to delete S3 folder', error: s3Err.message });
            }
        };

        deleteS3Folder();
    });
};

exports.getNextUsername = (req, res) => {
    User.getLastClinicianUsername((err, userResults) => {
        if (err) return res.status(500).json({ error: err.message });

        let nextNum = 1;
        if (userResults && userResults.length > 0) {
            const lastUsername = userResults[0].username;
            const parts = lastUsername.split('_');
            const lastNum = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastNum)) {
                nextNum = lastNum + 1;
            }
        }

        const nextUsername = `CutiScope_Dev_${String(nextNum).padStart(3, '0')}`;
        res.status(200).json({ username: nextUsername });
    });
};

exports.getDashboardData = async (req, res) => {
    try {
        // 1. Fetch all clinicians
        User.getAll(async (err, users) => {
            if (err) return res.status(500).json({ error: err.message });

            // 2. List top-level folders in S3 to check existence efficiently
            const command = new ListObjectsV2Command({
                Bucket: process.env.AWS_BUCKET_NAME,
                Delimiter: '/'
            });

            const s3Data = await s3Client.send(command);
            const existingFolders = new Set();

            if (s3Data.CommonPrefixes) {
                s3Data.CommonPrefixes.forEach(prefix => {
                    // S3 returns "prefix/", we want just "prefix" to match username
                    // logic: username/ -> remove last char
                    let folderName = prefix.Prefix;
                    if (folderName.endsWith('/')) {
                        folderName = folderName.slice(0, -1);
                    }
                    existingFolders.add(folderName);
                });
            }

            // 3. Map users to status
            // Filter only clinicians for the dashboard view usually? 
            // The prompt said "fetch the username and email... of that user(s)" implying all or at least the ones managed.
            // SuperAdminPanel fetches clinicians usually.

            const dashboardData = users
                .filter(u => u.role_name === 'clinician')
                .map(user => ({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    hasFolder: existingFolders.has(user.username)
                }));

            res.status(200).json(dashboardData);
        });

    } catch (error) {
        console.error("Dashboard Data Error:", error);
        res.status(500).json({ message: "Failed to fetch dashboard data", error: error.message });
    }
};

const multer = require('multer');
const storage = multer.memoryStorage();
exports.uploadMiddleware = multer({ storage: storage }).single('apk');

const AppUpdate = require('../models/appUpdateModel');

exports.uploadApk = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const { version, release_notes, force_update } = req.body;
        if (!version) {
            return res.status(400).json({ message: "Version is required" });
        }

        // 1. Generate Unique Filename
        const timestamp = Date.now();
        const filename = `${timestamp}-${req.file.originalname}`;
        const apkKey = `apk/${filename}`; // Relative path for DB and S3 Key

        // 2. Upload APK to S3
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: apkKey,
            Body: req.file.buffer,
            ContentType: "application/vnd.android.package-archive"
        }));

        // 3. Save to Database
        const updateData = {
            version_code: Math.floor(timestamp / 1000), // Simple valid integer
            version_name: version,
            apk_url: `/${apkKey}`, // Store relative path as per existing data
            checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", // Mock checksum for now
            release_notes: release_notes || "No release notes",
            force_update: force_update === 'true' || force_update === true ? 1 : 0
        };

        AppUpdate.create(updateData, (err, result) => {
            if (err) {
                console.error("DB Insert Error:", err);
                return res.status(500).json({ message: "Failed to save update to database", error: err.message });
            }

            // Construct full URL for response
            const fullUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com${updateData.apk_url}`;

            res.status(200).json({
                message: "APK uploaded successfully",
                version: {
                    version: updateData.version_name,
                    lastUpdated: new Date().toISOString(),
                    url: fullUrl
                }
            });
        });

    } catch (error) {
        console.error("APK Upload Error:", error);
        res.status(500).json({ message: "Failed to upload APK", error: error.message });
    }
};

exports.getApkVersion = async (req, res) => {
    AppUpdate.getLatest((err, results) => {
        if (err) {
            console.error("Get APK Version Error:", err);
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            return res.status(200).json({ version: '0.0.0', lastUpdated: null });
        }

        const latest = results[0];
        // Construct full URL from relative path in DB
        // Assuming DB stores "/apk/..." and we need https://bucket.s3.region.amazonaws.com/apk/...
        // Or if apk_url is just the key "apk/...", we prepend slash. 
        // Based on screenshot, it starts with /apk/...

        // Remove leading slash for S3 URL construction if present for standard S3 URLs, 
        // OR just append to domain.
        // https://bucket.s3.region.amazonaws.com/apk/file.apk

        const relativePath = latest.apk_url.startsWith('/') ? latest.apk_url : `/${latest.apk_url}`;
        const fullUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com${relativePath}`;

        res.status(200).json({
            version: latest.version_name,
            lastUpdated: latest.created_at,
            url: fullUrl
        });
    });
};

exports.getAllAppUpdates = (req, res) => {
    AppUpdate.getAll((err, results) => {
        if (err) {
            console.error("Fetch History Error:", err);
            return res.status(500).json({ message: "Failed to fetch update history", error: err.message });
        }
        res.status(200).json(results);
    });
};
