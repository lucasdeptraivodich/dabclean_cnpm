# Đối chiếu và nâng cấp tính năng DabClean

## Khiếu nại và bồi thường demo theo sơ đồ

- **Khách → Lịch sử đơn → Chi tiết đơn → Gửi hoặc xem khiếu nại**. Đơn hoàn thành có hạn gửi 48 giờ. Khách đính kèm JPEG/PNG hoặc MP4/WebM tối đa 1 MB. Khi mở khiếu nại, hệ thống gắn cờ và giữ phần thù lao chưa chi, đồng thời thông báo cho admin và nhân viên.
- **Nhân viên → Công việc của tôi → Xem khiếu nại** để mở đơn hoàn thành và nộp bản tường trình. Với đơn đang làm, mở trang của đơn từ liên kết nhắn tin. **Quản trị → Khiếu nại / Hồ sơ đối tác → Chọn đơn** xem bằng chứng, bản tường trình và ảnh trước/sau, rồi lưu phán quyết.
- Bác khiếu nại sẽ giải ngân phần thù lao đang giữ nếu đơn đã hoàn thành. Thiệt hại dưới 500.000đ được bồi thường vào ví demo khách từ ví thu nhập, rồi ví tín dụng nhân viên, và trừ 10 điểm tín nhiệm. Từ 500.000đ đến 50 triệu đồng, nhân viên chịu 500.000đ và tạm dừng nhận ca, phần còn lại được ghi là chi trả bảo hiểm giả lập. Khoản trên 50 triệu đồng hoặc thiếu số dư để khấu trừ cần xem xét thủ công.
- Khoản thù lao đã chi trước khi mở khiếu nại không bị đóng băng hồi tố. Ví, điểm tín nhiệm và bảo hiểm đều là dữ liệu demo trong RAM. Đã chạy 140 ca HTTP demo. Chưa thử video bằng chứng trên trình duyệt thật.

## Đặt trước khi nhân viên đang bận

- **Đặt lịch → Nhân viên ưu tiên** kiểm tra ca đang xác nhận, đã đến hoặc đang làm. Khi bận, khách chọn **Chọn Nhân Viên Khác** hoặc **Đặt Lịch Trước**. Lịch đặt trước chờ phản hồi trong 30 phút. Trong thời gian chờ, đơn không hiển thị QR và không trừ ví khách. Luồng demo hỗ trợ tiền mặt và chuyển khoản.
- **Nhân viên → Lịch đặt trước** xác nhận hoặc từ chối kèm lý do. Khi xác nhận, khách nhận thông báo và được phép thanh toán giả lập. Nếu nhân viên vẫn bận, hệ thống thử nhận ca đã xác nhận sau khi họ hoàn thành ca hiện tại qua cổng nhân viên.
- **Lịch sử đơn → Chi tiết đơn → Theo dõi lịch đặt trước** hiển thị lý do từ chối hoặc hết hạn. Khách có thể yêu cầu điều phối nhân viên rảnh, chọn người khác hoặc hủy đơn. Hết hạn được tính từ timestamp khi trang tải lại dữ liệu.
- Đợt này dùng trạng thái đặt trước riêng trong bộ nhớ demo và giữ trạng thái đơn gốc là `pending` đến khi thực sự phân công. Chưa thêm schema MySQL hoặc xác thực khuôn mặt thật. Đã chạy 119 ca HTTP demo.

## Cập nhật ưu đãi, nghiệm thu và đối chiếu ảnh demo

- **Đặt lịch → Tóm tắt đơn** hiển thị ưu đãi thành viên nếu được áp dụng. Demo dùng các mốc hiện có, 50 điểm cho Vàng giảm 5% và 200 điểm cho Bạch Kim giảm 10%. Không cộng dồn với voucher hoặc ưu đãi định kỳ. Khi không có voucher, backend lấy mức cao hơn giữa hạng thành viên và tần suất. Giá sàn và tiền công tiếp tục theo quy tắc hiện có.
- **Nhân viên → Công việc của tôi → Ký nghiệm thu** mở canvas của đơn đang làm. Backend yêu cầu chữ ký trước khi nhân viên hoặc admin hoàn thành đơn vệ sinh sau xây dựng, chăm sóc người cao tuổi hoặc người bệnh trong demo.
- **Quản trị → Khiếu nại / Hồ sơ đối tác → Xem ảnh trước / sau** tính sai khác màu cho ảnh đã ghép theo khu vực và góc chụp. Chỉ số dùng để hỗ trợ xem ảnh. Chưa có căn chỉnh góc, đánh giá độ sạch hoặc quyết định giải ngân từ ảnh.
- Đã chạy 98 ca HTTP demo, gồm báo giá khớp đơn đã lưu, không cộng ưu đãi định kỳ và chặn hoàn thành trước khi ký. Kiểm thử DOM VietQR và bản đồ đạt. Chưa kiểm tra ảnh thật và chữ ký cảm ứng trên thiết bị.

## Hồ sơ và lựa chọn nhân viên demo

- **Nhân viên → Hồ sơ cá nhân → Xác thực khuôn mặt nhân viên** ghi trạng thái xác thực mô phỏng. Chức năng không mở camera, thu ảnh hoặc đối chiếu sinh trắc học.
- **Đặt lịch → Nhân viên ưu tiên** chọn một nhân viên đang hoạt động. Người được chọn có 5 phút ưu tiên nhận ca. Nếu hết thời gian mà chưa nhận, ca mở cho nhân viên khác theo quy tắc demo.
- **Lịch sử đơn → Chi tiết đơn** hiển thị hồ sơ người được chọn hoặc người đã nhận ca, số ca đã hoàn thành, điểm đánh giá nếu có và trạng thái xác thực mô phỏng. Khách có thể yêu thích nhân viên đã nhận ca ngay ở đây.
- **Lịch sử đơn** có danh sách **Nhân viên đã từng làm cho mình** và **Nhân viên yêu thích**. Dữ liệu lấy từ đơn đã hoàn thành và các lựa chọn của tài khoản khách.

Đã kiểm thử 84 ca HTTP demo, gồm quyền xem hồ sơ, giới hạn trường dữ liệu, xác thực mô phỏng và ưu tiên nhận ca. Các trạng thái demo lưu trong RAM. Không cần migration, dependency hoặc biến môi trường mới.

## Bổ sung demo

| Tính năng | Vị trí và hành vi hiện tại |
| --- | --- |
| Thanh toán và tự mở phân ca | **Trang demo khách → chọn đơn QR chưa trả → Xác nhận thanh toán giả lập**. Đơn chờ chưa có nhân viên tự mở lời mời theo quy tắc ưu tiên hiện có. Nhân viên thấy lời mời ở **Ca được mời theo khoảng cách**. |
| Đặt lại theo tuần | **Trang demo khách → chọn đơn vệ sinh đã hoàn thành đủ điều kiện → Đặt lại theo tuần**. Khách chọn ngày cho một lần đặt mới, giữ giờ và dịch vụ của đơn gốc. Backend tính lại giá. Chưa có bộ lập lịch tạo nhiều đơn tự động. |
| Ảnh chat | **Nhắn tin / Theo dõi di chuyển** hoặc **Nhắn tin / Chia sẻ vị trí → Ảnh đính kèm → Gửi ảnh**. Trình duyệt nén ảnh sang JPEG. Mỗi hội thoại demo nhận tối đa 10 ảnh. |
| Báo cáo chi tiết | **Quản trị → Khiếu nại / Hồ sơ đối tác → Xuất sổ cái và chiết khấu**. Chọn ngày bắt đầu, ngày kết thúc và loại báo cáo để tải CSV mở bằng Excel. |
| eKYC và hợp đồng mẫu | **Quản trị → Khiếu nại / Hồ sơ đối tác → Xác minh đối tác mẫu**. Thực hiện mô phỏng OCR, ký hợp đồng mẫu rồi xác minh. Dữ liệu OCR lấy từ hồ sơ hư cấu có sẵn. |

Đã chạy lại bộ demo store và **70 ca HTTP demo**, gồm quyền xuất báo cáo, trả CSV, đặt lại theo tuần, ảnh chat, tự mở phân ca và thứ tự duyệt hồ sơ mẫu. Chưa thử các thao tác mới trực tiếp trên trình duyệt. Dữ liệu vẫn ở RAM. Không thêm migration, dependency hay biến môi trường.

Còn thiếu trong phạm vi demo gồm giảm giá theo hạng, tự tạo chuỗi đơn định kỳ, ETA theo tuyến đường, điều kiện bắt buộc ký nghiệm thu, đối chiếu ảnh tự động và model local dưới 2 giây. Docker Compose, object storage và giám sát tập trung cũng chưa được triển khai.

Ngày rà soát · 12/11/2026

## Khách hàng

| Yêu cầu | Hiện trạng và vị trí trên web | Phần còn thiếu |
| --- | --- | --- |
| Thanh toán trực tuyến | Có QR BIDV với số tiền và mã đơn do backend tạo. Mở ở **Đặt lịch → Chuyển khoản QR** hoặc **Lịch sử đơn → Chi tiết đơn → Mã Thanh Toán**. Trang `/demo-features.html` có xác nhận thanh toán giả lập. | Chưa có webhook/IPN đã xác thực cho thanh toán đơn khách và tự mở phân ca sau khi đối soát. Webhook chiết khấu nhân viên là luồng riêng. |
| Thành viên | Bản demo tính 1 điểm mỗi 10.000 VND thực thu trên từng đơn hoàn thành. Hạng và điểm nằm ở `/demo-features.html` khi đăng nhập khách. | Chưa lưu điểm trên MySQL hoặc áp dụng giảm 5–10% vào báo giá. Cần chốt mức giảm theo hạng và quy tắc cộng với voucher. |
| Nhân viên yêu thích và lịch định kỳ | Khách chọn nhân viên từng hoàn thành đơn trên `/demo-features.html`. Khi quản trị mở phân ca demo, đơn tuần hoặc tháng ưu tiên nhân viên đã chọn. | Chưa giới hạn theo đánh giá 5 sao hoặc tự tạo chuỗi đơn trên MySQL. |
| Chat 1–1 | **Lịch sử đơn → Chi tiết đơn → Nhắn tin / Theo dõi di chuyển** trên đơn demo đã có nhân viên và đang hoạt động. Chat văn bản cập nhật qua Socket.IO. | Chưa hỗ trợ đính kèm ảnh hoặc lưu hội thoại trên MySQL. |

## Nhân viên và đối tác

| Yêu cầu | Hiện trạng và vị trí trên web | Phần còn thiếu |
| --- | --- | --- |
| Theo dõi di chuyển | **Nhân viên → Công việc của tôi → Nhắn tin / Chia sẻ vị trí**. Khách xem qua chi tiết cùng đơn. Cập nhật qua Socket.IO khi chia sẻ GPS hoặc gửi vị trí mẫu. | ETA dùng khoảng cách đường chim bay. Chưa có ETA theo tuyến đường hoặc lưu trên MySQL. GPS trình duyệt cần HTTPS hoặc localhost. |
| Ký nghiệm thu | Canvas ký trên `/demo-features.html` khi nhân viên chọn đơn đang làm hoặc đã hoàn thành. | Chưa bắt buộc chữ ký trước khi hoàn thành theo từng loại dịch vụ hoặc lưu biên bản trên MySQL. |
| Phân ca theo bán kính | **Quản trị → Khiếu nại / Hồ sơ đối tác → chọn đơn chờ → Mở phân ca theo khoảng cách**. Demo dùng Haversine, vị trí mẫu và cửa sổ ưu tiên 5 phút. Nhân viên thấy lời mời trên `/demo-features.html`. | Chưa có vị trí nhân viên sẵn sàng nhận ca trên MySQL, cơ chế tự mở phân ca hoặc gửi lời mời nền theo bán kính. |

## Quản trị

| Yêu cầu | Hiện trạng và vị trí trên web | Phần còn thiếu |
| --- | --- | --- |
| Báo cáo Excel/PDF | **Quản trị → Báo cáo doanh thu & tài chính → Tải Excel hoặc In / Lưu PDF**. Có bộ lọc thời gian và báo cáo tổng hợp. | Chưa có file sao kê từng bút toán ví và từng khoản hoa hồng theo tháng/quý. |
| eKYC và hợp đồng | **Quản trị → Khiếu nại / Hồ sơ đối tác → Xác minh đối tác mẫu**. Có thêm quy trình duyệt hồ sơ đối tác hiện hành ở trang quản trị. | Chưa tích hợp OCR CCCD, xác minh giấy tờ thật hay ký hợp đồng điện tử. |
| Khiếu nại và hoàn tiền | Khách gửi khiếu nại ở trang demo. Admin vào **Quản trị → Khiếu nại / Hồ sơ đối tác → chọn đơn** để xem ảnh trước/sau nếu có, xử lý khiếu nại và hoàn giao dịch giả lập. Khiếu nại mở tạm giữ quyết toán demo chưa chi. Backend đã có luồng hoàn ví riêng cho đơn đủ điều kiện. | Chưa có ticket bền vững trên MySQL, hoàn tiền qua nhà cung cấp thanh toán hoặc nhật ký đối soát ticket production. |

## AI và hạ tầng

| Yêu cầu | Hiện trạng | Phần còn thiếu |
| --- | --- | --- |
| AI dưới 2 giây | **Đặt lịch → Phân tích phòng** dùng AI V3.2 qua 9Router. Một lần đo API với một ảnh tổng hợp đạt 8,5 giây. | Chưa có model nhẹ INT8 chạy local với benchmark tốc độ và chất lượng. |
| Đối chiếu ảnh tự động | Checklist nhân viên ghép Before/After theo khu vực và mã góc. Admin có thể xem cặp ảnh khi xử lý khiếu nại demo. | Chưa tự căn chỉnh ảnh, đánh giá độ sạch hoặc dùng AI làm điều kiện giải ngân. |
| Docker Compose | Chạy qua `cd backend` và `node server.js`. Backend hiện mount route AI V3.2 cùng tiến trình. | Chưa có cấu hình Compose đã kiểm thử với ba dịch vụ và volume ảnh. |
| Object storage | Ảnh công việc hiện lưu cục bộ và tải qua API có kiểm tra quyền. | Chưa có bucket, adapter lưu ảnh hoặc URL ký tạm thời. |
| Giám sát tập trung | Backend có log cục bộ. | Chưa tích hợp APM, hệ thống gom log hoặc điểm nhận cảnh báo Telegram/Slack. |

## Thay đổi đợt này

- Thêm đường dẫn theo từng đơn từ trang khách và nhân viên, cùng lối vào xử lý khiếu nại trên trang quản trị. Các nút này xuất hiện khi bật demo. Chat và GPS dùng Socket.IO để gửi tín hiệu làm mới đến khách và nhân viên của đơn. Nội dung chat và vị trí được đọc qua API đã kiểm tra quyền. Nếu mất kết nối Socket.IO, trang quay về làm mới theo chu kỳ.
- Thêm nút xem ảnh trước/sau khi xử lý khiếu nại. Ảnh dùng cùng API xác thực với checklist nhân viên.
- Đã chạy 58 ca HTTP demo và kiểm tra Socket.IO với hai người trong đơn và một nhân viên ngoài đơn. Kiểm thử DOM VietQR và chỉ đường đều đạt. Chưa xác minh tải ảnh khiếu nại trên trình duyệt với ảnh thật, GPS trên điện thoại hoặc các tích hợp production.
- Đợt này không yêu cầu migration, dependency hoặc biến môi trường mới. Thanh toán thật, eKYC, lưu trữ đám mây và cảnh báo tập trung cần cấu hình nhà cung cấp tương ứng. Các thay đổi nghiệp vụ như giảm giá theo hạng và chặn hoàn thành khi thiếu chữ ký cần thống nhất chính sách trước khi triển khai.
