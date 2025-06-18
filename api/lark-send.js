// file: api/lark-send.js
const { sendMessageToLark } = require('./lark_handler');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  const { chat_id, message } = req.body;
  if (!chat_id || !message) return res.status(400).json({ error: "Thiếu chat_id hoặc message" });

  try {
    await sendMessageToLark(chat_id, message);
    return res.status(200).json({ status: "Đã gửi về Lark" });
  } catch (err) {
    console.error("❌ Lỗi gửi về Lark:", err.message);
    return res.status(500).json({ error: "Lỗi gửi về Lark" });
  }
};
