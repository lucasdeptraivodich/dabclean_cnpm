# Hủy đơn khách, QR trong chi tiết và bỏ MoMo/VNPAY — 05/11/2026

## Nguyên nhân và kết quả

BookingModel.updateStatus truyền `[status, reason, status, status, id, expectedStatus]`, nhưng nhánh UPDATE generic trong adapter memory lấy tham số cuối làm ID. Khi có expectedStatus, parseInt('pending') trả NaN nên không tìm được đơn và controller trả 409, kể cả sau tải lại. Đã thêm nhánh xử lý đúng câu SQL updateStatus, đọc ID ở vị trí 4, trạng thái dự kiến ở vị trí 5, cập nhật status/cancel_reason/wage_status đúng CASE. Giữ compare-and-set, không bỏ kiểm tra quyền, trạng thái hoặc sửa SQL dùng cho MySQL.

Chi tiết đơn trước đây dùng bản cache trong myBookings và không nạp/render QR. Đã gọi API chi tiết được bảo vệ mỗi lần mở và render QR trực tiếp trong hộp chi tiết. Tái sử dụng component tạo QR hiện có bằng API render cho nội dung inline, giữ open cho trang đặt lịch. Không hiển thị QR cho đơn paid/refunded/cancelled, cash/wallet hoặc chờ khảo sát; dữ liệu thiếu hiển thị thông báo thay vì tự tạo lại booking. Giá từ backend, BIDV 8888444265, không tự đánh dấu đã nhận tiền.

Theo yêu cầu bổ sung, bỏ lựa chọn MoMo và VNPAY ở booking/booking-care, API tạo đơn chỉ nhận cash/bank_transfer/wallet. Giữ enum database và nhãn phương thức cũ để không phá lịch sử giao dịch. Không đổi bảng giá hay quy tắc hủy/hoàn tiền.

## File sửa/thêm trong lượt này

- backend/src/config/db.js: sửa adapter memory cho updateStatus và giữ CAS.
- backend/src/controllers/bookingController.js: giới hạn phương thức cho đơn mới.
- frontend/my-bookings.html: tải chi tiết mới, render QR và xử lý lỗi request.
- frontend/js/booking-qr.js: dùng chung render inline/modal, chỉ render đơn còn cần thanh toán.
- frontend/css/booking-qr.css: style inline/responsive cho QR trong chi tiết.
- frontend/booking.html, frontend/booking-care.html: bỏ lựa chọn MoMo/VNPAY.
- backend/test-customer-cancel.js: regression HTTP, validation, RBAC, trạng thái, hoàn ví và concurrency.
- ai-module/test/my-bookings-payment.test.cjs: test hành vi chi tiết thật trong DOM, dữ liệu mới, QR và lựa chọn bị bỏ.
- ai-module/test/booking-qr.test.cjs: fixture trạng thái unpaid theo điều kiện render mới.
- README.md và docs/CUSTOMER_CANCELLATION_QR.md: hướng dẫn và báo cáo.

Giữ các thay đổi QR từ lượt trước và chỉnh sửa trangchu.html của người dùng. Không migration, `.env`, dependency hoặc lockfile mới. Không push Git.

## Kiểm thử đã chạy

- `node backend/test-customer-cancel.js`: PASS 26 HTTP cases + CAS và HTTP requests đồng thời. Guest/staff khác không hủy được; pending/assigned/confirmed hủy được; arrived/in_progress/completed bị từ chối; lý do thiếu/quá dài bị từ chối; trạng thái/lý do/wage_status được lưu, QR biến mất sau hủy; ví hoàn một lần; MoMo/VNPAY tạo mới trả 400. Test viết trước sửa đã tái hiện 409 thay vì 200.
- `node ai-module/test/my-bookings-payment.test.cjs`: PASS click chi tiết gọi backend thay cache cũ, QR hiện ngay với số tiền 425.000 thay cache 1 VND, QR cũ bị gỡ cho paid/cancelled/cash/wallet, request lỗi có phản hồi và nút được bật lại; hai form không còn MoMo/VNPAY; kiểm tra cú pháp script inline.
- `node ai-module/test/booking-qr.test.cjs`: PASS tạo QR ban đầu, URL/amount, DOM XSS, lỗi ảnh/tải lại và thông báo demo.
- `node backend/test-vietqr.js`: PASS validation + 7 HTTP cases quyền/giá server/QR.
- `node backend/test-staff-cancellation.js`: PASS 9 HTTP cases; `node backend/test-demo-mode.js`: PASS 20 cases và concurrency/idempotency/config.
- `node ai-module/test/care-booking-auth.test.cjs`: PASS 12 submissions có token, 3 trường hợp guest.
- Bốn suite regression trên cổng 5002, mỗi suite dữ liệu riêng, không đụng phiên người dùng: comprehensive 20 PASS/1 FAIL promo baseline; guest 11 PASS/1 FAIL booking baseline; RBAC 10/10 PASS; return-url 12 PASS. Không sửa assertion hoặc bỏ test.
- Diff whitespace trong các file của lượt sửa: PASS.

## Browser và áp dụng

Người dùng xác nhận restart chấp nhận mất dữ liệu RAM. Đã restart backend 5000 và đăng nhập khách demo. Tạo hai đơn thử: E95B9C để xem lại QR, 03EF57 để hủy. Trong my-bookings, click Chi tiết E95B9C hiện QR BIDV với 225.000 VND. Click Hủy 03EF57 rồi xác nhận thành công, không còn 409. Sau reload, đơn vẫn ĐÃ HỦY; chi tiết đơn đã hủy không có QR. Đã mở lại QR đơn chưa thanh toán sau reload.

Ảnh gitignored: ai-module/.cache/customer-detail-qr.png, ai-module/.cache/customer-cancel-success.png. Không gửi tiền hoặc xác nhận chuyển khoản thật. Server demo giữ chạy để người dùng thử tiếp.

## Giới hạn

Chưa chạy MySQL thật; kết quả memory không chứng minh transaction/schema/constraint MySQL. Không thay SQL/schema. Không clean-install lại vì không đổi dependency; không chạy lại AI vì không sửa AI. Hai lỗi regression baseline về khuyến mãi và test tạo booking còn tồn tại. QR còn phụ thuộc Internet/nhà cung cấp và chưa có đối soát tự động. Dữ liệu demo vẫn mất khi dừng server.
