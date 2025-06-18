// file: api/lark-events.js
const { sendMessageToLark } = require('./lark_handler');
const { getGeminiResponse } = require('./gemini_handler');
const axios = require('axios');

// Lấy biến môi trường từ Vercel
const LARK_VERIFICATION_TOKEN = process.env.LARK_VERIFICATION_TOKEN;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const data = req.body;

        // 1. Xác minh webhook từ Lark
        if (data.type === "url_verification") {
            if (data.token !== LARK_VERIFICATION_TOKEN) {
                console.warn("❌ Token xác minh sai:", data.token);
                return res.status(403).json({ error: "Token xác thực không hợp lệ." });
            }
            return res.status(200).json({ challenge: data.challenge });
        }

        // 2. Kiểm tra token trong header sự kiện
        console.log("🧪 Dữ liệu webhook nhận từ Lark:", JSON.stringify(data, null, 2));
        console.log("🔐 Token hệ thống:", LARK_VERIFICATION_TOKEN);

        const tokenFromLark = data.token || data.header?.token;

        if (tokenFromLark !== LARK_VERIFICATION_TOKEN) {
        console.warn("⚠️ Token từ Lark sai hoặc thiếu:", tokenFromLark);
        return res.status(403).json({ error: "Token sự kiện không hợp lệ." });
        }

        // 3. Trả lời ngay tránh timeout
        res.status(200).json({ status: "ok" });

        // 4. Xử lý message
        if (data.header?.event_type === "im.message.receive_v1") {
            const { event } = data;
            const { sender, message } = event;

            if (sender?.sender_type === "bot" || message?.message_type !== "text") return;

            const chatId = message.chat_id;
            let messageText = "";
            try {
                messageText = JSON.parse(message.content || "{}").text || "";
            } catch (err) {
                console.error("❌ Lỗi parse message content:", message.content);
                return;
            }

            const senderId = sender.sender_id;
            const senderName = `User ${senderId?.user_id || senderId?.open_id}`;
            if (!messageText) return;

            const aiResponse = await getGeminiResponse(chatId, messageText);
            await sendMessageToLark(chatId, aiResponse);

            // 5. Gửi log tới Discord bằng bot
            if (DISCORD_BOT_TOKEN && DISCORD_CHANNEL_ID) {
                try {
                    const content = `📥 ${senderName} hỏi: ${messageText}\n💬 Trả lời: ${aiResponse}`;
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
                    console.log("✅ Đã gửi log đến Discord.");
                } catch (err) {
                    console.error("❌ Lỗi khi gửi Discord:", err.message);
                    console.error(err.response?.data);
                }
            } else {
                console.warn("⚠️ Thiếu DISCORD_BOT_TOKEN hoặc DISCORD_CHANNEL_ID");
            }
        }
    } catch (err) {
        console.error("❌ Lỗi xử lý webhook:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
        }
    }
};
