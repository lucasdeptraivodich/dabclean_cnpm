# 🌿 DabClean - Nền Tảng Dịch Vụ Dọn Vệ Sinh Chuyên Nghiệp (Full-Stack)



### Demo đặt lịch / nhân viên không cần MySQL

Trong thư mục `backend/` của dự án, cài dependency bằng `npm ci` nếu chưa cài, rồi chạy:

```powershell
npm run demo
```

Mở `http://127.0.0.1:5000/login.html`. Khách demo: `demo@nova.app` / `NovaDemo2026!`; nhân viên: `staff@cleanova.vn` / `Staff@Cleanova2026!`. Đặt lịch ở tài khoản khách, đăng nhập nhân viên, mở **Đơn chờ nhận → Nhận ca → Bản đồ / Chỉ đường**. Mỗi ví khách/tín dụng khởi tạo 1.000.000đ giả lập, ví thu nhập bắt đầu 0đ. Giao diện có nhãn DEMO; không chuyển khoản hoặc thanh toán tiền thật.

Demo chỉ bật khi chạy `npm run demo` hoặc khi đặt `DEMO_MODE=true` trong development/test. Demo mặc định nghe `0.0.0.0:5000`; đặt `HOST=127.0.0.1` để chỉ truy cập từ máy này. Dữ liệu demo mất khi dừng hoặc khởi động lại.

Để chạy với MySQL, bỏ `DEMO_MODE` hoặc đặt `DEMO_MODE=false`. Backend kiểm tra kết nối và hoàn tất khởi tạo schema trước khi mở cổng. Nếu khởi tạo MySQL thất bại, backend báo lỗi và thoát. Production yêu cầu `NODE_ENV=production`, secret và cấu hình MySQL; chỉ development/test cho phép bật demo.

Khi khởi động trên schema sổ cái cũ, backend tự đổi tên `balance_after` thành `running_balance` và `note` thành `notes`, giữ các giá trị lịch sử. Các bản ghi mới có thể để trống `balance_before`. Tài khoản MySQL dùng để khởi tạo cần quyền `ALTER` trên các bảng được cập nhật. Số dư trải nghiệm của tài khoản mẫu chỉ được cấp trong development/test.

Demo hỗ trợ nhận ca bằng ví giả lập, đọc ví/lịch sử, thanh toán/hoàn ví khách, quyết toán giả lập, chuyển thu nhập sang tín dụng và hủy theo quyền/trạng thái hiện có. Nhận lại đơn không trừ tiền lần hai; chỉ một nhân viên có thể nhận cùng một đơn. Nhận qua chuyển khoản ngân hàng và rút tiền thật bị chặn. Nạp trực tiếp ví tín dụng vẫn bị vô hiệu hóa theo chính sách hiện có; khởi động lại demo cấp lại tiền giả và xóa toàn bộ dữ liệu RAM. Bản đồ vẫn cần Internet và GPS cần quyền vị trí/HTTPS hoặc localhost.

Kiểm thử từ thư mục gốc:

```powershell
node backend/test-demo-mode.js
node backend/test-demo-store.js
node backend/test-server-demo-default.js
```

Xem [báo cáo demo và giới hạn](docs/DEMO_MODE.md). Không thêm dependency hoặc thay schema.

### Nâng cấp demo cho khách hàng, nhân viên và quản trị

Để dùng `cd backend` rồi `node server.js`, đặt `NODE_ENV=development`, `DEMO_MODE=true` và `HOST=127.0.0.1` trong `backend/.env`. Mở trực tiếp `http://127.0.0.1:5000/demo-features.html` sau khi đăng nhập.

1. **Khách hàng** đặt đơn chọn chuyển khoản QR, mở đơn trên trang demo rồi xác nhận thanh toán giả lập. Đơn hoàn thành và đã thanh toán được tính 1 điểm trên mỗi 10.000 VND thực thu của từng đơn. Mốc hạng demo là 50 điểm cho Vàng và 200 điểm cho Bạch Kim. Có thể chọn nhân viên từng hoàn thành đơn và gửi tin nhắn cho nhân viên phụ trách khi đơn đang hoạt động.
2. **Quản trị** mở phân ca cho đơn đang chờ. Trong 5 phút đầu, lịch tuần hoặc tháng ưu tiên nhân viên quen nếu có. Các trường hợp còn lại ưu tiên nhóm trong 3 km nếu có. Khoảng cách được tính từ vị trí nhân viên giả lập. Sau thời gian ưu tiên, ứng viên còn lại có thể nhận ca.
3. **Nhân viên** nhận ca trong danh sách được mời, chia sẻ GPS hoặc gửi vị trí mẫu và cho khách ký nghiệm thu trên thiết bị. Chat và vị trí cập nhật khoảng 3 giây một lần. ETA là ước tính demo theo đường chim bay. Vị trí biến mất sau 30 giây nếu ngừng cập nhật.
4. **Quản trị** xác minh hồ sơ đối tác hư cấu, xử lý khiếu nại và hoàn một phần hoặc toàn phần giao dịch thanh toán giả lập. Khiếu nại đang mở tạm giữ khoản quyết toán chưa chi. Trang báo cáo hỗ trợ tải Excel XML hoặc lưu PDF qua hộp thoại in.

Các tính năng trên dùng dữ liệu RAM. Chỉ sử dụng hồ sơ và chữ ký giả lập khi trình diễn. Quyền ưu tiên và hạng thành viên demo không thay đổi công thức giá.

Kiểm thử từ thư mục gốc bằng `node backend/test-demo-features.js`.

### Thanh toán đặt lịch bằng VietQR BIDV

Chọn **Chuyển khoản QR → Xác nhận đặt lịch** ở trang đặt lịch vệ sinh hoặc chăm sóc. Hộp xác nhận hiển thị trực tiếp mẫu VietQR `print.svg` cho ngân hàng **BIDV**, tài khoản **8888444265**, số tiền nguyên VND lấy từ `total_price` của đơn đã lưu và nội dung `DABCLEAN <mã đơn không dấu gạch ngang>`. Backend quyết định số tiền và tài khoản nhận.

API tạo đơn và chi tiết đơn bổ sung trường `data.payment_qr`; phương thức khác, đơn đã thanh toán/hoàn tiền/hủy, đơn chờ khảo sát hoặc số tiền không hợp lệ trả `null`. Không đổi schema, dependency hay cấu hình `.env`. Chi tiết người đặt không được gửi tới dịch vụ ảnh QR; Quick Link chỉ chứa tài khoản nhận, số tiền và mã tham chiếu. Ảnh cần Internet; khi tải lỗi vẫn có thông tin chuyển khoản và nút tải lại.

QR chỉ hỗ trợ điền thông tin chuyển khoản, **không tự xác nhận đã nhận tiền**. Chưa tích hợp webhook/đối soát giao dịch ngân hàng cho thanh toán đơn khách hàng; quét QR hoặc đóng hộp QR không làm `payment_status` thành `paid`. Không đặt lại đơn chỉ vì QR tải lỗi. Chế độ demo hiển thị cảnh báo không chuyển tiền thật. Tên chủ tài khoản chưa được xác minh tự động; khách cần kiểm tra người thụ hưởng trên ứng dụng ngân hàng. Tài khoản chiết khấu của nhân viên là luồng riêng, không bị thay đổi.

Có thể mở lại QR tại **Đơn của tôi → Chi tiết đơn**. Mỗi lần mở, giao diện tải chi tiết mới từ backend và hiện QR ngay trong hộp chi tiết nếu đơn chuyển khoản còn chưa thanh toán. Đơn đã hủy/đã trả tiền/hoàn tiền không hiện lại mã yêu cầu thanh toán. Đặt lịch mới chỉ hỗ trợ `cash`, `bank_transfer`, `wallet`; MoMo/VNPAY đã bỏ khỏi form và API tạo đơn, nhưng giữ khả năng hiển thị lịch sử cũ, không sửa/xóa dữ liệu cũ. Bản sửa hủy khách trong demo giữ kiểm tra trạng thái hiện tại, sửa vị trí đọc tham số ID của câu lệnh cập nhật.

Kiểm thử từ thư mục gốc:

```powershell
node backend/test-vietqr.js
node ai-module/test/booking-qr.test.cjs
node backend/test-customer-cancel.js
node ai-module/test/my-bookings-payment.test.cjs
```

Tham khảo [VietQR Quick Link](https://www.vietqr.io/qr-dong), [báo cáo thay đổi](docs/VIETQR_BOOKING.md).

### Chạy backend kèm AI scanner bằng một lệnh

Sau khi đã cài dependency riêng cho `backend/` và `ai-module/`, chỉ cần chạy:

```powershell
cd backend
node server.js
```

Mở `http://localhost:5000/booking.html`. Scanner được mount trực tiếp vào backend, không cần chạy `node server.js` trong `ai-module/` hay mở cổng 5100. 9Router tại địa chỉ cấu hình phải đang hoạt động và có quyền dùng model. Sao chép cấu hình AI mẫu từ `backend/.env.example` sang `backend/.env` khi cần; không commit khóa thật. Kiểm tra luồng khởi động tích hợp bằng `npm run test:ai` trong `backend/`.

### AI scanner qua ChatGPT / 9Router

Scanner dùng `cx/gpt-6.1-sol` qua `http://localhost:20128/v1`, không cần model local hoặc training. Cài dependency riêng trong `ai-module/` bằng `npm ci`, chạy `npm start` trong `backend/` để dùng trên trang đặt lịch cổng 5000; có thể chạy `npm start` trong `ai-module/` để thử riêng cổng 5100.

Cấu hình gateway theo `ai-module/.env.example`; bản tích hợp đọc `backend/.env`. Khóa chỉ lưu ở backend nếu 9Router yêu cầu. Xem [hướng dẫn và kiểm thử](docs/AI_9ROUTER.md).

> **Slogan:**  
> 🇬🇧 *A Cleaner Space, A Better Life.*  
> 🇻🇳 *Không gian sạch hơn, cuộc sống tốt hơn.*

---

## 📖 1. Giới Thiệu Dự Án

**DabClean** là ứng dụng web toàn diện hỗ trợ đặt lịch và quản lý dịch vụ vệ sinh không gian sống và làm việc hiện đại. Dự án được thiết kế theo tiêu chuẩn công nghiệp với kiến trúc phân tầng rõ ràng giữa **Frontend**, **Backend API**, và **Cơ sở dữ liệu (Database)**.

Dự án tuân thủ nghiêm ngặt yêu cầu công nghệ giảng dạy và phát triển:
- **Frontend:** 100% mã nguồn thuần (Pure HTML5, CSS3 hiện đại, Vanilla JavaScript ES6+), hoàn toàn không phụ thuộc vào thư viện bên ngoài (không React/Vue, không Tailwind/Bootstrap, không jQuery).
- **Backend:** Node.js & Express.js RESTful API, xác thực bảo mật JWT (JSON Web Token), mã hóa mật khẩu bằng bcryptjs, hỗ trợ phân quyền người dùng (RBAC).
- **Database:** MySQL quan hệ chuẩn hóa + **chế độ demo in-memory** bật tường minh.

---

## 🗂️ 2. Cấu Trúc Thư Mục Dự Án

Dự án được phân chia mô-đun gọn gàng, trực quan và dễ bảo trì:

```text
dabclean/
├── frontend/                   # Toàn bộ giao diện & logic phía người dùng
│   ├── index.html              # Trang cổng Gateway (kiểm tra phiên & điều hướng)
│   ├── login.html              # Giao diện Đăng nhập DabClean
│   ├── login.css               # Phong cách giao diện Đăng nhập
│   ├── login.js                # Xử lý logic Đăng nhập & chuyển đổi ngôn ngữ VI/EN
│   ├── register.html           # Giao diện Đăng ký tài khoản mới
│   ├── trangchu.html           # Trang chủ (Landing Page) chính thức của DabClean
│   ├── services.html           # Danh mục dịch vụ, tìm kiếm & bộ lọc giá
│   ├── booking.html            # Trang đặt lịch dọn dẹp & ước tính chi phí trực tiếp
│   ├── my-bookings.html        # Trang quản lý lịch sử đơn đặt của khách hàng
│   ├── profile.html            # Trang cá nhân (cập nhật thông tin & đổi mật khẩu)
│   ├── staff.html              # Không gian làm việc riêng cho Nhân viên (Staff Portal)
│   ├── admin.html              # Bảng điều khiển Quản trị viên (Dashboard, Tài khoản, Nhân viên, Đơn đặt)
│   ├── main.css                # CSS giao diện trang chủ & hệ thống Design System
│   ├── app.css                 # CSS bổ trợ cho các trang tính năng mới
│   ├── main.js                 # Hiệu ứng, cuộn mượt, câu hỏi FAQ & Mobile menu
│   └── api.js                  # Client API Adapter kết nối Frontend với Backend
│
├── backend/                    # Mã nguồn máy chủ & RESTful API (Node.js/Express)
│   ├── src/
│   │   ├── config/             # Cấu hình kết nối MySQL & chế độ demo
│   │   │   └── db.js
│   │   ├── controllers/        # Bộ điều khiển xử lý logic nghiệp vụ
│   │   │   ├── authController.js
│   │   │   ├── serviceController.js
│   │   │   ├── bookingController.js
│   │   │   └── adminController.js
│   │   ├── middlewares/        # Middlewares xác thực JWT, phân quyền & xử lý lỗi
│   │   │   ├── authMiddleware.js
│   │   │   └── errorMiddleware.js
│   │   ├── routes/             # Định tuyến API
│   │   │   ├── authRoutes.js
│   │   │   ├── serviceRoutes.js
│   │   │   ├── bookingRoutes.js
│   │   │   └── adminRoutes.js
│   │   └── app.js              # Khởi tạo Express app & phục vụ file tĩnh
│   ├── .env                    # Biến môi trường máy chủ
│   ├── .env.example            # Mẫu biến môi trường
│   ├── package.json            # Thông tin dependencies của backend
│   └── server.js               # Điểm khởi chạy máy chủ Backend
│
├── database/                   # Kịch bản Cơ sở dữ liệu MySQL
│   ├── schema.sql              # Cấu trúc bảng (Users, Services, Bookings, Reviews)
│   └── seed.sql                # Dữ liệu mẫu ban đầu (Admin, Khách hàng, 6 Gói dịch vụ)
│
├── .gitignore                  # Bỏ qua node_modules, log, và file nhạy cảm
└── README.md                   # Tài liệu hướng dẫn toàn diện dự án
```

---

## 👥 3. Tài Khoản Thử Nghiệm (Demo Accounts)

Hệ thống đã chuẩn bị sẵn tài khoản kiểm thử cho cả 3 vai trò (tự động chuyển đúng trang sau khi đăng nhập):

| Vai trò | Email đăng nhập | Mật khẩu | Trang tự động chuyển đến | Quyền hạn & Tác vụ |
| :--- | :--- | :--- | :--- | :--- |
| **Nhân viên (Staff 1)** | `staff@cleanova.vn` | `Staff@Cleanova2026!` | [`staff.html`](http://localhost:5000/staff.html) | Xem việc được giao, timeline lịch trình, cập nhật tiến độ, báo cáo ca trực & đổi mật khẩu |
| **Nhân viên (Staff 2)** | `staff2@cleanova.vn` | `Staff@Cleanova2026!` | [`staff.html`](http://localhost:5000/staff.html) | Tài khoản nhân viên thứ hai để kiểm tra bảo mật phân quyền công việc riêng biệt |
| **Quản trị viên (Admin)** | `admin@cleanova.vn` | `Admin@Cleanova2026!` | [`admin.html`](http://localhost:5000/admin.html) | Toàn quyền xem Dashboard, quản lý tài khoản, phân công việc cho nhân viên, quản lý dịch vụ |
| **Khách hàng (Customer)** | `demo@nova.app` | `NovaDemo2026!` | [`trangchu.html`](http://localhost:5000/trangchu.html) | Xem bảng giá, đặt lịch, quản lý đơn của mình, hủy đơn và quản lý hồ sơ cá nhân |
| **Tài khoản bị khóa (Test)** | `locked@cleanova.vn` | `NovaDemo2026!` | — | Tài khoản bị vô hiệu hóa bởi Admin (bị chặn đăng nhập 403 `ACCOUNT_DEACTIVATED`) |

> 💡 *Bạn cũng có thể tự tạo thêm tài khoản mới bất kỳ lúc nào tại trang [Đăng ký](http://localhost:5000/register.html).*

---

## 🚀 4. Hướng Dẫn Cài Đặt & Khởi Chạy

### Yêu Cầu Tiên Quyết
- [Node.js](https://nodejs.org/) phiên bản 16 trở lên.
- (Tùy chọn) [XAMPP](https://www.apachefriends.org/) hoặc MySQL Server nếu muốn lưu dữ liệu thực tế vào MySQL.

---

### Cách 1: Chạy Full-Stack Đầy Đủ (Khuyến Nghị)

Luồng full-stack yêu cầu MySQL. Dùng `npm run demo` trong `backend/` khi cần chạy với dữ liệu giả lập.

#### Bước 1: Khởi tạo Cơ sở dữ liệu
1. Mở **phpMyAdmin** (XAMPP) hoặc **MySQL Workbench**.
2. Chạy nội dung trong file [`database/schema.sql`](file:///c:/Users/tiend/Downloads/dabclean/database/schema.sql) để tạo cơ sở dữ liệu `cleanova_db` và các bảng.
3. Chạy nội dung trong file [`database/seed.sql`](file:///c:/Users/tiend/Downloads/dabclean/database/seed.sql) để nạp dữ liệu mẫu ban đầu.

#### Bước 2: Khởi động Backend Server
Mở terminal tại thư mục gốc dự án:
```powershell
# 1. Cài đặt thư viện Backend
cd backend
npm install

# 2. (Tùy chọn) Cài đặt thư viện cho AI Module (nếu sử dụng tính năng phân tích ảnh AI)
cd ../ai-module
npm install
cd ../backend

# 3. Khởi chạy máy chủ Backend với MySQL
$env:DEMO_MODE = "false"
npm start
```

Sau khi chạy thành công, console sẽ thông báo:
```text
====================================================
  DABCLEAN BACKEND SERVER IS RUNNING
  - Local URL:    http://localhost:5000
  - API Health:   http://localhost:5000/api/health
  - Services API: http://localhost:5000/api/services
====================================================
```

#### Bước 3: Trải nghiệm ứng dụng
Mở trình duyệt bất kỳ và truy cập:
👉 **[http://localhost:5000](http://localhost:5000)** (tự động mở trang kiểm tra phiên & chuyển tiếp vào Trang Chủ hoặc Đăng Nhập).

---

### Cách 2: Mở Giao Diện Bằng VS Code Live Server (Frontend Độc Lập)

Nếu chỉ muốn xem và chỉnh sửa giao diện Frontend:
1. Mở thư mục `dabclean` bằng **VS Code**.
2. Nhấp chuột phải vào file [`frontend/index.html`](file:///c:/Users/tiend/Downloads/dabclean/frontend/index.html) hoặc [`frontend/login.html`](file:///c:/Users/tiend/Downloads/dabclean/frontend/login.html).
3. Chọn **Open with Live Server**.
4. Frontend sẽ tự động nhận diện nếu Backend chưa chạy và hiển thị thông báo thân thiện.

---

## 🌟 5. Các Tính Năng Đã Hoàn Thiện

### Phía Người Dùng (Khách hàng)
1. **Trang Chủ (Landing Page - `trangchu.html`):**
   - Thiết kế giao diện xanh ngọc bích phong cách Emerald Green (`#10B981`) sang trọng, hiện đại.
   - Nhận diện trạng thái đăng nhập linh hoạt (hiển thị Họ tên người dùng, avatar, nút Đăng xuất).
   - Nút quản trị (Admin) tự động hiển thị trên menu nếu tài khoản đăng nhập là Admin.
   - Giới thiệu 6 gói dịch vụ, bảng so sánh giá, cam kết chất lượng 4 tiêu chuẩn, đánh giá khách hàng (Testimonials) và câu hỏi thường gặp (FAQ Accordion).
2. **Đăng Nhập & Đăng Ký (`login.html` & `register.html`):**
   - Hỗ trợ song ngữ **VI / EN** tức thì không cần tải lại trang.
   - Validate form trực tiếp (định dạng email, độ dài mật khẩu, xác nhận mật khẩu khớp).
   - Tích hợp gọi API Backend xác thực JWT và lưu trữ thông tin phiên an toàn.
3. **Danh Mục Dịch Vụ (`services.html`):**
   - Hiển thị đầy đủ các gói dịch vụ vệ sinh được lấy trực tiếp từ database qua REST API.
   - Thanh tìm kiếm theo từ khóa dịch vụ theo thời gian thực (Real-time Search).
   - Modal xem chi tiết thông tin gói và nút chuyển tiếp sang trang Đặt lịch.
4. **Đặt Lịch Dọn Dẹp (`booking.html`):**
   - Tự động nhận diện gói dịch vụ được chọn từ trang chủ/dịch vụ.
   - Tính toán ước lượng chi phí tức thì dựa theo diện tích không gian ($m^2$).
   - Nhập thời gian, địa chỉ, ghi chú đặc biệt và lựa chọn phương thức thanh toán (Tiền mặt / Chuyển khoản).
5. **Quản Lý Đơn Đặt (`my-bookings.html`):**
   - Xem toàn bộ danh sách đơn đặt của chính tài khoản đang đăng nhập.
   - Bộ lọc theo trạng thái: Tất cả, Chờ xác nhận, Đã duyệt, Hoàn thành, Đã hủy.
   - Cho phép người dùng bấm **Hủy lịch** đối với các đơn đang ở trạng thái chờ duyệt.
6. **Hồ Sơ Cá Nhân (`profile.html`):**
   - Xem và cập nhật họ tên, số điện thoại, địa chỉ mặc định.
   - Chức năng đổi mật khẩu có kiểm tra mật khẩu hiện tại và mã hóa bảo mật.

### Phía Quản Trị Viên (Admin)
1. **Bảng Điều Khiển Quản Trị (`admin.html`):**
   - Thống kê tổng quan: Tổng doanh thu, Tổng số đơn đặt, Đơn chờ xử lý, Tổng số thành viên.
   - **Quản lý đơn đặt:** Xem thông tin khách hàng, số điện thoại, địa chỉ, dịch vụ, ngày làm việc, tổng tiền và cập nhật trạng thái đơn (Chờ duyệt ➔ Đã duyệt ➔ Đang làm ➔ Hoàn thành ➔ Hủy).
   - **Quản lý danh mục dịch vụ:** Thêm mới gói dịch vụ, chỉnh sửa tên/mô tả/giá tiền, bật/tắt trạng thái hiển thị.
   - **Danh sách người dùng:** Theo dõi danh sách tài khoản đã đăng ký trên hệ thống.

---

## 📡 6. Danh Mục RESTful API Chi Tiết

Tất cả các API đều có tiền tố `/api` và trả về kết quả dưới định dạng JSON chuẩn:

### Xác thực & Người dùng (`/api/auth`)
- `POST /api/auth/register` : Đăng ký tài khoản mới (mã hóa mật khẩu bằng bcrypt).
- `POST /api/auth/login` : Đăng nhập & trả về JSON Web Token (JWT).
- `GET /api/auth/profile` : Lấy thông tin tài khoản hiện tại (*Yêu cầu Token*).
- `PUT /api/auth/profile` : Cập nhật họ tên, SĐT, địa chỉ (*Yêu cầu Token*).
- `PUT /api/auth/change-password` : Đổi mật khẩu tài khoản (*Yêu cầu Token*).

### Dịch vụ vệ sinh (`/api/services`)
- `GET /api/services` : Lấy danh sách tất cả dịch vụ đang hoạt động.
- `GET /api/services/:id` : Lấy thông tin chi tiết một dịch vụ.

### Đơn đặt lịch (`/api/bookings`)
- `POST /api/bookings` : Tạo yêu cầu đặt lịch dọn dẹp mới (*Yêu cầu Token*).
- `GET /api/bookings/my` : Lấy danh sách đơn đặt của người dùng hiện tại (*Yêu cầu Token*).
- `GET /api/bookings/notifications` : Lấy tối đa 50 thông báo trong ứng dụng của khách hàng đang đăng nhập (*Yêu cầu Token*).
- `PATCH /api/bookings/notifications/:notificationId/read` : Đánh dấu thông báo của chính khách hàng đã đọc (*Yêu cầu Token*).
- `GET /api/bookings/:id` : Lấy chi tiết đơn đặt cụ thể (*Yêu cầu Token*).
- `PUT /api/bookings/:id/cancel` : Hủy đơn trước khi nhân viên đến, gửi lý do trong JSON `reason` (*Yêu cầu Token*).
- `POST /api/bookings/:id/review` : Gửi đánh giá dịch vụ và nhân viên (`rating`, `staff_rating`, `comment`) sau khi hoàn thành.
- `POST /api/bookings/:id/tip` : Ghi nhận tip tự nguyện từ 1.000 đến 1.000.000 VNĐ cho nhân viên được giao; khoản tip được thanh toán trực tiếp với nhân viên.

### Hệ thống Hai Ví & Sổ cái Nhân viên (`/api/wallet`) - *DabClean Two-Wallet System*
- `GET /api/wallet/staff/wallets` : Lấy số dư chi tiết của Ví Tín Dụng (Credit Wallet) và Ví Thu Nhập (Earnings Wallet), kèm trạng thái điều kiện nhận đơn (`eligible`).
- `GET /api/wallet/staff/eligibility` : Kiểm tra điều kiện nhận đơn (yêu cầu số dư ví tín dụng `creditBalance >= 100.000 VNĐ`).
- `POST /api/wallet/staff/topup-credit` : Nạp tiền trực tiếp vào Ví Tín Dụng (hỗ trợ sandbox và bù nợ âm tự động).
- `POST /api/wallet/staff/transfer` : Chuyển tiền từ Ví Thu Nhập sang Ví Tín Dụng để duy trì quyền nhận đơn mà không tạo doanh thu sàn.
- `POST /api/wallet/withdraw` : Tạo lệnh rút tiền từ Ví Thu Nhập về tài khoản ngân hàng của nhân viên.
- `GET /api/wallet/transactions` : Lấy lịch sử sổ cái biến động của từng ví với bộ lọc phân loại.

### Nhân viên (`/api/staff`) - *Yêu cầu Token Staff/Admin*
- `GET /api/staff/available-bookings` : Danh sách việc chờ nhận theo quy tắc hiện có; giao diện hiển thị đơn `pending` chưa có nhân viên ở mục **Đơn chờ nhận**, tách khỏi việc đã được giao. Bấm Nhận ca dùng API thanh toán chiết khấu hiện có, cần MySQL thật; không giả lập nhận ca thành công khi database lỗi.
- `GET /api/staff/tasks/:id/navigation` : Địa chỉ chỉ đường cho nhân viên được giao (hoặc admin), chỉ khi đơn ở `confirmed`, `arrived`, `in_progress`. Đơn chờ nhận/đã kết thúc trả 409; không đúng nhân viên trả 403.
- `PATCH /api/staff/tasks/:id/status` : Nhân viên xác nhận nhận việc (`confirmed` - kiểm tra nghiêm ngặt `creditBalance >= 100.000 VNĐ`), báo đã đến (`arrived`), hoàn thành (`completed` - tự động khấu trừ chiết khấu sàn từ ví tín dụng).
- `GET /api/staff/tasks/:id/checklist` : Lấy danh sách khu vực, ảnh Before/After và tiến độ từng góc chụp.
- `POST /api/staff/tasks/:id/photos` : Tải ảnh JPEG lên dạng `multipart/form-data` (tối đa 8 MB sau nén), kèm `areaName`, `angleId`, `stage`, `capturedAt`, `latitude`, `longitude`.
- `POST /api/staff/tasks/:id/cash-payment` : Ghi nhận thu tiền mặt sau khi hoàn tất ảnh After; giao diện yêu cầu nhân viên vuốt thanh xác nhận.

Khách nhập địa chỉ đầy đủ khi đặt dịch vụ, không cần bật GPS hoặc ghim bản đồ. Sau khi nhận đơn thành công, nhân viên mở **Bản đồ / Chỉ đường** trong thẻ công việc. Bản đồ dùng địa chỉ đã lưu của khách; nút **Dùng GPS của tôi** chỉ lấy vị trí nhân viên làm điểm xuất phát, không thay địa chỉ khách. GPS chỉ được yêu cầu khi bấm nút; cần HTTPS hoặc localhost và quyền vị trí. Nếu từ chối quyền hoặc định vị lỗi, vẫn có thể mở Google Maps và chọn điểm xuất phát. Không lưu vị trí nhân viên vào database. Bản đồ cần Internet; kết quả theo địa chỉ cần đối chiếu số nhà/căn hộ với khách nếu chưa rõ. GPS của ảnh công việc Before/After được giữ nguyên.

Kiểm thử riêng thay đổi bản đồ, từ thư mục gốc (cài dependency `backend/` và `ai-module/` theo hướng dẫn phía trên):

```powershell
node backend/test-staff-navigation.js
node ai-module/test/staff-navigation.test.cjs
```

Test HTTP dùng router và middleware JWT thật với model giả lập; không thay thế kiểm thử MySQL. Test DOM dùng dependency phát triển `linkedom` có sẵn trong `ai-module/`. Thay đổi bản đồ không yêu cầu migration, biến `.env` hay dependency mới.

Nút **Hủy công việc** mở form lý do 5–500 ký tự ngay trong trang, không dùng hộp thoại `prompt`. Nhân viên chỉ có thể hủy trước khi đến nhà khách (`assigned`, `confirmed`), theo kiểm tra hiện có ở backend. Form chi tiết cũng có ô lý do hủy. Kiểm thử bổ sung từ thư mục gốc:

```powershell
node backend/test-available-bookings.js
node backend/test-staff-cancellation.js
node ai-module/test/staff-job-actions.test.cjs
```

Hai test backend bổ sung sử dụng dữ liệu in-memory riêng trong process test và không chạm dữ liệu server đang chạy. Kết quả này không xác minh MySQL hoặc transaction chiết khấu/hoàn tiền.

### Quản trị viên (`/api/admin`) - *Yêu cầu Token có quyền Admin*
- `GET /api/admin/stats` : Lấy số liệu thống kê Dashboard: phân tách Tiền mặt vs Trực tuyến và 6 chỉ số Quản trị Hai Ví Nhân Viên DabClean.
- `GET /api/admin/staff-wallets` : Lấy danh sách toàn bộ nhân viên kèm số dư Ví Tín Dụng, Ví Thu Nhập, nợ tín dụng và trạng thái đủ điều kiện (`creditBalance >= 100.000 VNĐ`).
- `PUT /api/admin/bookings/:id/assign` : Gán đơn cho nhân viên (kiểm tra điều kiện `creditBalance >= 100.000 VNĐ`, từ chối nếu không đủ).
- `POST /api/admin/bookings/:id/payout` : Quyết toán thù lao và khấu trừ hoa hồng đơn hàng idempotent.
- `GET /api/admin/bookings` : Lấy toàn bộ đơn đặt lịch trong hệ thống.
- `PUT /api/admin/bookings/:id/status` : Cập nhật trạng thái đơn đặt lịch.
- `POST /api/admin/services` : Thêm mới gói dịch vụ.
- `PUT /api/admin/services/:id` : Cập nhật thông tin gói dịch vụ.
- `DELETE /api/admin/services/:id` : Xóa hoặc ẩn gói dịch vụ.
- `GET /api/admin/users` : Lấy danh sách thành viên hệ thống.

---

## 🛡️ 7. Bảo Mật & Tiêu Chuẩn Kỹ Thuật

- **Mật khẩu an toàn:** Mật khẩu được băm 10 vòng muối (salt rounds) bằng thư viện `bcryptjs`. Không lưu mật khẩu thô trong cơ sở dữ liệu.
- **Xác thực JWT:** Token có thời hạn sử dụng được mã hóa bằng Secret Key cấu hình trong file `.env`.
- **Bảo vệ Endpoint:** Middleware kiểm tra token trước khi cho phép gọi các API cần quyền hạn; phân quyền chặt chẽ giữa `customer` và `admin`.
- **Quy trình công việc:** Admin phân công đơn ở trạng thái `assigned`; nhân viên xác nhận, báo đã đến, tải ảnh Before/After, xác nhận tiền mặt bằng thao tác vuốt rồi gửi hoàn tất. Lý do hủy của nhân viên là bắt buộc và được lưu cùng đơn.
- **Báo cáo ảnh công việc:** Cổng nhân viên yêu cầu ảnh Before cho mỗi khu vực trước khi bắt đầu và ảnh After khớp từng góc trước khi hoàn thành. Ảnh được nén JPEG trên trình duyệt, lưu dưới `backend/uploads/job-photos/` và chỉ nhân viên được phân công (hoặc Admin) mới tải xem được qua API; metadata thời gian chụp, thời gian nhận trên máy chủ và GPS được lưu trong bảng `booking_job_photos`.
- **Đánh giá & tip:** Khách hàng có thể chấm sao dịch vụ và nhân viên sau khi đơn hoàn tất, đồng thời gửi tip tùy chọn. Ứng dụng chỉ ghi nhận số tiền tip; chưa tích hợp cổng thanh toán tip trực tuyến.
- **Thông báo trong ứng dụng:** Khi nhân viên xác nhận nhận đơn, khách hàng nhận được thông báo kèm mã đơn, dịch vụ, lịch hẹn, địa chỉ và thông tin nhân viên. Thông báo được lưu idempotent, hiển thị trong trang `my-bookings.html`, cập nhật định kỳ và chỉ chủ tài khoản mới được đọc/đánh dấu đã đọc.
- **MySQL:** Khi khởi động, ứng dụng mở rộng enum trạng thái đơn và bổ sung các cột lý do hủy, thời điểm đến/thu tiền, tiền tip và đánh giá nhân viên cho schema hiện có.
- **Giới hạn xác minh:** GPS và thời điểm chụp lấy từ trình duyệt/thiết bị, không phải bằng chứng chống giả mạo tuyệt đối. Trong môi trường triển khai thực tế cần HTTPS, quyền riêng tư phù hợp và dịch vụ lưu trữ ảnh có kiểm soát truy cập/sao lưu.
- **CORS & HTTP Headers:** Cấu hình bảo mật chia sẻ tài nguyên nguồn gốc chéo giúp frontend kết nối an toàn.
- **Kết nối MySQL:** Lỗi truy vấn được trả về qua trình xử lý lỗi của backend. Dữ liệu tiếp tục dùng MySQL khi kết nối phục hồi.

---

## 👨‍💻 8. Hướng Dẫn Dành Cho Thầy/Cô & Người Đánh Giá

1. Để chạy thử bằng dữ liệu demo, mở terminal tại thư mục `backend` và chạy `npm run demo`.
2. Mở trình duyệt tại **`http://localhost:5000`**.
3. Đăng nhập bằng tài khoản `admin@cleanova.vn` / `Admin@Cleanova2026!` để kiểm tra toàn bộ quyền Admin Dashboard & Quản trị Hệ thống Hai Ví Nhân Viên DabClean.
4. Mở thêm cửa sổ ẩn danh và đăng nhập bằng tài khoản `staff@cleanova.vn` / `Staff@Cleanova2026!` để trải nghiệm Cổng Nhân Viên: Quản lý Hai Ví (Ví Tín Dụng & Ví Thu Nhập), nạp ví tín dụng, chuyển tiền giữa 2 ví, kiểm tra điều kiện nhận đơn (`creditBalance >= 100.000 VNĐ`).
5. Chạy bộ kiểm thử tự động toàn diện cho hệ thống Hai Ví Nhân Viên DabClean:
   ```bash
   node backend/test-two-staff-wallets.js
   ```
6. Kiểm tra mã nguồn: Tất cả các file trong `frontend/` và `backend/` đều được chú thích tiếng Việt chi tiết, cấu trúc chuẩn mực, không dùng framework cồng kềnh.

---
*DabClean © 2026. All rights reserved. A Cleaner Space, A Better Life.*
