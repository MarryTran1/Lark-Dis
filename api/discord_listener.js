// file: discord_listener.js
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const { getGeminiResponse } = require('./gemini_handler'); // file bạn đã có

// Lấy token và endpoint từ .env
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const LARK_FORWARD_ENDPOINT = process.env.LARK_FORWARD_ENDPOINT; // Ví dụ: https://your-app.vercel.app/api/lark-send

// Khởi tạo client Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Bot sẵn sàng
client.once('ready', () => {
    console.log(`✅ Bot Discord đã sẵn sàng với tên: ${client.user.tag}`);
});

// Xử lý tin nhắn mới
client.on('messageCreate', async (message) => {
    // Bỏ qua tin nhắn từ chính bot
    if (message.author.bot) return;

    const userMessage = message.content.trim();
    const senderName = message.author.username;

    console.log(`📨 Nhận tin từ ${senderName}: ${userMessage}`);

    try {
        // Gửi prompt tới Gemini
        const aiResponse = await getGeminiResponse(message.id, userMessage);

        // Gửi câu trả lời vào Discord
        await message.reply(`🤖 ${aiResponse}`);
        console.log("✅ Đã gửi câu trả lời trong Discord");

        // Gửi lại câu trả lời về bot Lark
        if (LARK_FORWARD_ENDPOINT) {
            await axios.post(LARK_FORWARD_ENDPOINT, {
                message: aiResponse,
                chat_id: "auto" // Nếu bạn có mapping chat_id, sửa chỗ này
            });
            console.log("📤 Đã gửi lại trả lời về bot Lark");
        } else {
            console.warn("⚠️ Thiếu biến môi trường LARK_FORWARD_ENDPOINT");
        }

    } catch (err) {
        console.error("❌ Lỗi xử lý message:", err.message);
        console.error(err.response?.data);
    }
});

// Đăng nhập bot
client.login(DISCORD_BOT_TOKEN);
