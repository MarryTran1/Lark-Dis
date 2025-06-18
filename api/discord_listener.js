require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const { getGeminiResponse } = require('./gemini_handler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const LARK_FORWARD_ENDPOINT = process.env.LARK_FORWARD_ENDPOINT;
const DEFAULT_CHAT_ID = process.env.DEFAULT_LARK_CHAT_ID; // Tạm thời gán mặc định

client.once('ready', () => {
  console.log(`🤖 Bot Discord đã sẵn sàng: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const userMessage = message.content.trim();
  const senderName = message.author.username;

  try {
    const aiResponse = await getGeminiResponse(message.id, userMessage);

    await message.reply(`🤖 ${aiResponse}`);

    if (LARK_FORWARD_ENDPOINT && DEFAULT_CHAT_ID) {
      await axios.post(LARK_FORWARD_ENDPOINT, {
        message: aiResponse,
        chat_id: DEFAULT_CHAT_ID
      });
      console.log("✅ Đã gửi trả lời về Lark");
    } else {
      console.warn("⚠️ Thiếu endpoint hoặc chat_id");
    }
  } catch (err) {
    console.error("❌ Lỗi xử lý Discord:", err.message);
    console.error(err.response?.data);
  }
});

client.login(DISCORD_BOT_TOKEN);
