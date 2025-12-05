const User = require('../models/userModel');
const Role = require('../models/roleModel');
const bcrypt = require('bcrypt');
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');

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
