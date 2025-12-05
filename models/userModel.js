const db = require('../config/db');

const User = {
    createTable: () => {
        const query = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role_id INT,
                device_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
            )
        `;
        db.query(query, (err) => {
            if (err) console.error('Error creating users table:', err);
            else console.log('Users table created or already exists');
        });
    },

    create: (userData, callback) => {
        const query = 'INSERT INTO users (username, email, password, role_id, device_id) VALUES (?, ?, ?, ?, ?)';
        db.query(query, [userData.username, userData.email, userData.password, userData.role_id, userData.device_id], callback);
    },

    findByEmail: (email, callback) => {
        const query = `
            SELECT users.*, roles.name as role_name 
            FROM users 
            LEFT JOIN roles ON users.role_id = roles.id 
            WHERE email = ?
        `;
        db.query(query, [email], callback);
    },

    findByUsername: (username, callback) => {
        const query = 'SELECT * FROM users WHERE username = ?';
        db.query(query, [username], callback);
    },

    findById: (id, callback) => {
        const query = 'SELECT * FROM users WHERE id = ?';
        db.query(query, [id], callback);
    },

    getAll: (callback) => {
        const query = `
            SELECT users.id, users.username, users.email, roles.name as role_name 
            FROM users 
            LEFT JOIN roles ON users.role_id = roles.id
        `;
        db.query(query, callback);
    },

    update: (id, userData, callback) => {
        let query = 'UPDATE users SET username = ?, email = ?';
        let params = [userData.username, userData.email];

        if (userData.password) {
            query += ', password = ?';
            params.push(userData.password);
        }

        query += ' WHERE id = ?';
        params.push(id);

        db.query(query, params, callback);
    },

    delete: (id, callback) => {
        const query = 'DELETE FROM users WHERE id = ?';
        db.query(query, [id], callback);
    },

    saveResetToken: (email, token, expires, callback) => {
        const query = 'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE email = ?';
        db.query(query, [token, expires, email], callback);
    },

    findByResetToken: (token, callback) => {
        const query = `
            SELECT * FROM users 
            WHERE reset_password_token = ? 
            AND reset_password_expires > NOW()
        `;
        db.query(query, [token], callback);
    },

    updatePassword: (id, password, callback) => {
        const query = 'UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?';
        db.query(query, [password, id], callback);
    },

    getLastClinicianUsername: (callback) => {
        const query = "SELECT username FROM users WHERE username LIKE 'CutiScope_Dev_%' ORDER BY id DESC LIMIT 1";
        db.query(query, callback);
    }
};

module.exports = User;
