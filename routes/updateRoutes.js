const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const updateController = require('../controllers/updateController');

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/apk/');
    },
    filename: (req, file, cb) => {
        // defined unique filename
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// File Filter (Optional: Only accept .apk)
const fileFilter = (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.apk') {
        cb(null, true);
    } else {
        cb(new Error('Only .apk files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter
});

// Routes
router.post('/upload', upload.single('apk'), updateController.uploadUpdate);
router.get('/latest', updateController.getLatestUpdate);
router.get('/history', updateController.getAllUpdates);

module.exports = router;
