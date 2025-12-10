const db = require('../config/db');

const Role = {
    createTable: () => {
        const query = `
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE
      )
    `;
        db.query(query, (err, result) => {
            if (err) console.error('Error creating roles table:', err);
            // else console.log('Roles table checked/created successfully');
        });
    },

    findByName: (name, callback) => {
        const query = 'SELECT * FROM roles WHERE name = ?';
        db.query(query, [name], callback);
    },
};

module.exports = Role;
