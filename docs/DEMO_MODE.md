# Demo không cần MySQL — 02/11/2026

## Hành vi

Chạy `node server.js` hoặc `npm start` trong `backend/`. Entry point chọn cấu hình demo mặc định khi môi trường chưa đặt hoặc là development và chưa đặt `DEMO_MODE`; mặc định lắng nghe LAN ở cổng 5000. `DEMO_MODE=false` luôn được tôn trọng để chọn luồng MySQL. Production và staging không tự bật demo; `DEMO_MODE=true` ở môi trường ngoài development/test bị từ chối trước khi tạo pool. `npm run demo` vẫn là lệnh bật demo rõ ràng, mặc định localhost. Khởi động demo bỏ hoàn toàn kết nối/migration MySQL.

Ví khách và tín dụng có 1.000.000 VND giả lập ban đầu, ví thu nhập 0 VND. Toàn bộ tiền và giao dịch có nhãn demo, không qua cổng thanh toán. Thao tác validation + trừ ví + gán nhân viên chạy đồng bộ trong một lượt event loop nên các request không thể chen giữa. Retry nhận ca và quyết toán không thu/trả tiền lần hai. Đây không phải bằng chứng về khóa/transaction MySQL.

Hỗ trợ đặt lịch tiền mặt/ví, nhận ca, xem địa chỉ và chỉ đường, tải thông tin ví/lịch sử, topup sandbox khách, hoàn ví khách, quyết toán và chuyển thu nhập giả lập. Giữ RBAC/JWT, state machine và ngưỡng điều kiện nhận việc. Không bật lại API nạp trực tiếp tín dụng vốn bị cấm. Không giả lập giao dịch chuyển khoản ngân hàng thật hoặc rút tiền. Hoàn chiết khấu do lỗi nhân viên bị từ chối; trường hợp khác đánh dấu chờ xét, không tự bịa quy tắc hoàn tiền.

## File sửa/thêm trong lượt demo

| File | Lý do |
| --- | --- |
| backend/demo.js, backend/package.json | Lệnh khởi động demo riêng, từ chối production, localhost mặc định. |
| backend/src/config/demoMode.js | Kiểm tra opt-in và môi trường. |
| backend/src/config/db.js | Tạo store demo trên dữ liệu RAM hiện có, bỏ kết nối SQL khi demo được bật. |
| backend/src/services/demoStore.js | Mô phỏng ví/chiết khấu, nhận ca nguyên tử, thanh toán/hoàn ví, quyết toán, chuyển ví và thông báo khách. |
| backend/src/models/commissionPaymentModel.js | Chỉ dùng store giả lập khi demo đã bật. |
| backend/src/models/walletModel.js | Adapter các hàm ví được hỗ trợ trong demo; chặn rút tiền thật. |
| backend/src/app.js | Health báo demo_mode. |
| backend/src/middleware/errorHandler.js | Demo không lộ stack/SQL qua response dù development. |
| frontend/api.js | Hiển thị nhãn tiền giả lập và dữ liệu RAM theo health server; client không bật được demo. |
| backend/.env.example, README.md | Cấu hình mặc định tắt và hướng dẫn chạy/test/giới hạn. |
| backend/test-demo-mode.js | HTTP thật trên app/process test riêng; không chạm server người dùng. |
| backend/test-demo-store.js | Kiểm tra tính nhất quán ví và thao tác giả lập. |
| docs/DEMO_MODE.md | Báo cáo này. |

Không đổi schema, dependency hoặc khóa bí mật thật. Giữ các thay đổi trước đó, bao gồm chỉnh sửa trangchu.html có sẵn của người dùng.

## Kiểm thử thực tế

- `node backend/test-demo-mode.js`: PASS 20 HTTP cases + hai nhân viên tranh cùng đơn (200/409), retry không trừ ví hai lần, tạo đơn cash/ví, nhận ca/chỉ đường/hủy, hoàn ví, nạp sandbox khách idempotent, chính sách cấm topup tín dụng, production chặn demo và không bật demo khi cờ false. Test chạy trước sửa FAIL vì chưa có store, sau sửa PASS. Xác minh pool=null và mysql_connected=false khi demo.
- `node backend/test-demo-store.js`: PASS từ chối role sai, chọn ngân hàng, thiếu tiền không đổi đơn/ví; validation số tiền; không trừ phí khi đã thu trước; quyết toán/chuyển ví không lặp; sửa snapshot không thay đổi store.
- Test GPS HTTP 17 cases, test hủy HTTP 9 cases, test available cho 3 staff identities: PASS. Hai bộ DOM staff-job-actions và staff-navigation: PASS.
- Node syntax checks demo.js, demoStore.js, api.js: PASS; diff whitespace các file trong phạm vi PASS.
- Browser thật localhost: đã tạo đơn demo `CNV-202611-4BB874` qua API khách, đăng nhập nhân viên, bấm Nhận ca trên UI thành công, đơn vào Công việc của tôi và mở được bản đồ Google. Ví không còn báo lỗi balance. Ảnh kiểm tra: ai-module/.cache/demo-navigation-preview.png (gitignored).
- Hồi quy chạy ngoài demo, từng suite server riêng cổng 5002: comprehensive 20 PASS/1 FAIL khuyến mãi cũ; guest 11 PASS/1 FAIL booking cũ; RBAC 10/10 PASS; return-url 12 PASS. Không đổi assertion hoặc sửa test gốc, chỉ đổi cổng trong nguồn nạp vào process test riêng. Kết quả như trước thay đổi demo.

## Giới hạn

Không có MySQL thật nên chưa kiểm thử transaction/schema/constraint MySQL. Không gọi mô phỏng là tiền thật hoặc sử dụng cho production. Chưa chạy clean-install mới do không đổi dependency, chưa chạy lại AI vì không thay phân tích ảnh. GPS ngoài đường/điện thoại và toàn bộ luồng ảnh trước/sau chưa được kiểm tra end-to-end trong demo này. Lỗi baseline khuyến mãi, guest booking với ngày test cố định, ví ngoài demo và luồng ảnh vẫn nằm ngoài phạm vi.

Đã chuyển server localhost:5000 sang demo mới theo yêu cầu người dùng, dữ liệu RAM phiên cũ không còn. Server demo vẫn chạy để thử tiếp. Các thay đổi tài khoản/booking/ảnh metadata trong RAM mất khi dừng process. Không push Git trong lượt này.
