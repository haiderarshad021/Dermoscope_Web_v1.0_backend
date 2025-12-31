require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const updateRoutes = require("./routes/updateRoutes");
const User = require("./models/userModel");
const Role = require("./models/roleModel");
const AppUpdate = require("./models/updateModel");
const path = require('path');

const app = express();

// CORS setup — explicit origin required when using credentials
// CORS setup - Allow all for mobile dev
app.use(cors());

// Body parsers
app.use(express.json()); // parse application/json
app.use(express.urlencoded({ extended: true })); // parse application/x-www-form-urlencoded (hidden form fallback)

// Create tables if not exists
Role.createTable();
User.createTable();
AppUpdate.createTable();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/updates", updateRoutes);

// Serve APK files statically
app.use('/apk', express.static(path.join(__dirname, 'uploads/apk')));

app.get("/", (req, res) => {
  res.json({ message: "Backend running with MySQL!" });
});

const PORT = process.env.PORT;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
