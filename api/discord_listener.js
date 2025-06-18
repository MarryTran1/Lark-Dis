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

client.once('ready', () => {
  console.log(`🤖 Bot Discord đã sẵn sàng: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  let parsed;
  try {
    parsed = JSON.parse(message.content);
  } catch {
    return;
  }

  if (!parsed.fromLark || !parsed.chatId || !parsed.text) return;

  const chatId = parsed.chatId;
  const prompt = parsed.text;
  const senderName = message.author.username;

  try {
    const aiResponse = await getGeminiResponse(message.id, prompt);

    await message.reply(`🤖 ${aiResponse}`);
    console.log("✅ Trả lời trong Discord");

    if (LARK_FORWARD_ENDPOINT) {
      const res = await axios.post(LARK_FORWARD_ENDPOINT, {
        message: aiResponse,
        chat_id: chatId
      });
      console.log("📤 Gửi trả lời về Lark OK", res.status);
    } else {
      console.warn("⚠️ Thiếu LARK_FORWARD_ENDPOINT");
    }
  } catch (err) {
    console.error("❌ Lỗi Discord Bot:", err.message);
    console.error(err.response?.data);
  }
});

client.login(DISCORD_BOT_TOKEN);