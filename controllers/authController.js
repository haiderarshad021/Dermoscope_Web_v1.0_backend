// // controllers/authController.js (or wherever login is)
// const bcrypt = require('bcrypt');
// const User = require('../models/userModel');

// exports.login = (req, res) => {
//     try {
//         // Accept both JSON body and form fields (hidden form uses "username" and "email")
//         const email = (req.body.email || req.body.username || "").toString().trim();
//         const password = (req.body.password || "").toString();

//         if (!email || !password) {
//             return res.status(400).json({ message: 'Please provide email and password' });
//         }

//         User.findByEmail(email, (err, results) => {
//             if (err) {
//                 console.error("DB error in findByEmail:", err);
//                 return res.status(500).json({ message: 'Database error' });
//             }

//             if (!results || results.length === 0) {
//                 return res.status(401).json({ message: 'Invalid email or password' });
//             }

//             const user = results[0];

//             const hashedPassword = user.password || "";
//             // ensure hashedPassword is a string before passing to bcrypt
//             bcrypt.compare(password, hashedPassword, (err, isMatch) => {
//                 if (err) {
//                     console.error("bcrypt.compare error:", err);
//                     return res.status(500).json({ message: 'Server error' });
//                 }

//                 if (!isMatch) {
//                     return res.status(401).json({ message: 'Invalid email or password' });
//                 }

//                 // Successful login — return safe user object
//                 return res.status(200).json({
//                     message: 'Login successful',
//                     user: {
//                         id: user.id,
//                         username: user.username,
//                         email: user.email,
//                         role: user.role_name || user.role || null,
//                         device_id: user.device_id || null,
//                     },
//                 });
//             });
//         });
//     } catch (err) {
//         // Catch any unexpected errors and log them
//         console.error("Unexpected login error:", err);
//         return res.status(500).json({ message: 'Internal Server Error' });
//     }
// };

const bcrypt = require('bcrypt');
const User = require('../models/userModel');

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