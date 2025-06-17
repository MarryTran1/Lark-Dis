# file: api/gemini_handler.py
import os
import google.generativeai as genai

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("LỖI: GEMINI_API_KEY chưa được thiết lập.")

genai.configure(api_key=GEMINI_API_KEY)

lark_chat_sessions = {}

def get_gemini_response(session_id: str, user_prompt: str) -> str:
    global lark_chat_sessions

    if session_id not in lark_chat_sessions:
        print(f"Bắt đầu phiên trò chuyện mới cho Lark chat ID: {session_id}")
        model = genai.GenerativeModel(
            'gemini-1.5-flash-latest',
            system_instruction="Bạn là một trợ lý AI hữu ích và thân thiện, trả lời các câu hỏi được gửi từ nền tảng Lark. Luôn luôn trả lời bằng tiếng Việt."
        )
        lark_chat_sessions[session_id] = model.start_chat(history=[])

    chat = lark_chat_sessions[session_id]

    try:
        print(f"Đang gửi prompt '{user_prompt}' cho Gemini...")
        response = chat.send_message(user_prompt) # Dùng hàm đồng bộ
        print("Đã nhận được phản hồi từ Gemini.")
        return response.text
    except Exception as e:
        print(f"Lỗi khi gọi Gemini API cho session {session_id}: {e}")
        if session_id in lark_chat_sessions:
            del lark_chat_sessions[session_id]
        return "Xin lỗi, tôi đang gặp sự cố với bộ não Gemini. Vui lòng thử lại sau một lát."