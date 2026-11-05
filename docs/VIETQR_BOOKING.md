# VietQR đặt lịch BIDV — 04/11/2026

## Thay đổi

Tích hợp theo yêu cầu tài khoản BIDV 8888444265. Sau khi POST /api/bookings thành công, nếu phương thức bank_transfer thì trang booking.html và booking-care.html mở dialog VietQR. Tài khoản/ngân hàng được khai báo tập trung trong service backend; tiền lấy từ booking.total_price đã tính và lưu ở backend, không lấy từ giá client gửi hoặc DOM tổng tiền. Nội dung chuyển tiền dùng mã đơn đã chuẩn hóa, tối đa 50 ký tự theo đặc tả Quick Link.

Thêm data.payment_qr vào phản hồi tạo và chi tiết đơn; không thêm endpoint hoặc bảng. API chi tiết tiếp tục kiểm tra JWT và quyền chủ đơn/admin. Không trả QR cho cash/wallet/phương thức khác, đơn paid/refunded/cancelled, pending_survey hoặc tiền <=0, không nguyên VND, vượt 13 chữ số, mã đơn không hợp lệ. Không tự đánh dấu paid, không thay giá hoặc state machine. Chưa có webhook thanh toán đơn khách; không quảng cáo tự động xác nhận.

Dialog dùng textContent/createElement, kiểm tra host HTTPS ảnh QR và số tiền khớp đơn; có xử lý ảnh lỗi/tải lại, thông tin chuyển khoản để đối chiếu, cảnh báo demo, nút xem đơn đã đặt. Không tự submit lại booking hoặc có nút giả xác nhận đã chuyển tiền. Hộp tập trung vào tiêu đề khi mở để tránh trình duyệt cuộn xuống nút tải lại làm khuất QR.

## File sửa/thêm

| File | Mục đích |
| --- | --- |
| backend/src/services/bookingVietQr.js | Tạo metadata/Quick Link từ đơn hàng đã lưu. |
| backend/src/controllers/bookingController.js | Bổ sung payment_qr sau tạo đơn và sau kiểm tra quyền xem chi tiết. |
| frontend/js/booking-qr.js | Dialog VietQR dùng chung, thông tin số tiền/tài khoản và xử lý lỗi ảnh. |
| frontend/css/booking-qr.css | Bố cục responsive cho dialog. |
| frontend/booking.html | Gọi dialog sau đặt lịch QR, bỏ nhãn tự động xác nhận chưa được hỗ trợ. |
| frontend/booking-care.html | Cùng hành vi QR cho đơn chăm sóc, không tự chuyển trang trước khi xem QR. |
| backend/test-vietqr.js | Test validation metadata và HTTP/JWT/giá server. |
| ai-module/test/booking-qr.test.cjs | Test DOM/XSS, nhánh QR/cash, ảnh lỗi, URL không tin cậy và hai form. |
| README.md, docs/VIETQR_BOOKING.md | Hướng dẫn và báo cáo thực tế. |

Giữ nguyên chỉnh sửa trangchu.html có sẵn của người dùng. Không migration, không dependency mới, không thay `.env`, không đổi tài khoản chiết khấu của nhân viên.

## Kết quả kiểm thử

- `node backend/test-vietqr.js`: PASS validation tiền/mã đơn/phương thức/trạng thái, 7 HTTP cases tạo đơn và chi tiết; guest 401, staff không sở hữu 403, chủ đơn/admin xem được. Request giả số tiền 1đ, trạng thái paid, tài khoản khác không làm thay QR hoặc trạng thái unpaid. Viết test trước sửa đã FAIL do service chưa có; sau sửa PASS.
- `node ai-module/test/booking-qr.test.cjs`: PASS dữ liệu server, XSS text, bank/account, demo, ảnh lỗi/tải lại, URL javascript/host lạ/amount lệch, metadata thiếu không tự tạo lại đơn, không tuyên bố tự paid, tích hợp cả hai form và cú pháp inline.
- `node ai-module/test/care-booking-auth.test.cjs`: PASS 12 submissions có token và 3 trường hợp guest/return URL.
- `node backend/test-care-booking.js`: PASS tạo 3 dịch vụ chăm sóc; guest, JWT giả/hết hạn bị chặn (9 negative cases).
- `node backend/test-demo-mode.js`: PASS 20 HTTP cases và tranh đơn/idempotency/config production; `node backend/test-demo-store.js`: PASS.
- Node syntax booking-qr.js và bookingVietQr.js: PASS; diff whitespace trong phạm vi: PASS.
- Bốn suite bắt buộc chạy riêng trên cổng 5002: comprehensive 20 PASS/1 FAIL khuyến mãi baseline, guest 11 PASS/1 FAIL tạo booking baseline, RBAC 10/10 PASS, return-url 12 PASS. Không sửa/hạ assertion hoặc bỏ test lỗi.
- HEAD tới URL ảnh nhà cung cấp: HTTP 200, image/svg+xml; browser tải và hiển thị mã thành công dù đường dẫn Quick Link dùng hậu tố .png.
- Browser thực: khách demo chọn QR, bấm đặt lịch tạo CNV-202611-7A4B9D và mở mã BIDV 8888444265 với 225.000 VND giống số tiền tổng đơn. Đã thấy ảnh QR tải xong và đầy đủ thông tin. Ảnh minh chứng ở ai-module/.cache/vietqr-booking-preview.png (gitignored). Không thực hiện chuyển tiền hoặc chấp nhận giao dịch ngân hàng.

## Áp dụng và giới hạn

Người dùng xác nhận khởi động lại backend dù mất dữ liệu RAM. Đã restart server cổng 5000 và giữ server chạy ở demo. Đơn test vẫn unpaid. Chưa có đối soát tự động, chưa chuyển khoản thật hoặc scan bằng app ngân hàng, chưa xác minh chủ tài khoản. Không được dùng việc tải được ảnh QR làm bằng chứng tiền đã đến.

Chưa kiểm thử MySQL thật do môi trường chạy demo; không thay schema/constraint. Không chạy clean-install mới vì không đổi dependency/lockfile, không chạy lại AI vì không thay AI. Nhà cung cấp QR và Internet là dependency runtime bên ngoài; nếu không tải được mã phải kiểm tra thông tin thanh toán trước khi chuyển. Theo tài liệu VietQR hiện tại, triển khai chính thức có thể cần template riêng theo chính sách nhà cung cấp; cần rà soát điều kiện dịch vụ trước production.

Nguồn chính thức: https://www.vietqr.io/qr-dong (đã đọc 04/11/2026). Quick Link gửi tài khoản, amount và addInfo tới img.vietqr.io; không gửi tên, địa chỉ, điện thoại hoặc JWT của khách.
