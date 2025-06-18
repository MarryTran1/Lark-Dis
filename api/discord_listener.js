// file: discord_listener.js
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const { getGeminiResponse } = require('./gemini_handler');

// Khởi tạo bot Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // BẮT BUỘC để đọc nội dung tin nhắn
    ]
});

// ENV
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const LARK_FORWARD_ENDPOINT = process.env.LARK_FORWARD_ENDPOINT; // API Bot Lark nhận tin nhắn

client.once('ready', () => {
    console.log(`✅ Bot Discord đã sẵn sàng dưới tên: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    // Bỏ qua tin nhắn từ bot
    if (message.author.bot) return;

    const userMessage = message.content;
    const senderName = message.author.username;

    console.log(`📩 Nhận tin nhắn từ ${senderName}: ${userMessage}`);

    try {
        // Gọi Gemini để lấy trả lời
        const aiResponse = await getGeminiResponse(message.id, userMessage);

        // Trả lời lại trong Discord
        await message.reply(`🤖 ${aiResponse}`);
        console.log(`✅ Đã gửi câu trả lời AI trong Discord`);

        // Gửi trả lời sang Bot Lark
        if (LARK_FORWARD_ENDPOINT) {
            await axios.post(LARK_FORWARD_ENDPOINT, {
                chat_id: "auto", // Nếu bạn có chat_id cụ thể, hãy thay
                message: `🤖 Gemini trả lời bạn:\n${aiResponse}`
            });
            console.log("📤 Đã gửi lại trả lời về Bot Lark");
        } else {
            console.warn("⚠️ Thiếu biến môi trường LARK_FORWARD_ENDPOINT");
        }
    } catch (err) {
        console.error("❌ Lỗi xử lý Discord message:", err.message);
        console.error(err.response?.data);
    }
});

// Bắt đầu bot
client.login(DISCORD_BOT_TOKEN);
