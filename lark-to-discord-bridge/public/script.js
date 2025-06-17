document.addEventListener('DOMContentLoaded', async () => {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    try {
        // Chúng ta sẽ tạo API endpoint này ở bước tiếp theo
        const response = await fetch('/api/status');
        
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'ok') {
                statusDot.classList.add('online');
                statusText.textContent = 'Trực tuyến';
            } else {
                throw new Error('Trạng thái không hợp lệ');
            }
        } else {
            throw new Error('Không thể kết nối tới server');
        }
    } catch (error) {
        console.error('Lỗi khi kiểm tra trạng thái:', error);
        statusDot.classList.add('offline');
        statusText.textContent = 'Ngoại tuyến';
    }
});