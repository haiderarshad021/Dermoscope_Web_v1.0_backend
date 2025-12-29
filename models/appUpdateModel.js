const db = require('../config/db');

const AppUpdate = {
    create: (updateData, callback) => {
        const query = `
            INSERT INTO app_updates 
            (version_code, version_name, apk_url, checksum, release_notes, force_update, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;
        db.query(query, [
            updateData.version_code,
            updateData.version_name,
            updateData.apk_url,
            updateData.checksum,
            updateData.release_notes,
            updateData.force_update || 0
        ], callback);
    },

    getLatest: (callback) => {
        const query = `
            SELECT * FROM app_updates 
            ORDER BY created_at DESC 
            LIMIT 1
        `;
        db.query(query, callback);
    },

    getAll: (callback) => {
        const query = 'SELECT * FROM app_updates ORDER BY created_at DESC';
        db.query(query, callback);
    }
};

module.exports = AppUpdate;
