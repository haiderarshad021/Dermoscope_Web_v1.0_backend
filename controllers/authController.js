// controllers/authController.js
const bcrypt = require('bcrypt');
const User = require('../models/userModel');
const crypto = require('crypto');
const sendEmail = require('../utils/emailService');

exports.login = (req, res) => {
    try {
        // 1. Get data
        const email = (req.body.email || req.body.username || "").toString().trim();
        const password = (req.body.password || "").toString();

        // 2. Validation
        if (!email || !password) {
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // 3. Find User
        User.findByEmail(email, (err, results) => {
            if (err) {
                console.error("DB Error:", err);
                return res.status(500).json({ message: 'Database error' });
            }

            if (!results || results.length === 0) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const user = results[0];

            // 4. Check Password
            bcrypt.compare(password, user.password || "", (err, isMatch) => {
                if (err) {
                    console.error("Bcrypt Error:", err);
                    return res.status(500).json({ message: 'Server error during verification' });
                }

                if (!isMatch) {
                    return res.status(401).json({ message: 'Invalid email or password' });
                }

                // 5. Success
                return res.status(200).json({
                    message: 'Login successful',
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        role: user.role_name || user.role || null,
                        device_id: user.device_id || null,
                    },
                });
            });
        });
    } catch (err) {
        console.error("Unexpected Error:", err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.forgotPassword = (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Please provide an email address' });
    }

    User.findByEmail(email, (err, results) => {
        if (err || !results || results.length === 0) {
            // Security: Don't reveal if user exists
            return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
        }

        const user = results[0];

        // Generate Token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

        // Save to DB
        User.saveResetToken(email, resetTokenHash, resetExpires, async (err) => {
            if (err) {
                return res.status(500).json({ message: 'Database error saving token' });
            }

            // Send Email
            const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;
            const message = `You requested a password reset. Please go to this link to reset your password:\n\n${resetUrl}\n\nThis link expires in 30 minutes.\nPlease ignore this mail if you did not request a password reset.`;

            try {
                await sendEmail({
                    email: user.email,
                    subject: 'Password Reset Request',
                    message: message
                });

                res.status(200).json({ message: 'Reset link sent to email' });
            } catch (error) {
                console.error("Email send error:", error);
                // Cleanup token if email fails
                User.saveResetToken(email, null, null, () => { });
                return res.status(500).json({ message: 'Email could not be sent' });
            }
        });
    });
};

exports.resetPassword = (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ message: 'Please provide a new password' });
    }

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    User.findByResetToken(resetTokenHash, (err, results) => {
        if (err || !results || results.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        const user = results[0];

        // Hash new password
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                return res.status(500).json({ message: 'Error hashing password' });
            }

            // Update User
            User.updatePassword(user.id, hashedPassword, (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Error updating password' });
                }

                res.status(200).json({ message: 'Password reset successful' });
            });
        });
    });
};