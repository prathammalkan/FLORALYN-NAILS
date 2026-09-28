// netlify/functions/send-whatsapp.js

exports.handler = async (event, context) => {
  try {
    // Allow only POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    // Parse form data from frontend
    const data = JSON.parse(event.body);

    // Extract variables
    const {
      from_name,
      phone,
      instagram,
      email,
      date,
      time,
      service,
      message,
    } = data;

    // Load Twilio securely from Netlify env
    const twilio = require("twilio");
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Build WhatsApp message text
    const whatsappMessage = `
💅 *New Nail Appointment Request — Floralyn*

👤 *Name:* ${from_name}
📞 *Phone:* ${phone}
📸 *Instagram:* ${instagram || "Not provided"}
📧 *Email:* ${email || "Not provided"}

📅 *Preferred Date:* ${date}
⏰ *Preferred Time:* ${time}

💖 *Service:* ${service}

📝 *Message:* ${message || "No message added"}
    `;

    // Send WhatsApp message
    const response = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${process.env.DEST_WHATSAPP_TO}`,
      body: whatsappMessage,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, sid: response.sid }),
    };
  } catch (error) {
    console.error("Twilio WhatsApp Error → ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
