# file: api/main.py
import os
import json
import requests
from fastapi import FastAPI, Request, HTTPException, Response

# Import các hàm xử lý từ file khác
from .lark_handler import send_message_to_lark
from .gemini_handler import get_gemini_response

app = FastAPI()

# DÒNG CODE MỚI ĐƯỢC THÊM VÀO ĐỂ ĐỊNH NGHĨA TRANG CHỦ
@app.get("/")
def read_root():
    return {"status": "ok", "message": "Trợ lý ChatAI đã sẵn sàng nhận sự kiện từ Lark!"}

LARK_VERIFICATION_TOKEN = os.getenv('LARK_VERIFICATION_TOKEN')
DISCORD_WEBHOOK_URL = os.getenv('DISCORD_WEBHOOK_URL')

# Hàm mới để gửi log tới Discord qua Webhook
def send_log_to_discord(sender_name: str, question: str, answer: str):
    if not DISCORD_WEBHOOK_URL:
        print("Lỗi: DISCORD_WEBHOOK_URL chưa được thiết lập.")
        return

    # Tạo một embed đẹp mắt
    embed = {
        "author": {"name": f"{sender_name} (đã hỏi từ Larksuite)"},
        "title": "Câu hỏi",
        "description": question,
        "color": 3447003, # Màu xanh dương
        "fields": [
            {
                "name": "Câu trả lời từ Gemini AI",
                "value": answer
            }
        ]
    }

    payload = {
        "username": "Trợ lý ChatAI", # Tên sẽ hiển thị trên Discord
        "avatar_url": "https://i.imgur.com/fKL31aD.png", # Icon Gemini
        "embeds": [embed]
    }

    try:
        requests.post(DISCORD_WEBHOOK_URL, json=payload)
        print("Đã gửi log thành công đến Discord.")
    except requests.exceptions.RequestException as e:
        print(f"Lỗi khi gửi log đến Discord: {e}")


@app.post("/api/lark-events")
async def handle_lark_events(request: Request):
    # Lấy dữ liệu raw
    body_bytes = await request.body()
    data = json.loads(body_bytes)

    # Xử lý xác thực URL của Lark
    if data.get("type") == "url_verification":
        if data.get("token") != LARK_VERIFICATION_TOKEN:
            raise HTTPException(status_code=403, detail="Token xác thực không hợp lệ.")
        return {"challenge": data.get("challenge")}

    # Xử lý các sự kiện tin nhắn
    if data.get("header", {}).get("token") != LARK_VERIFICATION_TOKEN:
        raise HTTPException(status_code=403, detail="Token sự kiện không hợp lệ.")

    if data.get("header", {}).get("event_type") == "im.message.receive_v1":
        event = data.get("event", {})
        sender = event.get("sender", {})
        message = event.get("message", {})

        if sender.get("sender_type") == "bot" or message.get("message_type") != "text":
            return Response(status_code=200) # Bỏ qua nếu là bot hoặc không phải tin nhắn text

        chat_id = message.get("chat_id")
        message_text = json.loads(message.get("content", "{}")).get("text", "")

        sender_id = sender.get("sender_id", {})
        sender_name = f"User {sender_id.get('user_id') or sender_id.get('open_id')}"

        if not message_text:
             return Response(status_code=200)

        # Bắt đầu xử lý logic
        # 1. Lấy câu trả lời từ Gemini
        ai_response = get_gemini_response(chat_id, message_text)

        # 2. Gửi câu trả lời về Lark
        send_message_to_lark(chat_id, ai_response)

        # 3. Gửi log hội thoại đến Discord
        send_log_to_discord(sender_name, message_text, ai_response)

    return Response(status_code=200)