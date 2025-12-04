const db = require('./config/db');

const addResetTokenColumns = async () => {
    try {
        const alterTableQuery = `
            ALTER TABLE users
            ADD COLUMN reset_password_token VARCHAR(255) DEFAULT NULL,
            ADD COLUMN reset_password_expires DATETIME DEFAULT NULL;
        `;

        await new Promise((resolve, reject) => {
            db.query(alterTableQuery, (err, result) => {
                if (err) {
                    // Ignore if columns already exist (error code 1060)
                    if (err.code === 'ER_DUP_FIELDNAME') {
                        console.log("Columns already exist. Skipping.");
                        resolve();
                    } else {
                        reject(err);
                    }
                } else {
                    console.log("Successfully added reset_password_token and reset_password_expires columns.");
                    resolve(result);
                }
            });
        });

        process.exit(0);
    } catch (error) {
        console.error("Error updating database schema:", error);
        process.exit(1);
    }
};

addResetTokenColumns();
