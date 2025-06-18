// file: api/main.js
const express = require('express');
const app = express();

app.use(express.json()); // Đảm bảo phân tích JSON body

app.post('/your-webhook-endpoint', (req, res) => {
    const { type, token, challenge } = req.body;

    // Kiểm tra xem có phải yêu cầu xác minh URL không
    if (type === 'url_verification') {
        return res.status(200).json({ challenge });
    }

    // Mặc định phản hồi nếu không phải loại này
    return res.status(400).json({ error: 'Invalid request type' });
});

app.listen(3000, () => {
    console.log('Webhook server is running on port 3000');
});
