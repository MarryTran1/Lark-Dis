// file: api/lark-events.js
const axios = require('axios');

// Biến môi trường từ Vercel
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
                return res.status(403).json({ error: "Token xác thực không hợp lệ." });
            }
            return res.status(200).json({ challenge: data.challenge });
        }

        // 2. Kiểm tra token từ sự kiện
        const tokenFromLark = data.token || data.header?.token;
        if (tokenFromLark !== LARK_VERIFICATION_TOKEN) {
            console.warn("⚠️ Token từ Lark sai hoặc thiếu:", tokenFromLark);
            return res.status(403).json({ error: "Token sự kiện không hợp lệ." });
        }

        // 3. Xử lý tin nhắn gửi từ Lark
        if (data.header?.event_type === "im.message.receive_v1") {
            const { event } = data;
            const { sender, message } = event;

            // Bỏ qua tin từ bot hoặc không phải text
            if (sender?.sender_type === "bot" || message?.message_type !== "text") {
                return res.status(200).json({ status: "ignored bot or non-text" });
            }

            const chatId = message.chat_id;
            let messageText = "";

            try {
                messageText = JSON.parse(message.content || "{}").text || "";
            } catch (err) {
                console.error("❌ Không phân tích được nội dung tin nhắn:", message.content);
                return res.status(400).json({ error: "Message content invalid" });
            }

            const senderId = sender.sender_id;
            const senderName = `User ${senderId?.user_id || senderId?.open_id}`;

            if (!messageText) {
                return res.status(200).json({ status: "empty message" });
            }

            // 4. Gửi sang Discord để bot xử lý tiếp
            if (DISCORD_BOT_TOKEN && DISCORD_CHANNEL_ID) {
                try {
                    const content = `🟦 Tin nhắn từ ${senderName} trên Lark:\n${messageText}`;

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

                    console.log("✅ Tin nhắn từ Lark đã gửi lên Discord.");
                    return res.status(200).json({ status: "forwarded to Discord" });

                } catch (err) {
                    console.error("❌ Gửi Discord thất bại:", err.message);
                    console.error(err.response?.data);
                    return res.status(500).json({ error: "Gửi Discord lỗi" });
                }
            } else {
                console.warn("⚠️ Chưa cấu hình bot token hoặc channel ID");
                return res.status(500).json({ error: "Thiếu cấu hình Discord" });
            }
        }

        // 5. Không phải sự kiện message
        return res.status(200).json({ status: "non-message event ignored" });

    } catch (err) {
        console.error("❌ Lỗi xử lý webhook:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
        }
    }
};
