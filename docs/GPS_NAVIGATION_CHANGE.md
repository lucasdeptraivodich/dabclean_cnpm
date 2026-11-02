# Thay đổi GPS/chỉ đường — 02/11/2026

## Đồng bộ Git

Đã fetch `upstream` từ `lucasdeptraivodich/dabclean_cnpm`, merge fast-forward báo Already up to date. `upstream/main` ở `0a12b82`; HEAD chứa toàn bộ commit upstream và có thêm 3 commit local. Không reset hoặc ghi đè các thay đổi AI mới hơn. Thay đổi có sẵn của người dùng ở `frontend/trangchu.html` được giữ nguyên.

## Hành vi và file thay đổi

| File | Mục đích |
| --- | --- |
| `frontend/booking.html` | Bỏ bản đồ, GPS, tọa độ ẩn và ghi tọa độ vào notes; giữ địa chỉ bắt buộc. |
| `frontend/staff.html` | Nút bản đồ/chỉ đường ở đơn `confirmed`, `arrived`, `in_progress`; nạp component mới. |
| `frontend/js/staff-navigation.js` | Hộp bản đồ, địa chỉ khách, GPS nhân viên làm điểm xuất phát, liên kết Google Maps; xử lý từ chối quyền, lỗi, phản hồi muộn; hiển thị địa chỉ bằng textContent. |
| `frontend/css/staff-navigation.css` | Bố cục hộp bản đồ và màn hình nhỏ. |
| `frontend/api.js` | Client gọi API chỉ đường. |
| `backend/src/routes/staffRoutes.js` | Route GET `/api/staff/tasks/:id/navigation` sau middleware JWT/role hiện có. |
| `backend/src/controllers/staffController.js` | Kiểm tra ID, quyền được giao, trạng thái hiện tại và địa chỉ; chỉ trả ID/địa chỉ, không cache. |
| `backend/test-staff-navigation.js` | Kiểm thử HTTP, JWT, quyền và trạng thái với model fixtures. |
| `ai-module/test/staff-navigation.test.cjs` | Kiểm thử DOM bằng linkedom có sẵn, mã hóa URL, XSS và xử lý GPS. |
| `README.md` | Hướng dẫn sử dụng, endpoint, giới hạn và lệnh test. |
| `docs/GPS_NAVIGATION_CHANGE.md` | Báo cáo kết quả thực tế. |

Không đổi state machine, công thức giá, schema hoặc GPS bằng chứng ảnh Before/After. Không cần migration, thay `.env` hoặc cài dependency mới.

## Kết quả kiểm thử

| Lệnh / kiểm tra | Kết quả |
| --- | --- |
| `node backend/test-staff-navigation.js` | PASS 17 trường hợp: guest, customer, nhân viên khác, tài khoản khóa, JWT giả, ID sai/không tồn tại, trạng thái, admin, thiếu địa chỉ. Test đã chạy trước khi sửa và tái hiện API còn thiếu; sau sửa pass. |
| `node ai-module/test/staff-navigation.test.cjs` | PASS: dữ liệu địa chỉ có HTML không tạo DOM, URL điểm đến đúng, GPS chỉ làm origin, không tự xin quyền, GPS lỗi/không hỗ trợ, đóng dialog khi request chưa xong, loại GPS khách, giữ GPS ảnh và cú pháp script inline. |
| `node --check frontend/js/staff-navigation.js` và `node --check frontend/api.js` | PASS. |
| Browser thật tại localhost với backend test/in-memory | PASS đăng nhập staff, đơn đã nhận có nút, đơn hoàn tất không có nút, mở bản đồ Google tải thành công theo địa chỉ demo. Ảnh kiểm tra ở `ai-module/.cache/staff-navigation-preview.png` (không commit). |
| `node backend/test-comprehensive.js` | 19 PASS, 2 FAIL cũ: cộng dồn khuyến mãi và concurrency. Có chạy kiểm tra production từ chối JWT secret không an toàn và PASS. |
| `node backend/test-guest-access.js` | 11 PASS, 1 FAIL cũ: tạo booking. |
| `node backend/test-rbac-staff.js` | 9/10 PASS, test 8 FAIL cũ. |
| `node backend/test-return-url.js` | 12 PASS. |
| `node test-wallet-system.js` | FAIL cũ: Wallet query should succeed. |
| `node test-job-photos-flow.js` | 7 PASS, 14 FAIL cũ trong luồng nhận việc/ảnh/thanh toán. |
| Diff whitespace của các file trong phạm vi | PASS; không sửa whitespace có sẵn ở trangchu.html. |

Sáu bộ hồi quy chạy lần lượt trên backend test mới cho từng suite, dùng JWT secret ngẫu nhiên và model in-memory. Đã đối chiếu outcome với log baseline: cùng kết quả pass/fail; khác mã đơn sinh ngẫu nhiên và tháng hiện tại. Không vô hiệu hóa hoặc sửa test cũ để làm chúng pass.

## Giới hạn và việc chưa kiểm thử

- Chưa chạy MySQL thật; các kết quả trên không chứng minh schema/constraint MySQL hoạt động. Thay đổi chỉ đọc địa chỉ booking hiện có, không cập nhật database.
- Chưa thử GPS vật lý/điều hướng ngoài đường trên điện thoại; trường hợp định vị thành công/thất bại được kiểm tra bằng DOM fixtures. Cần HTTPS hoặc localhost và quyền vị trí.
- Không chạy clean-install mới vì không thay dependency/lockfile, không chạy lại AI/model suite vì không đổi mô-đun phân tích ảnh.
- Bản đồ cần Internet và gửi địa chỉ demo/khách sang Google khi nhân viên chủ động mở. Không lưu GPS nhân viên vào database. Địa chỉ thiếu số nhà/căn hộ hoặc nhập sai có thể cho kết quả chưa chính xác; giao diện nhắc đối chiếu và liên hệ khách.
- Lỗi ví, khuyến mãi, concurrency, tạo booking và luồng ảnh từ baseline chưa được xử lý trong phạm vi thay đổi GPS này. Trang nhân viên test vẫn có cảnh báo tải ví lỗi từ baseline.
