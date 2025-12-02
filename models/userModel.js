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
    }
};

module.exports = User;
