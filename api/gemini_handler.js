// file: api/gemini_handler.js
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    throw new Error("LỖI: GEMINI_API_KEY chưa được thiết lập.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const larkChatSessions = {};

async function getGeminiResponse(sessionId, userPrompt) {
    if (!larkChatSessions[sessionId]) {
        console.log(`Bắt đầu phiên trò chuyện mới cho Lark chat ID: ${sessionId}`);
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash-latest',
            systemInstruction: "Bạn là một trợ lý AI hữu ích và thân thiện, trả lời các câu hỏi được gửi từ nền tảng Lark. Luôn luôn trả lời bằng tiếng Việt."
        });
        larkChatSessions[sessionId] = model.startChat({ history: [] });
    }

    const chat = larkChatSessions[sessionId];

    try {
        console.log(`Đang gửi prompt '${userPrompt}' cho Gemini...`);
        const result = await chat.sendMessage(userPrompt);
        const response = result.response;
        console.log("Đã nhận được phản hồi từ Gemini.");
        return response.text();
    } catch (error) {
        console.error(`Lỗi khi gọi Gemini API cho session ${sessionId}:`, error);
        // Xóa phiên bị lỗi để lần sau tạo lại
        delete larkChatSessions[sessionId];
        return "Xin lỗi, tôi đang gặp sự cố với bộ não Gemini. Vui lòng thử lại sau một lát.";
    }
}

module.exports = { getGeminiResponse };