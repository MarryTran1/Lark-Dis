const { sendMessageToLark } = require('./lark_handler');
const { getGeminiResponse } = require('./gemini_handler');
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

        // 1. Xác minh URL từ Lark
        if (data.type === "url_verification") {
            if (data.token !== LARK_VERIFICATION_TOKEN) {
                return res.status(403).json({ error: "Token xác thực không hợp lệ." });
            }
            return res.status(200).json({ challenge: data.challenge });
        }

        // 2. Xác thực token
        if (data.header?.token !== LARK_VERIFICATION_TOKEN) {
            return res.status(403).json({ error: "Token sự kiện không hợp lệ." });
        }

        // 3. Phản hồi ngay để tránh timeout
        res.status(200).json({ status: "ok" });

        // 4. Xử lý tin nhắn
        if (data.header?.event_type === "im.message.receive_v1") {
            const { event } = data;
            const { sender, message } = event;

            if (sender?.sender_type === "bot" || message?.message_type !== "text") return;

            const chatId = message.chat_id;
            let messageText = "";
            try {
                messageText = JSON.parse(message.content || "{}").text || "";
            } catch (err) {
                console.error("❌ Không thể phân tích message content:", message.content);
                return;
            }

            const senderId = sender.sender_id;
            const senderName = `User ${senderId?.user_id || senderId?.open_id}`;

            if (!messageText) return;

            const aiResponse = await getGeminiResponse(chatId, messageText);
            await sendMessageToLark(chatId, aiResponse);

            // Gửi tin nhắn đến Discord qua BOT
            if (DISCORD_BOT_TOKEN && DISCORD_CHANNEL_ID) {
                try {
                    await axios.post(
                        `https://discord.com/api/channels/${DISCORD_CHANNEL_ID}/messages`,
                        { content: `📥 ${senderName} hỏi: ${messageText}\n💬 Trả lời: ${aiResponse}` },
                        {
                            headers: {
                                Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    console.log("✅ Tin nhắn đã gửi thành công qua Bot Discord.");
                } catch (err) {
                    console.error("❌ Lỗi gửi Discord bằng Bot:", err.message);
                    console.error(err.response?.data);
                }
            } else {
                console.warn("⚠️ DISCORD_BOT_TOKEN hoặc DISCORD_CHANNEL_ID chưa được cấu hình!");
            }
        }
    } catch (err) {
        console.error("❌ Lỗi xử lý webhook Lark:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
        }
    }
};
