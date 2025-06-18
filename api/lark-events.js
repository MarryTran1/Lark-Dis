// file: api/lark-events.js
const { sendMessageToLark } = require('./lark_handler');
const { getGeminiResponse } = require('./gemini_handler');
const axios = require('axios');

const LARK_VERIFICATION_TOKEN = process.env.LARK_VERIFICATION_TOKEN;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

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

        // 3. Trả lời ngay cho Lark để không timeout
        res.status(200).json({ status: "ok" });

        // 4. Xử lý message
        if (data.header?.event_type === "im.message.receive_v1") {
            const { event } = data;
            const { sender, message } = event;

            if (sender?.sender_type === "bot" || message?.message_type !== "text") return;

            const chatId = message.chat_id;
            const messageText = JSON.parse(message.content || "{}").text || "";
            const senderId = sender.sender_id;
            const senderName = `User ${senderId?.user_id || senderId?.open_id}`;

            if (!messageText) return;

            const aiResponse = await getGeminiResponse(chatId, messageText);
            await sendMessageToLark(chatId, aiResponse);

            if (DISCORD_WEBHOOK_URL) {
                await axios.post(DISCORD_WEBHOOK_URL, {
                    content: `📥 ${senderName} hỏi: ${messageText}\n💬 Trả lời: ${aiResponse}`
                });
            }
        }
    } catch (err) {
        console.error("❌ Lỗi xử lý webhook Lark:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
        }
    }
};
