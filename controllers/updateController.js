const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AppUpdate = require('../models/updateModel');

// Ensure uploads/apk directory exists
const uploadDir = path.join(__dirname, '../uploads/apk');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

exports.uploadUpdate = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    const { versionCode, versionName, releaseNotes, forceUpdate, createdBy } = req.body;

    // File details
    const filePath = req.file.path;
    const fileUrl = `/apk/${req.file.filename}`; // Publicly accessible URL

    // Calculate Checksum (SHA-256)
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const checksum = hashSum.digest('hex');

    const updateData = {
        versionCode: parseInt(versionCode, 10),
        versionName,
        apkUrl: fileUrl,
        checksum,
        releaseNotes,
        forceUpdate: forceUpdate === 'true' || forceUpdate === true,
        createdBy: createdBy || null // In real app, get from req.user
    };

    AppUpdate.create(updateData, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Database error saving update' });
        }
        res.status(201).json({ message: 'Update uploaded successfully', update: updateData });
    });
};

exports.getLatestUpdate = (req, res) => {
    AppUpdate.getLatest((err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error fetching update' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'No updates found' });
        }
        res.json(results[0]);
    });
};

exports.getAllUpdates = (req, res) => {
    AppUpdate.getAll((err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error fetching updates history' });
        }
        res.json(results);
    });
};
