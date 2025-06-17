// file: api/main.js
const express = require('express');
const axios = require('axios');
const { sendMessageToLark } = require('./lark_handler');
const { getGeminiResponse } = require('./gemini_handler');

const app = express();
// Middleware để parse JSON body cho tất cả các request
app.use(express.json()); 

const LARK_VERIFICATION_TOKEN = process.env.LARK_VERIFICATION_TOKEN;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

async function sendLogToDiscord(senderName, question, answer) {
    if (!DISCORD_WEBHOOK_URL) {
        console.error("Lỗi: DISCORD_WEBHOOK_URL chưa được thiết lập.");
        return;
    }
    const embed = {
        author: { name: `${senderName} (đã hỏi từ Larksuite)` },
        title: "Câu hỏi",
        description: question,
        color: 3447003, // Màu xanh dương
        fields: [{ name: "Câu trả lời từ Gemini AI", value: answer }],
    };
    const payload = {
        username: "Trợ lý ChatAI",
        avatar_url: "https://i.imgur.com/fKL31aD.png",
        embeds: [embed],
    };
    try {
        await axios.post(DISCORD_WEBHOOK_URL, payload);
        console.log("Đã gửi log thành công đến Discord.");
    } catch (error) {
        console.error("Lỗi khi gửi log đến Discord:", error.message);
    }
}

// THÊM ĐOẠN NÀY VÀO
app.get("/api/status", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.post("/api/lark-events", async (req, res) => {
    const data = req.body;

    // Xử lý xác thực URL của Lark
    if (data.type === "url_verification") {
        if (data.token !== LARK_VERIFICATION_TOKEN) {
            return res.status(403).json({ error: "Token xác thực không hợp lệ." });
        }
        return res.json({ challenge: data.challenge });
    }

    // Xử lý các sự kiện tin nhắn
    if (data.header?.token !== LARK_VERIFICATION_TOKEN) {
        return res.status(403).json({ error: "Token sự kiện không hợp lệ." });
    }
    
    // Phản hồi ngay lập tức cho Lark để tránh timeout
    res.status(200).send();

    if (data.header?.event_type === "im.message.receive_v1") {
        const { event } = data;
        const { sender, message } = event;

        if (sender?.sender_type === "bot" || message?.message_type !== "text") {
            return; // Bỏ qua nếu là bot hoặc không phải tin nhắn text
        }

        const chatId = message.chat_id;
        const messageText = JSON.parse(message.content || "{}").text || "";
        const senderId = sender.sender_id;
        const senderName = `User ${senderId?.user_id || senderId?.open_id}`;

        if (!messageText) return;

        // Xử lý logic chính
        const aiResponse = await getGeminiResponse(chatId, messageText);
        await sendMessageToLark(chatId, aiResponse);
        await sendLogToDiscord(senderName, messageText, aiResponse);
    }
});

// Xuất app để Vercel có thể sử dụng
module.exports = app;