# TLU Schedule — bản thử cục bộ

Ứng dụng xem lịch TLU bằng dữ liệu từ tài khoản sinh viên. Chạy trên máy cá nhân, không có dịch vụ cloud, không cần cài thư viện npm.

## Chạy

Cần Node.js 24 trở lên. Nhấp đúp `start.cmd` hoặc chạy `npm start`, rồi mở http://127.0.0.1:4317. Giữ tiến trình chạy khi dùng app. Dừng bằng Ctrl+C. Lệnh chạy dùng `--use-system-ca` để tin cậy kho chứng chỉ hệ thống Windows; không tắt xác minh HTTPS. Đã kiểm tra Node.js kết nối tới tệp công khai TLU trả HTTP 200 với cấu hình này.

1. Kết nối tài khoản TLU, tự nhập tài khoản và mật khẩu tại giao diện.
2. Chọn học kỳ, bấm **Tải lịch cả kỳ**.
3. Xem theo tuần hoặc cả học kỳ, tìm môn/phòng, đổi màu giao diện.
4. Tùy chọn lưu lịch trên trình duyệt để xem lại khi máy chủ TLU mất kết nối. Máy chủ cục bộ vẫn phải chạy để mở app. Đây chưa phải PWA cài đặt/offline độc lập.

**Xem mẫu** chỉ dùng hai lịch Java trong dữ liệu người dùng cung cấp. Không phải đăng nhập thành công, không phải lịch đầy đủ. Mẫu không được lưu vào cache lịch thật.

## Quyền riêng tư và giới hạn

- Chỉ lắng nghe `127.0.0.1`, kiểm tra Host, Origin và header riêng để ngăn website khác gọi API cục bộ.
- Mật khẩu chỉ gửi tới adapter cục bộ rồi tới `https://sinhvien1.tlu.edu.vn`; không ghi vào log/tệp. Token TLU chỉ nằm trong bộ nhớ server, không trả về frontend. Cookie cục bộ HttpOnly/SameSite Strict, không chứa token TLU.
- Phiên cục bộ hết hạn sau 2 giờ hoặc khi dừng server. Adapter làm mới token khi cần; nếu không thể làm mới, yêu cầu đăng nhập lại. Không lưu mật khẩu để đăng nhập lại tự động.
- “Ngắt kết nối” xóa phiên app và lịch lưu trên trình duyệt; không khẳng định thu hồi phiên trên máy chủ trường. Chức năng đăng xuất của website trường quản lý phiên riêng.
- Lưu lịch là tùy chọn, ở localStorage trên trình duyệt máy này. Người có quyền dùng cùng trình duyệt có thể xem. Xóa bằng nút **Xóa lịch trên máy** hoặc ngắt kết nối.
- Không sử dụng thông tin xác thực đã được dán trong chat.
- Bản đầu chưa kiểm thử đăng nhập thật, đổi học kỳ thật và làm mới token thật bằng tài khoản sinh viên. Test tự động dùng transport giả, không gửi tài khoản thử tới trường.
- Không triển khai công khai bản này: adapter nội bộ phụ thuộc website TLU và có thể thay đổi. Không có nhận diện nghỉ lễ/học bù ngoài dữ liệu trường trả về.

## Nguồn đối chiếu công khai (26/10/2026)

- `https://sinhvien1.tlu.edu.vn/application.js`: địa chỉ API và cấu hình OAuth client công khai của chính website (không phải bí mật tài khoản).
- `https://sinhvien1.tlu.edu.vn/common/business/LoginService.js`: sử dụng `OAuth.getAccessToken`.
- `https://sinhvien1.tlu.edu.vn/application.configs.js` và `assets/scripts/external/angular-oauth2.min.js`: POST `/education/oauth/token`, form `username`, `password`, `client_id`, `client_secret`, `grant_type=password`; refresh cùng endpoint.
- `https://sinhvien1.tlu.edu.vn/student/business/ProfileService.js`: GET `/education/api/semester/1/100`, `/semester/semester_info`, `/StudentCourseSubject/studentLoginUser/{semesterId}`.
- `https://sinhvien1.tlu.edu.vn/student/controllers/ProfileController.js`: thứ 2–8, tuần tính từ `schoolYear.startDate`, bỏ `subjectStatus=-4`.

App đọc ngày theo Asia/Ho_Chi_Minh, lấy giờ từ `startString`/`endString` (không dùng ngày 2019 trong timestamp của tiết), giới hạn cả khoảng ngày lẫn tuần khi có mốc năm học, giữ môn chưa có lịch ở danh sách cả kỳ và cảnh báo lịch không hợp lệ. Cần đối chiếu thêm nhiều môn/học kỳ thật trước khi dùng thường xuyên.

## Kiểm thử

`npm test` kiểm tra chuyển ngày, thứ Hai/Chủ nhật, giới hạn tuần, hủy môn, trùng bản ghi, giờ trống, OAuth/refresh bằng mock và bảo vệ/session API cục bộ. Giao diện không tải script, font hoặc analytics bên ngoài.

Mã chính: `server.mjs` (adapter + API), `public/schedule.mjs` (chuẩn hóa lịch), `public/app.mjs`, `public/style.css`.
