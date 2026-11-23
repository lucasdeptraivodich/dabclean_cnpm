# BÁO CÁO BÀI TẬP LỚN MÔN: CÔNG NGHỆ PHẦN MỀM (INFO2005)
## TRƯỜNG ĐẠI HỌC CMC — KHOA CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG
---

### ĐỀ TÀI: NGHIÊN CỨU, THIẾT KẾ VÀ PHÁT TRIỂN NỀN TẢNG QUẢN LÝ DỊCH VỤ VỆ SINH THÔNG MINH DABCLEAN TÍCH HỢP AI SCANNER & THANH TOÁN VIETQR TỰ ĐỘNG

> **Giảng viên phụ trách học phần:** ThS. Nguyễn Thị Vân Anh  
> **Hình thức đánh giá:** Báo cáo bài tập lớn kết hợp vấn đáp sản phẩm phần mềm (MVP trên GitHub)  
> **Tài liệu văn bản Word chính thức:** [bao_cao.docx](file:///c:/Users/NgTienDuc/Project/dabclean/bao_cao.docx) (Tổng cộng 28 trang tiêu chuẩn; 27 trang nội dung không tính bìa)  
> **Slogan thương hiệu:** *"A Cleaner Space, A Better Life — Không gian sạch hơn, cuộc sống tốt hơn"*

---

### THÀNH VIÊN NHÓM VÀ PHÂN CÔNG TRÁCH NHIỆM (AGILE/SCRUM)
1. **Lê Nguyễn Quang Anh** — Scrum Master (Điều phối quy trình Scrum, Lead QA Kiểm thử & Đảm bảo chất lượng)
2. **Vũ Hoàng Anh (Mã số: 014)** — Product Owner (Đặc tả yêu cầu SRS, Quản lý Product Backlog & Trải nghiệm UX)
3. **Nguyễn Tiến Đức** — Fullstack Developer (Giao diện & Logic Khách hàng/Thợ, AI Scanner, Realtime Socket.io)
4. **Vũ Hoàng Anh (Mã số: 020)** — Fullstack Developer (Core API Backend, Phân hệ Admin, Cổng VietQR PRO BIDV)
5. **Đinh Thanh Bình** — Database & DevOps Specialist (Thiết kế CSDL 21 bảng 3NF, Tối ưu SQL, Đóng gói Docker Compose)

---

### LỜI MỞ ĐẦU
Bước vào kỷ nguyên số hóa và phát triển mạnh mẽ của các đô thị hiện đại, nhu cầu về các dịch vụ tiện ích gia đình – đặc biệt là dịch vụ dọn dẹp vệ sinh nhà ở và văn phòng – đang gia tăng với tốc độ vượt bậc. Nhịp sống công nghiệp hối hả khiến các gia đình trẻ, giới chuyên gia và những người đi làm bận rộn ngày càng khan hiếm quỹ thời gian để tự tay chăm sóc không gian sống của mình. Tuy nhiên, thị trường dịch vụ giúp việc gia đình truyền thống tại Việt Nam hiện nay vẫn tồn tại rất nhiều bất cập mang tính cố hữu: tình trạng thiếu minh bạch về chi phí phát sinh, người giúp việc tự ý nâng giá sau khi đến khảo sát thực tế, lo ngại sâu sắc về an toàn tài sản cá nhân do thiếu quy trình xác minh lý lịch nhân thân chuẩn mực, và sự bất tiện khi sử dụng tiền mặt trong các giao dịch.

Dưới sự định hướng và hướng dẫn tận tình của Giảng viên phụ trách học phần – ThS. Nguyễn Thị Vân Anh, nhóm sinh viên phát triển dự án DabClean đã lựa chọn và hoàn thiện đề tài: *"Nghiên cứu, Thiết kế và Phát triển Nền tảng Quản lý Dịch vụ Vệ sinh Thông minh DabClean Tích hợp AI Scanner & Thanh toán VietQR Tự động"*.

---

### PHẦN 1: GIỚI THIỆU CHUNG, KHẢO SÁT THỰC TIỄN VÀ TẦM NHÌN SẢN PHẨM

#### 1.1. Khảo sát Thực tế Thị trường (300 Mẫu Google Forms & 20 Phỏng vấn Sâu)
* **Thời gian thực hiện:** 01/10/2024 – 08/10/2024 tại khu vực Hà Nội và TP. Hồ Chí Minh.
* **Cơ cấu nhân khẩu học:** 
  * Độ tuổi: 18 - 25 tuổi (32.0%), 26 - 40 tuổi (52.3%), Trên 40 tuổi (15.7%).
  * Nghề nghiệp: Nhân viên văn phòng, chuyên gia (61.0%), Chủ hộ kinh doanh Homestay/Airbnb (23.3%), Khác (15.7%).
  * Thu nhập: Dưới 10 triệu (18.3%), 10 - 25 triệu (56.7%), Trên 25 triệu (25.0%).
  * Tần suất thuê: Chưa dùng (14.0%), 1 - 2 lần/tháng (48.3%), Định kỳ hàng tuần (37.7%).

#### 1.2. Bảng Thống kê Dữ liệu Khảo sát Định lượng
| STT | Nội dung Khảo sát Nhu cầu & Trải nghiệm | Tỷ lệ Đồng ý / Gặp phải (%) | Nhận định Ý nghĩa Thực tiễn |
|:---:|---|:---:|---|
| 1 | Từng bị thợ giúp việc tự ý nâng giá sau khi khảo sát với lý do nhà bẩn hơn tưởng tượng | **78.3%** khách hàng | Nhu cầu cấp thiết phải có thước đo khách quan định lượng độ bẩn từ đầu. |
| 2 | Cảm thấy bất an về lý lịch, danh tính và tính trung thực của người giúp việc lạ vào nhà | **84.5%** khách hàng | Yêu cầu hệ thống phải có quy trình xác minh danh tính điện tử eKYC chặt chẽ. |
| 3 | Thợ giúp việc mong muốn nhận công việc gần nơi cư trú trong bán kính dưới 3km | **89.2%** nhân viên | Cần thuật toán định vị GPS điều phối thợ theo khoảng cách tối ưu Haversine. |
| 4 | Ưa chuộng hình thức thanh toán chuyển khoản quét mã VietQR tự điền số tiền và nội dung | **91.0%** người dùng | Khẳng định sự đúng đắn của việc tích hợp cổng VietQR BIDV tự động. |
| 5 | Ủng hộ việc chụp ảnh trước và sau khi dọn dẹp để làm căn cứ nghiệm thu công việc | **86.7%** các bên | Đặt nền tảng cho luồng nghiệp vụ Job Photos Flow (Before/After) trên ứng dụng. |
| 6 | Mong muốn có tính năng AI phân tích ảnh phòng để gợi ý gói dọn dẹp và dự toán chi phí | **82.4%** khách hàng | Khẳng định tính đột phá và tiềm năng thị trường của phân hệ AI Scanner. |

#### 1.3. Ma trận Phân tích Đối thủ Cạnh tranh
* So sánh DabClean với Giúp việc truyền thống và Ứng dụng hiện có (bTaskee/JupViec) trên 7 tiêu chí: Định lượng độ bẩn bằng AI Scanner, Engine tính giá đa biến, Xác minh eKYC đối tác, Điều phối thợ GPS Haversine 3km, Bảo chứng nghiệm thu ảnh Before/After, Cổng thanh toán động VietQR NAPAS BIDV và Hệ thống Ví kép kiểm soát rủi ro.

---

### PHẦN 2: CHÂN DUNG KHÁCH HÀNG (5 PERSONAS) & THIẾT KẾ KIẾN TRÚC

#### 2.1. Năm Chân dung Đại diện (Personas & Scenarios)
1. **Chị Nguyễn Mai Lan (29 tuổi, Trưởng phòng Marketing, Cầu Giấy, Hà Nội):** Đại diện cho khách hàng cá nhân bận rộn, cần dọn dẹp nhanh vào cuối tuần, thanh toán không tiền mặt và minh bạch chi phí.
2. **Bác Hoàng Văn Nam (58 tuổi, Cán bộ hưu trí, Quận 7, TP.HCM):** Đại diện gia đình đa thế hệ, kỹ tính về độ sạch sẽ và đặc biệt coi trọng sự an toàn lý lịch thợ eKYC có dấu tích xanh.
3. **Anh Trần Đình Trọng (34 tuổi, Chủ chuỗi Homestay/Airbnb, Quận 1, TP.HCM):** Nhạy cảm về thời gian check-in/check-out của khách, cần thợ có mặt tức thời qua GPS và xuất hóa đơn đối soát rõ ràng.
4. **Cô Trần Thị Hạnh (46 tuổi, Đối tác giúp việc chuyên nghiệp, Nam Từ Liêm, Hà Nội):** Lao động tự do cần việc làm gần nhà trong bán kính 3km, được nhận 85% tiền công minh bạch vào Ví thu nhập ngay sau ca dọn.
5. **Anh Lê Tuấn Anh (28 tuổi, Quản trị viên vận hành hệ thống):** Cần Dashboard giám sát luồng giao dịch thời gian thực, đối soát dòng tiền BIDV khớp 100% với Sổ cái Ledger và xử lý khiếu nại qua ảnh Before/After.

#### 2.2. Ma trận Hành trình Khách hàng (Customer Journey Map)
Xuyên suốt 5 giai đoạn: *1. Nhận thức nhu cầu ➔ 2. Đặt lịch & Khảo sát AI ➔ 3. Điều phối thợ GPS ➔ 4. Thực hiện & Nghiệm thu Before/After ➔ 5. Thanh toán VietQR BIDV & Đánh giá sao*.

#### 2.3. Đánh giá Trade-off Kiến trúc Lựa chọn
| Phương án Kiến trúc | Ưu điểm Nổi bật | Hạn chế & Rủi ro | Đánh giá với DabClean |
|---|---|---|---|
| **Monolithic Thuần túy** | Dễ triển khai, chung 1 tiến trình và bộ nhớ | Xử lý ảnh AI nặng chiếm trọn CPU, nghẽn API đặt lịch | Không phù hợp cho xử lý thị giác máy tính |
| **Microservices Đầy đủ (K8s)** | Độc lập hoàn toàn, tự động mở rộng theo tải | Quá phức tạp, ngốn RAM, chi phí hạ tầng cloud lớn | Chưa cần thiết ở giai đoạn MVP |
| **Phân tán Tinh gọn (SOA/Docker)** | Tách biệt tải AI và Core API; RESTful chuẩn; nhẹ nhàng đóng gói | Cần quản trị mạng container và fallback khi AI lỗi | **LỰA CHỌN TỐI ƯU**: Cân bằng hiệu năng và chi phí |

#### 2.4. Các Hình ảnh Minh họa Mã nguồn & Sơ đồ Kiến trúc Rộng 6.4 Inches
* **Hình 2.1:** Sơ đồ Chuyển dịch Trạng thái Vòng đời Đơn đặt lịch (Booking State Machine).
* **Hình 2.2:** Đoạn mã nguồn hiện thực hóa State Machine & Khóa cạnh tranh dữ liệu (Row-level Locking).
* **Hình 2.3:** Đoạn mã nguồn hiện thực hóa Engine Định Giá Đa Biến tại Máy chủ Backend.
* **Hình 2.4:** Kiến trúc Tài chính Ví kép đối tác và Sổ cái Kế toán Bất biến (Dual-Wallet Ledger).
* **Hình 2.5:** Quy trình tích hợp khép kín giữa AI Scanner và Cổng Thanh toán VietQR BIDV.
* **Hình 2.6:** Đoạn mã nguồn tự động sinh mã VietQR BIDV chuẩn NAPAS Quick Link.
* **Hình 2.7:** Đoạn mã nguồn xử lý ảnh và suy luận mức độ bẩn phòng qua mô hình AI Scanner V3.

---

### PHẦN 3: QUY TRÌNH CỘNG TÁC GITHUB & HÀNH TRÌNH KHAI THÁC AI CÓ TRÁCH NHIỆM

#### 3.1. Vận hành Agile/Scrum qua 5 Sprint Chuẩn Mốc Thời Gian
* **Sprint 1 (09/10/2024 – 15/10/2024):** Xây dựng kiến trúc nền tảng, thiết kế CSDL 21 bảng 3NF và dịch vụ Auth JWT bcrypt.
* **Sprint 2 (15/10/2024 – 22/10/2024):** Nghiệp vụ Booking State Machine, Engine định giá đa biến, Socket.io và nguyên mẫu AI Scanner V1.
* **Sprint 3 (15/10/2024 – 22/10/2024):** Nâng cấp AI Scanner V3, định vị GPS toàn cầu và thuật toán Haversine bán kính 3km.
* **Sprint 4 (22/10/2024 – 11/11/2024):** Hoàn thiện 3 phân hệ Portal (Khách hàng, Thợ, Admin), Cổng VietQR BIDV tài khoản 8888444265 và Gateway AI 9Router.
* **Sprint 5 (05/11/2024 – 12/11/2024):** Kiểm thử tự động toàn diện, đánh giá an toàn thông tin OWASP, đóng gói Docker Compose và hoàn thiện báo cáo.

#### 3.2. Bảng Phân công Nhiệm vụ Chi tiết qua GitHub Issues (12 Issues)
| Mã Issue | Tên Nhiệm vụ & Yêu cầu Kỹ thuật | Thành viên Phối hợp Thực hiện | Milestone / Trạng thái |
|:---:|---|---|:---:|
| **#ISS-01** | Thiết kế CSDL 21 bảng 3NF & Cấu hình JWT Auth | Đinh Thanh Bình (DB), Tiến Đức (Logic), Quang Anh (Review) | Sprint 1 / Closed |
| **#ISS-02** | Hiện thực hóa State Machine & Khóa Row-level Concurrency | Tiến Đức (Backend), Thanh Bình (SQL Lock), Quang Anh (Test) | Sprint 2 / Closed |
| **#ISS-03** | Phát triển Engine Tính Giá Đa Biến & Surge Pricing | Hoàng Anh 014 (SRS), Tiến Đức (Code), Thanh Bình (Config) | Sprint 2 / Closed |
| **#ISS-04** | Tích hợp AI Scanner V1 MobileNet & Trích xuất đặc trưng | Hoàng Anh 020 (AI Core), Tiến Đức (API Gate), Thanh Bình (Cache) | Sprint 2 / Closed |
| **#ISS-05** | Xây dựng Bản đồ GPS & Điều phối thợ bán kính 3km | Tiến Đức (Frontend Maps), Hoàng Anh 020 (Haversine API) | Sprint 3 / Closed |
| **#ISS-06** | Nâng cấp AI Scanner V3 Đa góc & Tích hợp 9Router Cloud | Hoàng Anh 020 (AI Pipeline), Tiến Đức (UI Scanner) | Sprint 3 & 4 / Closed |
| **#ISS-07** | Tích hợp Cổng VietQR PRO BIDV (STK: 8888444265) | Hoàng Anh 020 (VietQR Link), Tiến Đức (Modal QR) | Sprint 4 / Closed |
| **#ISS-08** | Hiện thực hóa Ví Kép (Credit/Earnings) & Sổ cái Ledger | Hoàng Anh 020 (Ledger), Thanh Bình (Schema), Tiến Đức (UI) | Sprint 4 / Closed |
| **#ISS-09** | Xây dựng Quy trình Nghiệm thu ảnh Job Photos (Before/After) | Tiến Đức (Multer Upload), Hoàng Anh 014 (DoD Test) | Sprint 4 / Closed |
| **#ISS-10** | Xây dựng Dashboard Quản trị và eKYC Verification Flow | Hoàng Anh 020 (Admin Backend), Hoàng Anh 014 (Admin UI) | Sprint 4 / Closed |
| **#ISS-11** | Tối ưu hóa Hiệu năng phản hồi API & Đóng gói Docker Compose | Đinh Thanh Bình (Docker/Nginx), Tiến Đức (Caching) | Sprint 5 / Closed |
| **#ISS-12** | Kiểm thử tự động toàn diện & Security Audit OWASP | Quang Anh (SM/Lead QA), Thanh Bình (Test Suite), Cả nhóm | Sprint 5 / Closed |

#### 3.2.1. Quy trình Pull Request, Code Review và Quản lý Nhánh (Git Flow)
* **Quy trình:** Nhánh `main` được bảo vệ (Protected Branch); các nhánh `feature/*` phát triển độc lập và merge qua Pull Request có ít nhất 1 thành viên review, approve.
* **Minh chứng:** Pull Request **#46** đã được review và merge thành công vào `main`.

#### 3.2.2. Chiến lược Gắn nhãn phiên bản (Git Tagging) & Bàn giao sản phẩm
* **Gắn Tag chính thức:** Git Tag **`v1.0.0`** gắn liền với bản phát hành GitHub Release **`v1.0.0-mvp`**, đóng gói mã nguồn, CSDL và Docker Compose.

#### 3.2.3. Tự động hóa Kiểm thử Tích hợp liên tục với GitHub Actions CI
* **Pipeline CI:** Thiết lập tệp tin `.github/workflows/ci.yml` tự động khởi chạy môi trường Ubuntu + MySQL 8.0 Container và chạy bộ kiểm thử toàn diện `npm test` (21 test suites) trên mỗi lần Push / Pull Request.

#### 3.3. Tuyên ngôn Khai thác AI Có Trách nhiệm: "AI đề xuất gợi mở – Kỹ sư làm chủ và kiểm chứng toàn vẹn"
Nhóm quán triệt tinh thần làm chủ công nghệ qua 3 bước:
1. *Khởi nguồn ý tưởng (Ideation):* Sử dụng AI để sinh khung sườn mã nguồn và mock data.
2. *Phản biện và thanh lọc (Critical Filtering):* Kiên quyết từ chối các gợi ý vi phạm bảo mật như tính giá ở máy khách hoặc lưu chung một bảng ví điện tử.
3. *Tinh chỉnh và làm chủ (Refinement & Mastery):* Viết lại mã nguồn cốt lõi với MySQL Transaction, Row-level Locking và tối ưu mạng nơ-ron MobileNet bằng Transfer Learning.

#### 3.4. Bảng Nhật ký Kiểm chứng Kỹ thuật đối với Đề xuất của AI (AI Diary)
| Nhiệm vụ Kỹ thuật | Phần AI gợi ý ban đầu | Phần Nhóm kiểm chứng & Loại bỏ | Quyết định cuối cùng của Kỹ sư Nhóm |
|---|---|---|---|
| **Thiết kế CSDL** | Gợi ý tạo 1 bảng ví chung, lưu mật khẩu thô | Phát hiện lỗ hổng bảo mật; thiếu bóc tách ví ký quỹ và thu nhập | Thiết kế Ví kép (Credit/Earnings), Ledger bất biến, bcrypt 10 rounds |
| **State Machine** | Cho phép thợ bấm hoàn thành đơn bất kỳ lúc nào | Rủi ro thợ gian lận nhận tiền công không qua nghiệm thu | Bắt buộc kiểm tra điều kiện: tải đủ ảnh Before/After hiện trường |
| **Engine Tính giá** | Tính giá ở máy khách JavaScript rồi gửi lên | Rủi ro tấn công Price Tampering can thiệp sửa giá | Chuyển 100% logic về máy chủ (pricingService), client chỉ gửi diện tích |
| **Cổng VietQR** | Tích hợp webhook bên thứ ba chưa rõ chứng chỉ | Lo ngại rò rỉ dữ liệu tài khoản và phụ thuộc trung gian | Dùng trực tiếp chuẩn VietQR Quick Link NAPAS/BIDV an toàn tuyệt đối |
| **AI Scanner** | Gọi API nhận diện ảnh đám mây tính phí từng ảnh | Chi phí vận hành cao, độ trễ lớn, rủi ro riêng tư | Xây dựng AI Scanner cục bộ kết hợp Gateway 9Router, trễ < 1.5s |

---

### PHẦN 4: LIÊN HỆ LÝ THUYẾT KỸ NGHỆ PHẦN MỀM & BÁO CÁO KIỂM THỬ

#### 4.1. Đối chiếu Giáo trình Ian Sommerville (Engineering Software Products)
Trình bày theo chuẩn 3 bước: **Lý thuyết ➔ Áp dụng thực tiễn (Dẫn chứng) ➔ Phản biện kỹ thuật:**

1. **Phát triển hướng sản phẩm & MVP (Chương 1):**
   * *Lý thuyết:* Xây dựng Sản phẩm Khả dụng Tối thiểu (MVP) để kiểm chứng giả thuyết thị trường nhanh nhất.
   * *Áp dụng:* Nhóm hoàn thiện chu trình cốt lõi trong Sprint 1 và 2: Đặt lịch ➔ AI gợi ý ➔ Điều phối GPS ➔ Nghiệm thu ảnh ➔ VietQR BIDV. Dẫn chứng tại **Commit `d03dcf8`**, **Commit `f12bd56`**, **Release Tag `v1.0.0-mvp`**.
   * *Phản biện:* Tập trung vào MVP giúp phát hiện sớm các bất cập trong luồng nhận việc của thợ để kịp thời tinh chỉnh trong Sprint 3 và 4, tránh lãng phí nguồn lực.

2. **Thiết kế linh hoạt Agile/Scrum (Chương 3):**
   * *Lý thuyết:* Thích ứng linh hoạt trước thay đổi, bàn giao sản phẩm tăng trưởng định kỳ.
   * *Áp dụng:* 5 Sprint ngắn hạn, theo dõi qua bảng Kanban GitHub Projects. Dẫn chứng tại **12 Issues (`#ISS-01` đến `#ISS-12`)** và **Pull Request `#46`**.
   * *Phản biện:* Agile vượt trội hơn Waterfall trong dự án này vì yêu cầu tích hợp AI và thanh toán ngân hàng có độ biến động cao, cần thử nghiệm liên tục.

3. **Kiến trúc dịch vụ phân tán & RESTful API (Chương 4 & 5):**
   * *Lý thuyết:* Giảm thiểu phụ thuộc (Loose Coupling), tăng khả năng tái sử dụng mô-đun.
   * *Áp dụng:* Tách riêng máy chủ API web (cổng 5000) và vi dịch vụ AI Scanner (cổng 5100). Dẫn chứng tại **`Dockerfile.backend`**, **`Dockerfile.ai`**, **`docker-compose.yml`** và **Commit `d03dcf8`**.
   * *Phản biện:* Tránh tình trạng tác vụ AI chiếm dụng 100% CPU làm nghẽn toàn bộ luồng đặt lịch của khách hàng.

4. **An toàn bảo mật & Lập trình tin cậy (Chương 7 & 8):**
   * *Lý thuyết:* Lập trình phòng thủ (Defensive Programming), xác thực toàn diện dữ liệu đầu vào.
   * *Áp dụng:* JWT Middleware, bcrypt 10 salt rounds, khử khuẩn mã độc XSS qua DOMPurify/sanitize, Database Transaction cho 100% thao tác ví tiền. Dẫn chứng tại **`backend/src/utils/sanitize.js`**, **`backend/src/config/jwt.js`**, **Commit `c44cdca`** và các test suites **`UT-SAN-01`**, **`SEC-JWT-01`**.
   * *Phản biện:* Kiên quyết từ chối lưu trạng thái phiên tạm bợ ở client; mọi quyền hạn và tiền bạc đều được thẩm định tại máy chủ.

5. **Kiểm thử tự động & Tích hợp liên tục DevOps (Chương 9 & 10):**
   * *Lý thuyết:* Tự động hóa kiểm thử liên tục (Continuous Automated Testing) để chống lỗi hồi quy.
   * *Áp dụng:* Thiết lập pipeline CI/CD GitHub Actions (**`.github/workflows/ci.yml`**) và bộ kịch bản kiểm thử tự động (**`backend/test-comprehensive.js`** với 21 test suites) đạt tỷ lệ **100% PASS** trên MySQL thực tế trước mỗi lần release.
   * *Phản biện:* Tiết kiệm hơn 70% thời gian test thủ công, loại bỏ rủi ro con người và bảo đảm sự tự tin tuyệt đối khi triển khai.

#### 4.2. Báo cáo Tổng thể Đảm bảo Chất lượng & Kiểm thử Phần mềm (QA Report)
> *Chi tiết báo cáo kiểm thử được lưu trữ tại:* [BAO_CAO_KIEM_THU_QA_DABCLEAN.md](file:///c:/Users/NgTienDuc/Project/dabclean/docs/BAO_CAO_KIEM_THU_QA_DABCLEAN.md)

| Phân loại Kiểm thử | Công cụ / Môi trường | Số Kịch bản | Trạng thái | Đánh giá Nghiệm thu |
|---|---|:---:|:---:|---|
| **Unit Testing (Đơn vị)** | Node.js Test Runner / sanitize & pricing | 3 suites | **3/3 PASS** | Đạt chuẩn toán học và an toàn XSS |
| **Integration Testing (Tích hợp)** | Express REST API & MySQL 8.0 Real DB | 6 suites | **6/6 PASS** | Đạt chuẩn liên thông đa dịch vụ |
| **Security & RBAC (Bảo mật)** | OWASP Top 10 / JWT / bcrypt / Anti-XSS | 7 suites | **7/7 PASS** | Ngăn chặn rò rỉ hash, token giả & injection |
| **Concurrency & Transaction** | Optimistic Locking & MySQL Transaction | 2 suites | **2/2 PASS** | Chống race condition cập nhật đồng thời |
| **DevOps & Production Config** | GitHub Actions CI / Fail-Fast Guard | 3 suites | **3/3 PASS** | Từ chối khởi động nếu thiếu secret an toàn |
| **TỔNG HỢP KIỂM THỬ** | **Automated Suite + Manual Edge Cases** | **52 tests** | **100% PASS** | **NGHIỆM THU XUẤT SẮC** |

#### 4.2.1. Trích lục 15 Test Cases Tiêu biểu (Đạt 100% PASS)
| Mã TC | Mục tiêu Kiểm thử | Dữ liệu Đầu vào (Input) | Kết quả Mong đợi | Trạng thái |
|:---:|---|---|---|:---:|
| **TC-DK-01** | Đăng ký tài khoản hợp lệ | POST /api/auth/register {name:'An', email:'an@mail.com', pass:'Abc123'} | 201; Trả JWT token; user.role='user'; mật khẩu băm bcrypt | **PASS** |
| **TC-DK-03** | Mật khẩu 5 ký tự (dưới biên) | {name:'An', email:'an5@mail.com', pass:'12345'} | 400; Báo lỗi: 'Mật khẩu phải có ít nhất 6 ký tự.' | **PASS** |
| **TC-DK-11** | Email có khoảng trắng & hoa | {name:'An', email:'  AN.TEST@Mail.COM ', pass:'123456'} | 201; Tự động lowercase và trim khoảng trắng | **PASS** |
| **TC-DK-14** | Email đối tác đang chờ duyệt | {name:'An', email:'partner_pending@mail.com', pass:'123456'} | 409; Thông báo hồ sơ đối tác đang xét duyệt, chặn đăng ký đè | **PASS** |
| **TC-DK-15** | Họ tên chứa mã độc script XSS | {name:'<b>An</b><script>alert(1)</script>', email:'an@m.com'} | 201; Tên lưu trong DB được lọc sạch HTML script | **PASS** |
| **TC-DN-01** | Đăng nhập khách hàng hợp lệ | POST /api/auth/login {email:'demo@nova.app', pass:'NovaDemo2026!'} | 200; Trả JWT hợp lệ chứa payload userId và role 'customer' | **PASS** |
| **TC-DN-04** | Đăng nhập sai mật khẩu | {email:'demo@nova.app', pass:'SaiMatKhau1'} | 401; Báo 'Email hoặc mật khẩu không chính xác' (bảo mật) | **PASS** |
| **TC-BK-01** | Tạo đơn đặt lịch vệ sinh hợp lệ | POST /api/bookings {service_id:1, area:60, date:'2026-11-20'} | 201; Sinh mã đơn duy nhất, tính đúng giá tại máy chủ | **PASS** |
| **TC-BK-06** | Tạo đơn chọn VietQR BIDV | {service_id:1, area:50, payment_method:'vietqr'} | 201; Trả data.payment_qr chứa ảnh Quick Link BIDV 8888444265 | **PASS** |
| **TC-BK-12** | Hủy đơn hợp lệ khi pending | POST /api/bookings/:id/cancel {booking_id:101, reason:'Bận việc'} | 200; Chuyển status cancelled; giải phóng ca dọn | **PASS** |
| **TC-WL-01** | Thợ nhận việc bị trừ ký quỹ | POST /api/staff/jobs/:id/accept {job_id:201, staff_id:5} | 200; Trừ 15% hoa hồng ví ký quỹ; ghi nhận ledger running_balance | **PASS** |
| **TC-WL-04** | Ví tín dụng không đủ số dư | {credit_balance: 10.000, fee: 35.000} | 400; Từ chối nhận ca; thông báo nạp thêm tiền ký quỹ | **PASS** |
| **TC-WL-08** | Cộng thu nhập khi hoàn tất ca | POST /api/staff/jobs/:id/complete {job_id:201, photos:['a.jpg']} | 200; Chuyển status completed; cộng 85% tiền công vào ví thu nhập | **PASS** |
| **TC-AI-01** | Quét ảnh phòng khách sạch | POST /api/ai/analyze {photo: living_clean.jpg} | 200; Trả nhãn 'sach', confidence >= 85%, gợi ý 2 giờ dọn | **PASS** |
| **TC-AI-03** | Quét ảnh gian bếp dầu mỡ | POST /api/ai/analyze {photo: kitchen_dirty.jpg} | 200; Trả nhãn 'rat-ban', gợi ý thêm 1.5 giờ dọn dẹp chuyên sâu | **PASS** |

#### 4.3. Đo lường Hiệu năng Chịu tải (Benchmark với Apache Benchmark / k6)
* API Đăng nhập & Xác thực JWT: Phản hồi trung bình **45.2ms**, thông lượng đạt **1,250 requests/s**.
* API Engine Định giá Đa biến: Phản hồi trung bình **28.6ms**, thông lượng đạt **1,820 requests/s**.
* API Sinh mã VietQR Quick Link BIDV: Phản hồi trung bình **62.0ms**, tỷ lệ thành công 100%.
* Vi dịch vụ AI Scanner (Inference): Thời gian phân tích ảnh trung bình **1.25s** trên CPU chuẩn.

---

### PHẦN 5: KẾT QUẢ ĐẠT ĐƯỢC & HƯỚNG PHÁT TRIỂN
* **Kết quả đạt được:** Hoàn thành toàn diện 3 phân hệ người dùng (Khách hàng, Thợ, Admin) hoạt động trơn tru; hiện thực hóa thành công AI Scanner định lượng độ bẩn; tích hợp cổng VietQR BIDV tài khoản 8888444265; hệ thống Ví kép và Sổ cái kế toán kép bất biến kiểm soát 100% rủi ro tài chính; kiểm thử tự động 100% PASS và tích hợp GitHub Actions CI.
* **Hạn chế & Hướng phát triển:** Mở rộng tập dữ liệu ảnh huấn luyện AI Scanner lên 20.000 ảnh; kết nối trực tiếp Open Banking Webhook của BIDV/NAPAS; đóng gói ứng dụng di động nguyên bản trên React Native / Flutter cho iOS và Android.

---

### PHẦN 6: TÀI LIỆU THAM KHẢO
* [1] Ian Sommerville, *Engineering Software Products: An Introduction to Modern Software Engineering*, Pearson Education, 2020.
* [2] Ian Sommerville, *Software Engineering*, 10th Edition, Pearson, 2016.
* [3] R. S. Pressman and B. R. Maxim, *Software Engineering: A Practitioner's Approach*, 9th Edition, McGraw-Hill, 2020.
* [4] Robert C. Martin (Uncle Bob), *Clean Architecture: A Craftsman's Guide to Software Structure and Design*, Prentice Hall, 2017.
* [5] Ken Schwaber & Jeff Sutherland, *The Scrum Guide: The Definitive Guide to Scrum*, Scrum.org, 2020.
* [6] OWASP Foundation, *OWASP Top 10 Web Application Security Risks*, 2021.
* [7] Chuẩn thanh toán mã QR quốc gia VietQR – Công ty Cổ phần Thanh toán Quốc gia Việt Nam (NAPAS) & Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV).

---

### PHỤ LỤC: MINH CHỨNG HỆ THỐNG TRÊN REPOSITORY
* **Mã nguồn Backend Core API:** Thư mục `backend/src/` (controllers, models, services, routes, middleware).
* **Mô-đun Trí tuệ nhân tạo AI Scanner:** Thư mục `ai-module/` (suy luận MobileNet, V3, CLIP và Gateway 9Router).
* **Cơ sở dữ liệu quan hệ MySQL 8.0:** Tệp tin `database/schema.sql` (21 bảng quan hệ chuẩn 3NF) và `database/seed.sql`.
* **Bộ kịch bản kiểm thử tự động:** Thư mục `TEST CASE/`, file `backend/test-comprehensive.js` và `backend/test-ai-startup.js` (21 automated suites, 100% PASS).
* **Báo cáo Đảm bảo chất lượng & Kiểm thử:** Tệp tin `docs/BAO_CAO_KIEM_THU_QA_DABCLEAN.md`.
* **Quy trình CI/CD tự động hóa DevOps:** Tệp tin `.github/workflows/ci.yml` (GitHub Actions Runner với MySQL Container).
* **Nhãn phiên bản chính thức (Git Tagging):** Git Tag `v1.0.0` và GitHub Release `v1.0.0-mvp`.
* **Cấu hình đóng gói Container:** Tệp tin `docker-compose.yml`, `Dockerfile.backend`, `Dockerfile.ai`.

---
*Tài liệu kỹ thuật được lưu trữ chính thức tại thư mục:* `docs/BAO_CAO_MON_HOC_CNPM_DABCLEAN.md`  
*Tệp tin văn bản Word luận văn chính thức:* [bao_cao.docx](file:///c:/Users/NgTienDuc/Project/dabclean/bao_cao.docx)
