# AI scanner · ChatGPT qua 9Router

Từ giờ scanner chỉ dùng model cx/gpt-6.1-sol qua gateway http://localhost:20128/v1. Không có dataset, model local hoặc bước training.

Chạy trong thư mục ai-module:

```
npm install
npm start
npm test
```

Cấu hình .env theo .env.example; khóa chỉ để ở backend nếu 9Router yêu cầu. Mở /v3.html ở cổng 5100, hoặc AI trên trang booking.html khi chạy backend 5000.

Ba thanh 0–100 là điểm ước tính phần nhìn thấy, kèm dấu hiệu. Tổng quan Sạch/Hơi bẩn/Rất bẩn do model đánh giá từ ba tiêu chí, không do frontend lấy trung bình. Không tự đổi giá dịch vụ. Ảnh được gửi qua 9Router tới upstream, không phải xử lý hoàn toàn local.
