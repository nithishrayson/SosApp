require("dotenv").config();
const express = require("express");
const twilio = require("twilio");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Twilio Credentials from .env file
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = new twilio.Twilio(accountSid, authToken);

// Emergency contacts (Replace with your numbers)
const emergencyContacts = [
    "+918122699779"
];

// API Endpoint to Send SOS
app.post("/sendSOS", async (req, res) => {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
        return res.status(400).json({ error: "Latitude and longitude are required." });
    }

    const sosMessage = `Please help me!\n` +
        `📍 Location: https://www.google.com/maps?q=${latitude},${longitude}`;

    try {
        const sendPromises = emergencyContacts.map(phoneNumber =>
            client.messages.create({
                body: sosMessage,
                from: twilioPhoneNumber,
                to: phoneNumber
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
