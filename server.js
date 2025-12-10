require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const User = require("./models/userModel");
const Role = require("./models/roleModel");

const app = express();

// CORS setup — explicit origin required when using credentials
app.use(cors({
  origin: "http://localhost:5173", // change to your frontend URL in prod
  credentials: true
}));

// Body parsers
app.use(express.json()); // parse application/json
app.use(express.urlencoded({ extended: true })); // parse application/x-www-form-urlencoded (hidden form fallback)

// Create tables if not exists
Role.createTable();
User.createTable();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Backend running with MySQL!" });
});

const PORT = process.env.PORT;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
