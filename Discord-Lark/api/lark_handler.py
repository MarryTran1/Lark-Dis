# file: api/lark_handler.py
import os
import requests
import json
import time

LARK_APP_ID = os.getenv('LARK_APP_ID')
LARK_APP_SECRET = os.getenv('LARK_APP_SECRET')

lark_access_token = None
lark_token_expires_at = 0

def get_lark_tenant_access_token():
    global lark_access_token, lark_token_expires_at
    if lark_access_token and time.time() < lark_token_expires_at:
        return lark_access_token
    url = "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal"
    payload = {"app_id": LARK_APP_ID, "app_secret": LARK_APP_SECRET}
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        if data.get("code") == 0:
            lark_access_token = data["tenant_access_token"]
            lark_token_expires_at = time.time() + data["expire"] - 300
            print("Đã lấy thành công Larksuite Tenant Access Token.")
            return lark_access_token
    except requests.exceptions.RequestException as e:
        print(f"Lỗi request khi lấy Lark Token: {e}")
    return None

def send_message_to_lark(chat_id, message_content):
    token = get_lark_tenant_access_token()
    if not token: return
    url = f"https://open.larksuite.com/open-apis/im/v1/messages?receive_id_type=chat_id"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=utf-8"}
    payload = {"receive_id": chat_id, "msg_type": "text", "content": json.dumps({"text": message_content})}
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        print(f"Đã gửi thành công tin nhắn trả lời đến Lark Chat ID: {chat_id}")
    except requests.exceptions.RequestException as e:
        print(f"Lỗi request khi gửi tin đến Lark: {e}")