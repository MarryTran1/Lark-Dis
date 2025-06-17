// file: api/lark_handler.js
const axios = require('axios');

const LARK_APP_ID = process.env.LARK_APP_ID;
const LARK_APP_SECRET = process.env.LARK_APP_SECRET;

let larkAccessToken = null;
let larkTokenExpiresAt = 0; // Lưu thời gian hết hạn (dưới dạng timestamp ms)

async function getLarkTenantAccessToken() {
    if (larkAccessToken && Date.now() < larkTokenExpiresAt) {
        return larkAccessToken;
    }
    const url = "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal";
    const payload = { "app_id": LARK_APP_ID, "app_secret": LARK_APP_SECRET };
    try {
        const response = await axios.post(url, payload);
        const data = response.data;
        if (data.code === 0) {
            larkAccessToken = data.tenant_access_token;
            // Trừ đi 5 phút (300,000 ms) để đảm bảo token luôn hợp lệ
            larkTokenExpiresAt = Date.now() + (data.expire * 1000) - 300000;
            console.log("Đã lấy thành công Larksuite Tenant Access Token.");
            return larkAccessToken;
        }
    } catch (error) {
        console.error("Lỗi request khi lấy Lark Token:", error.message);
    }
    return null;
}

async function sendMessageToLark(chatId, messageContent) {
    const token = await getLarkTenantAccessToken();
    if (!token) return;

    const url = `https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id`;
    const headers = { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8"
    };
    const payload = {
        "receive_id": chatId,
        "msg_type": "text",
        "content": JSON.stringify({ "text": messageContent })
    };
    try {
        await axios.post(url, payload, { headers });
        console.log(`Đã gửi thành công tin nhắn trả lời đến Lark Chat ID: ${chatId}`);
    } catch (error) {
        console.error("Lỗi request khi gửi tin đến Lark:", error.message);
    }
}

module.exports = { sendMessageToLark };