const db = require('../config/db');

const AppUpdate = {
    createTable: () => {
        const query = `
            CREATE TABLE IF NOT EXISTS app_updates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                version_code INT NOT NULL,
                version_name VARCHAR(50) NOT NULL,
                apk_url VARCHAR(512) NOT NULL,
                checksum VARCHAR(64) NOT NULL,
                release_notes TEXT,
                force_update BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by INT,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        `;
        db.query(query, (err) => {
            if (err) console.error('Error creating app_updates table:', err);
            // else console.log('App Updates table checked/created');
        });
    },

    create: (updateData, callback) => {
        const query = `
            INSERT INTO app_updates 
            (version_code, version_name, apk_url, checksum, release_notes, force_update, created_by) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
            updateData.versionCode,
            updateData.versionName,
            updateData.apkUrl,
            updateData.checksum,
            updateData.releaseNotes,
            updateData.forceUpdate,
            updateData.createdBy
        ];
        db.query(query, params, callback);
    },

    getLatest: (callback) => {
        const query = `
            SELECT * FROM app_updates 
            ORDER BY version_code DESC 
            LIMIT 1
        `;
        db.query(query, callback);
    },

    getAll: (callback) => {
        const query = `
            SELECT app_updates.*, users.username as created_by_name 
            FROM app_updates 
            LEFT JOIN users ON app_updates.created_by = users.id 
            ORDER BY created_at DESC
        `;
        db.query(query, callback);
    }
};

module.exports = AppUpdate;
