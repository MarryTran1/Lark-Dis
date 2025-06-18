// file: api/main.js
const express = require('express');
const axios = require('axios');
const { sendMessageToLark } = require('./lark_handler');
const { getGeminiResponse } = require('./gemini_handler');

const app = express();
app.use(express.json()); // Phân tích JSON body từ request

const LARK_VERIFICATION_TOKEN = process.env.LARK_VERIFICATION_TOKEN;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Gửi log đến Discord
async function sendLogToDiscord(senderName, question, answer) {
    if (!DISCORD_WEBHOOK_URL) {
        console.error("Lỗi: DISCORD_WEBHOOK_URL chưa được thiết lập.");
        return;
    }

    const embed = {
        author: { name: `${senderName} (đã hỏi từ Larksuite)` },
        title: "Câu hỏi",
        description: question,
        color: 3447003,
        fields: [{ name: "Câu trả lời từ Gemini AI", value: answer }],
    };

    const payload = {
        username: "Trợ lý ChatAI",
        avatar_url: "https://i.imgur.com/fKL31aD.png",
        embeds: [embed],
    };

    try {
        await axios.post(DISCORD_WEBHOOK_URL, payload);
        console.log("✅ Đã gửi log đến Discord.");
    } catch (error) {
        console.error("❌ Lỗi khi gửi log đến Discord:", error.message);
    }
}

// Route kiểm tra trạng thái
app.get("/api/status", (req, res) => {
    res.status(200).json({ status: "ok" });
});

// Webhook từ Lark
app.post("/api/lark-events", async (req, res) => {
    try {
        const data = req.body;

        // 1. Xử lý xác minh URL (khi đăng ký webhook)
        if (data.type === "url_verification") {
            if (data.token !== LARK_VERIFICATION_TOKEN) {
                return res.status(403).json({ error: "Token xác thực không hợp lệ." });
            }
            return res.status(200).json({ challenge: data.challenge });
        }

        // 2. Xác thực token trong header
        if (data.header?.token !== LARK_VERIFICATION_TOKEN) {
            return res.status(403).json({ error: "Token sự kiện không hợp lệ." });
        }

        // 3. Phản hồi ngay cho Lark để tránh timeout
        res.status(200).json({ status: "ok" });

        // 4. Xử lý sự kiện tin nhắn
        if (data.header?.event_type === "im.message.receive_v1") {
            const { event } = data;
            const { sender, message } = event;

            if (sender?.sender_type === "bot" || message?.message_type !== "text") return;

            const chatId = message.chat_id;
            const messageText = JSON.parse(message.content || "{}").text || "";
            const senderId = sender.sender_id;
            const senderName = `User ${senderId?.user_id || senderId?.open_id}`;

            if (!messageText) return;

            // Gọi AI trả lời và phản hồi
            const aiResponse = await getGeminiResponse(chatId, messageText);
            await sendMessageToLark(chatId, aiResponse);
            await sendLogToDiscord(senderName, messageText, aiResponse);
        }
    } catch (err) {
        console.error("❌ Lỗi xử lý webhook Lark:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
        }
    }
});

// Bắt buộc cho Vercel sử dụng
module.exports = app;
