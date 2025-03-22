require("dotenv").config();
const express = require("express");
const twilio = require("twilio");
const cors = require("cors");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
const serviceAccount = require("./firebase_key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

// Twilio Credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = new twilio.Twilio(accountSid, authToken);

// Health Check API
app.get("/check", (req, res) => {
    res.send({
        status: "OK",
        timestamp: new Date().toISOString(),
    });
});

// API to add/update emergency contacts to Firestore
app.post("/addContacts", async (req, res) => {
    const { contacts } = req.body;

    if (!contacts || !Array.isArray(contacts)) {
        return res.status(400).json({ error: "Invalid or missing contacts array." });
    }

    try {
        const contactsRef = db.collection("contacts");

        // Clear existing contacts before adding new ones
        const snapshot = await contactsRef.get();
        snapshot.forEach((doc) => doc.ref.delete());

        // Add new contacts to Firestore
        const batch = db.batch();
        contacts.forEach((phoneNumber) => {
            const newContactRef = contactsRef.doc();
            batch.set(newContactRef, { phoneNumber });
        });
        await batch.commit();

        res.json({
            success: true,
            message: "Emergency contacts stored successfully!",
        });
    } catch (error) {
        console.error("Error storing contacts:", error);
        res.status(500).json({ error: "Failed to store contacts." });
    }
});

// API to retrieve emergency contacts from Firestore
app.get("/getContacts", async (req, res) => {
    try {
        const contactsRef = db.collection("contacts");
        const snapshot = await contactsRef.get();

        const contacts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.json({ success: true, contacts });
    } catch (error) {
        console.error("Error retrieving contacts:", error);
        res.status(500).json({ error: "Failed to retrieve contacts." });
    }
});

// API Endpoint to Send SOS
app.post("/sendSOS", async (req, res) => {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
        return res.status(400).json({ error: "Latitude and longitude are required." });
    }

    try {
        const contactsRef = db.collection("contacts");
        const snapshot = await contactsRef.get();

        if (snapshot.empty) {
            return res.status(400).json({ error: "No emergency contacts available." });
        }

        const sosMessage = `🚨 SOS Alert!\n📍 Location: https://www.google.com/maps?q=${latitude},${longitude}`;

        // Send messages to all contacts
        const sendPromises = snapshot.docs.map((doc) =>
            client.messages.create({
                body: sosMessage,
                from: twilioPhoneNumber,
                to: doc.data().phoneNumber,
            })
        );

        await Promise.all(sendPromises);
        res.json({ success: true, message: "SOS messages sent successfully!" });
    } catch (error) {
        console.error("Error sending SOS messages:", error);
        res.status(500).json({ error: "Failed to send SOS messages." });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
