# Báo cáo nâng cấp DabClean

**Ngày tổng hợp** · 12/11/2026
**Phạm vi** · Khởi động backend, ba phân hệ demo, thương hiệu, thanh toán VietQR và hiệu năng AI V3.2.

## 1. Khởi động và dữ liệu

- Backend chỉ mở cổng sau khi MySQL kết nối và hoàn tất khởi tạo schema. Khi không kết nối được, thiếu database hoặc thiếu bảng cần thiết, tiến trình dừng trước khi nhận request.
- Demo dùng dữ liệu RAM khi bật `DEMO_MODE=true` trong development/test. Production từ chối demo và không cấp số dư trải nghiệm vào ví.
- Migration sổ cái đổi `balance_after` thành `running_balance` và `note` thành `notes`. Dữ liệu lịch sử được giữ, còn bản ghi mới có thể để trống `balance_before`. Tài khoản MySQL cần quyền `ALTER` để chạy migration tự động.
- Trong demo, khách hủy được hoàn chiết khấu vào ví tín dụng của nhân viên theo chính sách hiện có. Nhân viên tự hủy thì khoản chiết khấu được giữ lại. Yêu cầu lặp không tạo giao dịch hoàn thứ hai.

## 2. Tính năng demo theo vai trò

| Vai trò | Nội dung đã triển khai |
| --- | --- |
| Khách hàng | Xác nhận thanh toán giả lập trên trang demo, tích điểm theo số tiền thực thu của đơn hoàn thành, chọn nhân viên quen và chat với nhân viên phụ trách. Hệ thống tính 1 điểm trên mỗi 10.000 VND của từng đơn, với mốc 50 điểm cho hạng Vàng và 200 điểm cho Bạch Kim. |
| Nhân viên | Xem và nhận lời mời theo khoảng cách, chia sẻ GPS hoặc gửi vị trí mẫu, lưu chữ ký nghiệm thu trên màn hình. Chat và vị trí cập nhật khoảng 3 giây một lần. |
| Quản trị | Mở phân ca, duyệt hồ sơ đối tác mẫu, xử lý khiếu nại, tạm giữ khoản quyết toán chưa chi và hoàn một phần hoặc toàn bộ khoản thanh toán giả lập. Báo cáo tài chính dùng bộ lọc thời gian của dashboard, tải dưới dạng Excel XML hoặc lưu PDF qua hộp thoại in. |

Khi quản trị mở phân ca, lịch tuần và tháng ưu tiên nhân viên quen đã chọn. Nếu không có nhân viên quen đủ điều kiện, ca ưu tiên ứng viên trong 3 km theo vị trí mẫu. Thời gian ưu tiên là 5 phút. Hạng thành viên chưa áp dụng giảm giá.

Các liên kết “Tính năng demo cho…” đã được gỡ khỏi trang đơn của khách, trang nhân viên và trang quản trị. Trang riêng vẫn truy cập trực tiếp tại `/demo-features.html` sau khi đăng nhập.

## 3. Thương hiệu và truy cập LAN

- Tên hiển thị đã thống nhất thành **DabClean** trong giao diện, thông báo, báo cáo và tài liệu. Email liên hệ và đăng nhập cũ, mã voucher, tên schema và khóa tương thích phiên đăng nhập vẫn dùng các định danh hiện hành.
- Cấu hình cục bộ `HOST=0.0.0.0` cho phép truy cập từ LAN. API demo đã phản hồi tại `172.17.152.220:5000` khi kiểm tra từ máy chạy backend. Chưa xác minh truy cập từ thiết bị thứ hai.

## 4. Thanh toán VietQR

- Sau khi đặt đơn chuyển khoản thành công, hộp xác nhận hiển thị ảnh VietQR **BIDV 8888444265** theo mẫu `print.svg`. Backend điền số tiền và nội dung chuyển khoản theo đơn đã lưu.
- Trong **Lịch sử đơn → Chi tiết đơn**, nút **Mã Thanh Toán** cho đơn đủ điều kiện mở lại cùng hộp QR. Nút **Đóng** đưa khách về chi tiết đơn.
- Đã gỡ nút **Mở thanh toán demo** khỏi hộp QR và bỏ nhãn **DEMO**. Khi chạy dữ liệu mẫu, hộp vẫn hiện **Không chuyển tiền thật**. Việc mở hoặc quét QR chưa xác nhận đã nhận tiền. Chưa tích hợp webhook đối soát ngân hàng.

## 5. Tối ưu AI V3.2 qua 9Router

- Giao diện hiển thị **Đang xử lý N ảnh...** theo số ảnh đã chọn. Nếu phân tích lỗi, người dùng thấy **AI chưa hoạt động**. Khóa 9Router nằm trong cấu hình backend cục bộ.
- Model `cx/gpt-6.1-sol` gửi yêu cầu với mức suy luận `low`. Khi có nhiều ảnh hợp lệ, backend gửi tối đa ba ảnh đồng thời và sau đó tổng hợp kết quả. Ảnh trùng và ảnh không đạt chất lượng được lọc trước khi gọi model.
- Một lần đo toàn bộ API với **một ảnh tổng hợp qua 9Router thật** mất **8,5 giây**. Mốc này đạt mục tiêu khoảng 10 giây trong lần thử. Thời gian còn phụ thuộc vào ảnh, số ảnh và tải của gateway. Chưa đo độ trễ nhiều ảnh trên gateway thật.

## 6. Kết quả kiểm thử đã ghi nhận

| Hạng mục | Kết quả |
| --- | --- |
| Khởi động và migration trên MySQL 8.0 tạm | Đạt các ca kết nối, bảo toàn dữ liệu sổ cái, từ chối khởi động khi thiếu database/bảng hoặc kết nối bị từ chối. Bộ chiết khấu đạt 18/18 ca. |
| Tính năng demo | Đạt 56 ca HTTP, gồm phân quyền, thanh toán và hoàn tiền, chống hoàn trùng, phân ca và đối chiếu số liệu báo cáo. |
| Giao diện và thương hiệu | Đạt 22 tiêu chí trang chủ, đăng nhập ba vai trò và kiểm tra thương hiệu trên 10 trang HTTP. Chrome headless đã kiểm tra giao diện ba vai trò và tạo Excel XML. |
| VietQR | Đạt 7 ca HTTP và kiểm thử DOM cho hộp QR khi đặt lịch và mở lại từ lịch sử đơn. URL VietQR trả HTTP 200 với kiểu ảnh SVG. |
| AI V3.2 | Đạt 31/31 ca và kiểm thử khởi động backend. Kiểm thử gateway mô phỏng xác nhận hai ảnh hợp lệ được gửi song song và ảnh trùng không tạo thêm lượt gọi. |
| GPS đặt lịch | Bộ test cũ đạt 3/6 ca. Ba lỗi còn lại liên quan đến lưu tọa độ, kiểm tra đầu vào và mock VietQR. Khi đơn thiếu tọa độ đích, demo dùng điểm đến mẫu và ghi rõ trên giao diện. |

Các kết quả trên được tổng hợp từ những lần chạy kiểm thử trong quá trình nâng cấp. Chưa kiểm tra trên dữ liệu production thực tế, chưa thử chữ ký trên thiết bị cảm ứng thật và chưa lưu PDF qua hộp thoại in trên trình duyệt thật.

## 7. Chạy thử

Từ thư mục gốc dự án, sau khi cài các dependency hiện có và cấu hình `backend/.env` cho demo:

```powershell
cd backend
node server.js
```

Mở `http://127.0.0.1:5000` hoặc địa chỉ Wi-Fi hiện tại của máy chạy backend khi truy cập qua LAN. Khởi động lại sẽ xóa dữ liệu phát sinh trong RAM. Các nâng cấp này không thêm dependency mới. Tùy chọn `AI_V32_ROUTER_REASONING_EFFORT=default` có thể dùng để quay về mức suy luận của gateway.

**Tài liệu liên quan** · [Hướng dẫn demo](DEMO_MODE.md) · [VietQR](VIETQR_BOOKING.md) · [AI qua 9Router](AI_9ROUTER.md)
