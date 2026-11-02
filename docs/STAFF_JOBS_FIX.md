# Đơn chờ nhận và nút hủy công việc — 02/11/2026

## Nguyên nhân và thay đổi

Đã truy vấn server đang chạy và tìm thấy đơn `CNV-202611-0A5980` ở `pending`, chưa gán nhân viên. Trang staff chỉ gọi `getMyTasks()` lọc theo staff_id, không gọi API available-bookings có sẵn. Đã thêm danh sách Đơn chờ nhận, nhận ca qua API chiết khấu hiện có và xử lý phản hồi yêu cầu chuyển khoản như luồng cũ. Việc đã giao vẫn có thống kê/bộ lọc riêng.

Nút hủy cũ dùng window.prompt: đã tái hiện bấm nút trên IAB không xuất hiện form. Thay bằng dialog HTML có label, giới hạn lý do, trạng thái gửi/lỗi và chống gửi trùng. Form chi tiết dùng textarea thay prompt. Nút hủy chỉ hiện trước khi đến nơi, theo quy tắc backend hiện có.

Test HTTP phát hiện thêm lỗi in-memory đọc sai vị trí tham số SQL trong updateStaffTaskStatus: ID/staff ID/expectedStatus bị đọc từ tham số CASE/IF, khiến yêu cầu hủy hợp lệ trả 409. Đã sửa vị trí khớp SQL model, giữ kiểm tra nhân viên/trạng thái và cập nhật wage_status/cancel_reason đúng biểu thức SQL. Không đổi SQL sản xuất hoặc quy tắc nghiệp vụ.

API available-bookings trong memory trước đây rơi vào nhánh admin trả tất cả đơn và các trường ngoài SELECT. Đã bổ sung filter trạng thái/người nhận, giới hạn, thứ tự và projection tương ứng SQL hiện có.

## File thay đổi trong lượt sửa này

- `frontend/staff.html`: tích hợp danh sách chờ nhận, form hủy và đồng bộ quyền hủy theo trạng thái.
- `frontend/js/staff-job-actions.js`: render DOM an toàn, gọi nhận ca, dialog hủy và xử lý lỗi.
- `backend/src/config/db.js`: sửa xử lý SELECT available và UPDATE staff task trong memory.
- `backend/test-available-bookings.js`: tái hiện/test bộ lọc và trường trả về.
- `backend/test-staff-cancellation.js`: tái hiện/test HTTP hủy đơn thực qua app, JWT và model memory.
- `ai-module/test/staff-job-actions.test.cjs`: test DOM danh sách, XSS, nhận ca, form hủy và gửi trùng.
- `README.md`: hướng dẫn hiển thị, hủy và kiểm thử.
- `docs/STAFF_JOBS_FIX.md`: báo cáo này.

Không sửa thay đổi có sẵn của người dùng ở trangchu.html. Không cần migration, `.env` hay dependency mới.

## Kiểm thử thực tế

- `node backend/test-available-bookings.js`: PASS cho 3 danh tính staff, chỉ trả việc phù hợp và projection. Trước sửa FAIL do rò trường ngoài SELECT.
- `node backend/test-staff-cancellation.js`: PASS 9 trường hợp HTTP: guest, customer, staff khác, đã đến/đang làm/hoàn tất, lý do thiếu/sai kiểu/quá dài và hủy thành công lưu trạng thái/lý do. Trước sửa DB FAIL 409 thay vì 200.
- `node ai-module/test/staff-job-actions.test.cjs`: PASS danh sách pending, XSS, nhận ca, dialog không prompt, giới hạn lý do sau trim, lỗi API, gửi trùng và callback tải lại.
- `node backend/test-staff-navigation.js`: PASS 17 trường hợp.
- `node ai-module/test/staff-navigation.test.cjs`: PASS kiểm tra GPS/DOM/cú pháp inline.
- `node --check frontend/js/staff-job-actions.js`: PASS.
- Diff whitespace trong phạm vi sửa: PASS.
- Browser IAB thật: đơn người dùng xuất hiện trong Đơn chờ nhận; bấm Hủy mở form. Không gửi hủy đơn người dùng chỉ để test. Ảnh form: `ai-module/.cache/staff-cancel-preview.png` (gitignored).

Các suite hồi quy chạy trên server riêng cổng 5002, mỗi suite khởi động lại dữ liệu test. Chỉ thay địa chỉ cổng trong bản nguồn test nạp vào bộ nhớ; không sửa assertion hoặc file test gốc, không chạm server người dùng ở cổng 5000:

| Suite | Kết quả sau sửa |
| --- | --- |
| test-comprehensive.js | 20 PASS, 1 FAIL khuyến mãi cũ; concurrency đã pass, trước sửa 19/21. |
| test-guest-access.js | 11 PASS, 1 FAIL tạo booking cũ. |
| test-rbac-staff.js | 10/10 PASS; trước sửa 9/10. |
| test-return-url.js | 12 PASS. |
| test-wallet-system.js | FAIL cũ ở Wallet query should succeed. |
| test-job-photos-flow.js | Vẫn FAIL luồng ảnh/nhận ca/thanh toán; chưa xử lý trong phạm vi này. |

## Áp dụng và giới hạn

Đã giữ server người dùng chạy trong lúc sửa để bảo toàn đơn RAM. Sau khi người dùng xác nhận rõ cho phép mất các đơn thử và khởi động lại, đã restart backend, kiểm tra API available live trả đúng một đơn pending demo và không còn các trường riêng ngoài SELECT. Các đơn thử trước restart không còn, đúng cảnh báo đã xác nhận.

MySQL vẫn chưa kết nối. API nhận ca/chiết khấu và hoàn tiền yêu cầu MySQL thật; không vô hiệu hóa kiểm tra này. Test hủy memory chỉ chứng minh trạng thái/lý do và quyền, không chứng minh hoàn chiết khấu. Backend hiện có ghi nhận lỗi hoàn chiết khấu khi memory, cần MySQL để kiểm tra giao dịch thật.

Chưa kiểm thử MySQL thật hoặc clean-install mới (không đổi dependency), không chạy lại AI/model vì không thay AI. Các lỗi baseline về ví, khuyến mãi, tạo booking và luồng ảnh vẫn còn. Không tuyên bố ứng dụng đã an toàn hoặc luồng tài chính đã hoạt động đầy đủ.
