const db = require('./config/db');

const updateUserRole = async () => {
    try {
        const email = 'haider@gmail.com';
        const newRole = 'clinician';

        // 1. Get Role ID for 'clinician'
        const getRoleId = (name) => new Promise((resolve, reject) => {
            db.query("SELECT id FROM roles WHERE name = ?", [name], (err, res) => {
                if (err) reject(err);
                else resolve(res[0] ? res[0].id : null);
            });
        });

        const roleId = await getRoleId(newRole);
        if (!roleId) {
            console.error(`Role ${newRole} not found!`);
            process.exit(1);
        }

        // 2. Update User
        await new Promise((resolve, reject) => {
            db.query("UPDATE users SET role_id = ? WHERE email = ?", [roleId, email], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        console.log(`User ${email} updated to role: ${newRole}`);
        process.exit(0);

    } catch (error) {
        console.error("Error updating user:", error);
        process.exit(1);
    }
};

updateUserRole();
