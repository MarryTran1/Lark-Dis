const axios = require('axios');

const LARK_VERIFICATION_TOKEN = process.env.LARK_VERIFICATION_TOKEN;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;

    if (data.type === "url_verification") {
      if (data.token !== LARK_VERIFICATION_TOKEN) {
        return res.status(403).json({ error: "Token xác thực không hợp lệ." });
      }
      return res.status(200).json({ challenge: data.challenge });
    }

    const tokenFromLark = data.token || data.header?.token;
    if (tokenFromLark !== LARK_VERIFICATION_TOKEN) {
      return res.status(403).json({ error: "Token sự kiện không hợp lệ." });
    }

    if (data.header?.event_type === "im.message.receive_v1") {
      const { event } = data;
      const { sender, message } = event;

      if (sender?.sender_type === "bot" || message?.message_type !== "text") {
        return res.status(200).json({ status: "ignored" });
      }

      const chatId = message.chat_id;
      let messageText = "";

      try {
        messageText = JSON.parse(message.content || "{}").text || "";
      } catch (err) {
        return res.status(400).json({ error: "Message content invalid" });
      }

      const senderId = sender.sender_id;
      const senderName = `User ${senderId?.user_id || senderId?.open_id}`;

      if (!messageText) {
        return res.status(200).json({ status: "empty message" });
      }

      // Gửi sang Discord
      if (DISCORD_BOT_TOKEN && DISCORD_CHANNEL_ID) {
        try {
          const content = `📨 Từ ${senderName} (Lark): ${messageText}`;
          await axios.post(
            `https://discord.com/api/channels/${DISCORD_CHANNEL_ID}/messages`,
            { content },
            {
              headers: {
                Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                'Content-Type': 'application/json'
              }
            }
          );
        } catch (err) {
          console.error("❌ Lỗi gửi Discord:", err.message);
          console.error(err.response?.data);
          return res.status(500).json({ error: "Gửi Discord thất bại" });
        }
      }

      return res.status(200).json({ status: "forwarded to Discord" });
    }

    return res.status(200).json({ status: "ignored non-message event" });
  } catch (err) {
    console.error("❌ Lỗi webhook:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
    }
  }
};
