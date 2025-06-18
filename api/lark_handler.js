const axios = require('axios');

const LARK_BOT_TOKEN = process.env.LARK_BOT_TOKEN;

async function sendMessageToLark(chat_id, message) {
  await axios.post('https://open.larksuite.com/open-apis/im/v1/messages', {
    receive_id: chat_id,
    content: JSON.stringify({ text: message }),
    msg_type: "text"
  }, {
    headers: {
      'Authorization': `Bearer ${LARK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Open-Receive-Id-Type': 'chat_id'
    }
  });
}

module.exports = { sendMessageToLark };
