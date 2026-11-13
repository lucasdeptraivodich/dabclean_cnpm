# Scanner trên web · ChatGPT qua 9Router

## Trạng thái hiện tại — 05/11/2026

Trang `http://127.0.0.1:5000/booking.html` đã tích hợp scanner ba tiêu chí qua `http://localhost:20128/v1`, model `cx/gpt-6.1-sol`. Backend đã khởi động lại theo xác nhận người dùng, vì vậy đơn demo RAM cũ đã mất và phiên đăng nhập cần đăng nhập lại. Đã đăng nhập lại tài khoản demo để kiểm thử UI. Bản thử độc lập vẫn ở cổng 5100.

Mỗi tiêu chí hiển thị tiêu đề, thanh 0–100% có nhãn số, dấu hiệu và phạm vi quan sát. Tổng quan **Sạch / Hơi bẩn / Rất bẩn** do model trả sau khi xét cả ba tiêu chí, không do frontend đặt ngưỡng hoặc lấy trung bình điểm. Nhiều ảnh được model tổng hợp từ các nhận định của ba tiêu chí; ảnh trùng không được tính lặp. Thiếu dữ liệu hoàn toàn thì giữ trạng thái chưa đủ dữ liệu.

Điểm là ước tính mức độ bẩn ở phần nhìn thấy, không phải xác suất hoặc tỷ lệ diện tích đo được. Model phải ghi thành phần đã quan sát; server loại điểm khi thiếu bằng chứng, mơ hồ hoặc không có thành phần đủ nhìn thấy. Không suy đoán bụi vi thể/góc khuất hoặc xác nhận sinh học nấm mốc. Điểm chưa có benchmark đối chứng; không khẳng định độ chính xác từ việc kết nối API thành công.

Ảnh được chuẩn hóa/loại metadata bằng Sharp, gửi qua 9Router đến upstream. DabClean không lưu ảnh upload vào dataset; việc lưu dữ liệu của proxy/nhà cung cấp nằm ngoài quyền kiểm soát DabClean. Thông báo này có trên giao diện trước khi gửi. API key, nếu endpoint yêu cầu, chỉ đặt ở môi trường backend.

## Chạy và cấu hình

Cài dependency cho **từng package**, từ đúng thư mục:

```powershell
cd D:\Documents\DabClean\backend
npm ci
cd ..\ai-module
npm ci
npm test
# Khởi động ứng dụng chính, terminal ở backend:
cd ..\backend
npm start
# Tùy chọn chạy trang thử riêng ở ai-module:
cd ..\ai-module
npm start
```

Backend đọc `backend/.env`; server AI độc lập đọc `ai-module/.env`. Các khóa cấu hình (đã đặt trong hai bản dự án, không commit `.env`):

```dotenv
AI_V32_ENABLED=true
AI_V32_PROVIDER=9router
AI_V32_ROUTER_URL=http://localhost:20128/v1
AI_V32_ROUTER_MODEL=cx/gpt-6.1-sol
# Chỉ điền nếu 9Router yêu cầu:
AI_V32_ROUTER_API_KEY=
```

9Router hiện đã nhận request ảnh không cần gửi khóa. Không tự động chuyển provider/model khi lỗi. Giới hạn mỗi request 4 ảnh tĩnh, mỗi ảnh 6 MB; rate limit 10 request/phút/IP; một lượt xử lý đồng thời. Worker có timeout và giới hạn heap. Response tối đa 256 KiB, JSON phải hoàn chỉnh, ba điểm phải là số nguyên 0–100, tổng quan phải thuộc enum hợp lệ. Không chuyển raw lỗi proxy/stack/key đến client. Tắt scanner bằng `AI_V32_ENABLED=false`.

API đang dùng: `POST /api/ai/v3.2/analyze`, `GET /api/ai/v3.2/capabilities`, `GET /api/ai/health`. Các endpoint V2/V3/V3.1 cũ ngừng hỗ trợ và trả 410, không gọi model local. Báo giá và đặt lịch dùng pricing engine backend hiện có; AI không tự thay giá hoặc áp phụ phí.

## Dataset/training đã dọn theo yêu cầu

Đã xác minh rồi xóa trong **đúng hai thư mục dự án**:

- `D:\Documents\DabClean`
- `C:\Users\admin\Documents\DabClean`

Đã xóa dataset tải về, ZIP, bản chọn 500 ảnh, nhãn/CSV, model MobileNet và trọng số, mã train/predict/augmentation/split, model/cache CLIP và Ollama, bộ benchmark và công cụ gán nhãn, tài liệu training cũ cùng các bản sao tạm phục vụ thu thập dữ liệu. Runtime Ollama thuộc dự án đã dừng trước khi xóa. Không sửa lịch sử Git, không xóa cả dự án, hệ thống hoặc 9Router.

Các test chỉ dành cho tính năng training/V3.1 đã được gỡ cùng tính năng đã bỏ. Các kiểm tra còn áp dụng về ảnh giả, decompression bomb, EXIF, giới hạn upload, đồng thời, timeout, JSON/điểm sai kiểu, URL gateway, lỗi xác thực/quota, XSS và miền điểm được giữ/chuyển sang `test/v32/`. Không xóa test để che lỗi còn áp dụng. Nhật ký đường dẫn xóa nằm trong `.cache/ai-training-cleanup.json` và `.cache/ai-training-extra-cleanup.json` (Git ignore).

Package AI đã bỏ TensorFlow/MobileNet/Hugging Face và các thư viện giải mã ảnh riêng không cần dùng; chỉ còn Express/CORS/dotenv/multer/Sharp và linkedom cho test DOM. Đã cập nhật lockfile, prune dependency D và cài lại dependency C. Không cần schema migration. Cấu hình gateway đã cập nhật ở `.env`; secret production/database không được thay.

Bản C nhận cùng runtime AI, shared viewer, các thay đổi AI trong `booking.html`/`api.js`, README và test, không sao chép các thay đổi nghiệp vụ khác từ D. Web chính đang chạy thuộc bản D.

## File thay đổi

- `frontend/booking.html`, `frontend/api.js`: gọi scanner mới và thông báo gửi ảnh.
- `frontend/js/ai-v3.js`, `frontend/css/ai-v3.css`: ba thanh phần trăm, dấu hiệu và tổng quan; render bằng DOM an toàn, ẩn chi tiết kỹ thuật trong form đặt lịch.
- `ai-module/src/v32/{provider,routerProvider,worker,routes}.js`: schema/validation, suy luận và tổng quan model.
- `ai-module/src/v3/{quality,engine,routes}.js`: hạ tầng sàng lọc ảnh, worker, upload còn dùng; đây không phải model V3 local.
- `ai-module/src/routes/aiRoutes.js`, `src/app.js`, `server.js`, `public/`: entry point và trang thử chỉ dùng 9Router.
- `ai-module/package.json`, `package-lock.json`, `.env.example`, `README.md`, root README/`.gitignore`: dependency, cấu hình, hướng dẫn và loại cache khỏi Git.
- `ai-module/test/v32/*.test.js`: test chức năng mới và bảo vệ còn áp dụng.

## Kết quả kiểm thử thực tế

- Bản D: **29 pass / 0 fail** (`npm --prefix ai-module test`).
- Bản C: **29 pass / 0 fail** (`npm --prefix C:\Users\admin\Documents\DabClean\ai-module test`).
- Clean-install dependency từ lockfile trong thư mục trống: `npm ci --ignore-scripts` thành công; import Express/multer/dotenv/CORS và tạo JPEG bằng Sharp thành công. Không dùng test này để khẳng định production/database.
- Backend regression ở tiến trình cô lập: comprehensive **20 pass / 1 fail** (cộng dồn khuyến mãi); guest **11 pass / 1 fail** (ngày đặt lịch cố định trong test đã qua); RBAC **10/10**; return URL **12/12**. Hai lỗi cùng baseline trước thay đổi AI, chưa sửa ngoài phạm vi.
- Request thật qua 9Router nhận đủ ba tiêu chí và tổng quan từ model. UI `booking.html` trên cổng 5000 đã gửi ảnh, hiển thị ba thanh và “Tổng quan: Sạch” kèm lý do. Tổng giá trước/sau phân tích vẫn **225.000đ** trong ca thử. Chưa xác nhận chất lượng phân loại trên bộ ảnh benchmark.
- Chưa chạy integration MySQL thật hay production config vì không đổi DB/auth; các kết quả demo không chứng minh MySQL hoạt động. Không có dependency mới phải thêm; cần dùng lockfile AI mới để gỡ dependency cũ.

Tham khảo giao thức: [README 9Router](https://github.com/decolua/9router).


## Thu gọn giao diện theo yêu cầu

Đã giảm padding của khung kết quả và từng tiêu chí, cỡ chữ nội dung xuống 13px, tiêu đề/điểm 14–16px, thanh điểm còn cao 12px. Giữ nguyên ba tiêu chí, dấu hiệu và phạm vi quan sát; không sửa prompt, điểm hoặc tổng quan model. Đổi dòng giới thiệu thành “AI phân tích qua 3 tiêu chí kèm theo đánh giá chi tiết mỗi tiêu chí” và bỏ dòng “Model kết luận dựa trên ba tiêu chí ở phần nhìn thấy trong ảnh.”

File sửa trong cả hai bản C/D: frontend/booking.html, frontend/js/ai-v3.js, frontend/css/ai-v3.css. Node scanner test bản D 29/29 pass. Không thay backend, dependency, .env hoặc database; không cần restart/migration và không chạy lại MySQL/production cho thay đổi giao diện này.


## Một lệnh khởi động backend + scanner

Scanner đã được mount trực tiếp trong Express backend. Sau bước cài dependency hai package, chỉ cần `cd backend` rồi `node server.js`; không spawn tiến trình AI riêng, không phụ thuộc cổng 5100. Backend startup hiện in đường dẫn scanner/API và nhắc yêu cầu 9Router đang hoạt động. `backend/.env.example` có cấu hình gateway/model; `npm run test:ai` chạy test thật entry point backend cùng gateway giả lập loopback, xác minh request ảnh, ba điểm, tổng quan model và không áp phụ phí. Test không khởi động server ai-module hoặc dùng cổng 5100, đã PASS. Không phải test độ chính xác model hoặc MySQL.

File bổ sung cho yêu cầu này: backend/server.js, backend/package.json, backend/.env.example, backend/test-ai-startup.js, README.md và tài liệu này. Không migration hoặc dependency mới.

## Độ trễ qua 9Router

Với model mặc định `cx/gpt-6.1-sol`, backend gửi `reasoning_effort=low`. Đặt `AI_V32_ROUTER_REASONING_EFFORT=default` để dùng mức suy luận mặc định của gateway. Các model khác mặc định dùng cấu hình gateway. Mỗi lượt phân tích gửi tối đa ba ảnh hợp lệ đồng thời, sau đó tổng hợp nếu có nhiều ảnh đánh giá được.
