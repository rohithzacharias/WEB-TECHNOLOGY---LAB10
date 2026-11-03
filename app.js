const express = require("express");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 6000;

app.use(express.json());
app.use(express.static(__dirname));

// MongoDB connection
const client = new MongoClient(process.env.MONGO_URI);

let customers;

async function startServer() {
    try {
        await client.connect();

        const db = client.db("TechZoneDB");
        customers = db.collection("customers");

        console.log("MongoDB Connected Successfully!");

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("Database connection failed:", error.message);
        process.exit(1);
    }
}

// Display registration page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Handle registration form
app.post("/register", async (req, res) => {
    try {
        const {
            name, password, age, mobile,
            email, gender, state, skills
        } = req.body;

        if (
            !name || !password || !age || !mobile ||
            !email || !gender || !state ||
            !Array.isArray(skills) || skills.length === 0
        ) {
            return res.status(400).json({
                message: "All fields are required."
            });
        }

        if (
            !/^[a-zA-Z ]+$/.test(name) ||
            !/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).{8,}$/.test(password) ||
            !Number.isInteger(Number(age)) ||
            Number(age) < 18 || Number(age) > 30 ||
            !/^[0-9]{10}$/.test(mobile) ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            !["Male", "Female"].includes(gender) ||
            !["Tamil Nadu", "Kerala", "Karnataka",
              "Andhra Pradesh", "Telangana"].includes(state) ||
            !skills.every(skill =>
                ["JavaScript", "Python", "C++", "Java"].includes(skill)
            )
        ) {
            return res.status(400).json({
                message: "Please enter valid registration details."
            });
        }

        // Hash password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        const customer = {
            name,
            password: hashedPassword,
            age: Number(age),
            mobile,
            email,
            gender,
            state,
            skills,
            createdAt: new Date()
        };

        await customers.insertOne(customer);

        res.status(201).json({
            message: "Customer registered successfully!"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Registration failed. Please try again."
        });
    }
});

// Retrieve registered customers
app.get("/customers", async (req, res) => {
    try {
        const records = await customers.find(
            {},
            {
                projection: { password: 0 }
            }
        ).sort({ createdAt: -1 }).toArray();

        res.json(records);

    } catch (error) {
        res.status(500).json({
            message: "Unable to retrieve customers."
        });
    }
});

// Start application
startServer();