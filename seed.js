const db = require('./config/db');
const bcrypt = require('bcrypt');

const seed = async () => {
    // 1. Drop Tables (Order matters due to FK)
    const dropUsers = "DROP TABLE IF EXISTS users";
    const dropRoles = "DROP TABLE IF EXISTS roles";

    await new Promise((resolve) => db.query(dropUsers, resolve));
    await new Promise((resolve) => db.query(dropRoles, resolve));
    console.log("Tables dropped.");

    // 2. Create Tables
    const createRoles = `
        CREATE TABLE roles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(50) UNIQUE NOT NULL
        )
    `;
    const createUsers = `
        CREATE TABLE users (
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

    await new Promise((resolve) => db.query(createRoles, resolve));
    await new Promise((resolve) => db.query(createUsers, resolve));
    console.log("Tables created.");

    // 3. Insert Roles
    const roles = ['clinician', 'superadmin', 'rmtadmin'];
    for (const role of roles) {
        await new Promise((resolve) => db.query("INSERT INTO roles (name) VALUES (?)", [role], resolve));
    }
    console.log("Roles inserted.");

    // 4. Create Admin Users
    const superAdminPass = await bcrypt.hash('Superadmin@123', 10);
    const rmtAdminPass = await bcrypt.hash('Rmtadmin@123', 10);

    // Get Role IDs
    const getRoleId = (name) => new Promise((resolve) => {
        db.query("SELECT id FROM roles WHERE name = ?", [name], (err, res) => resolve(res[0].id));
    });

    const superAdminRoleId = await getRoleId('superadmin');
    const rmtAdminRoleId = await getRoleId('rmtadmin');

    await new Promise((resolve) => {
        db.query(
            "INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)",
            ['Super Admin', 'superadmin@gmail.com', superAdminPass, superAdminRoleId],
            resolve
        );
    });

    await new Promise((resolve) => {
        db.query(
            "INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)",
            ['RMT Admin', 'rmtadmin@gmail.com', rmtAdminPass, rmtAdminRoleId],
            resolve
        );
    });

    console.log("Admin users seeded.");
    process.exit();
};

seed();
