const db = require('./config/db');

const checkUsers = async () => {
    try {
        const query = `
            SELECT u.id, u.username, u.email, r.name as role_name 
            FROM users u 
            LEFT JOIN roles r ON u.role_id = r.id
        `;

        db.query(query, (err, results) => {
            if (err) {
                console.error("Error fetching users:", err);
                process.exit(1);
            }
            console.log("Current Users:");
            console.table(results);
            process.exit(0);
        });
    } catch (error) {
        console.error("Unexpected error:", error);
        process.exit(1);
    }
};

checkUsers();
