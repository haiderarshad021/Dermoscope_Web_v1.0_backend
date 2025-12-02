const User = require('../models/userModel');
const Role = require('../models/roleModel');
const bcrypt = require('bcrypt');

exports.addUser = (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please provide all fields' });
    }

    // Default role is 'clinician'
    Role.findByName('clinician', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(500).json({ message: 'Default role not found' });

        const roleId = results[0].id;

        bcrypt.hash(password, 10, (err, hash) => {
            if (err) return res.status(500).json({ error: err.message });

            const newUser = {
                username,
                email,
                password: hash,
                role_id: roleId,
                device_id: null // Or handle device_id if needed
            };

            User.create(newUser, (err, result) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(400).json({ message: 'Email already exists' });
                    }
                    return res.status(500).json({ error: err.message });
                }
                res.status(201).json({ message: 'User created successfully' });
            });
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

    User.delete(id, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'User deleted successfully' });
    });
};
