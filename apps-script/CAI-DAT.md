# Kết nối Metro 2 với Google Sheets

Dashboard này đọc trực tiếp tab **DỮ LIỆU TỔNG HỢP** (gid 661497906) qua Apps Script. Mỗi lần mở lại hoặc tải lại trang, web đọc dữ liệu mới. Cán bộ tiếp tục nhập liệu ở file nguồn. Apps Script chỉ yêu cầu quyền đọc Sheets.

## Triển khai lần đầu

1. Dùng tài khoản Google của đơn vị có quyền chỉnh sửa file nguồn. Mở Google Sheets → **Tiện ích mở rộng → Apps Script**. Nếu file chỉ cho bạn xem, nhờ người có quyền chỉnh sửa thực hiện các bước cài đặt.
2. Tạo hoặc mở tệp **Code.gs**, dán nội dung trong gói. Nếu dự án đã có code khác, giữ phần code đang dùng và kiểm tra trùng tên hàm trước khi thêm.
3. Bấm **+ → HTML**. Đặt tên **Dashboard** và dán toàn bộ nội dung **Dashboard.html** trong gói.
4. Trong **Cài đặt dự án**, bật hiển thị tệp **appsscript.json**. Với dự án mới, dán manifest trong gói. Nếu tích hợp vào dự án đã có chức năng, giữ cấu hình hiện có và bổ sung scope đọc Sheets khi phù hợp. Lưu các tệp.
5. Chọn **Triển khai → Bản triển khai mới → Ứng dụng web**. Chọn **Thực thi dưới danh tính người dùng truy cập ứng dụng web**. Nếu có Google Workspace, chọn phạm vi truy cập trong tổ chức phù hợp. Để thử riêng, chọn **Chỉ mình tôi** nếu tùy chọn có sẵn. Giữ nguyên quyền chia sẻ của file nguồn. Người mở dashboard cần quyền đọc Google Sheets và cấp quyền đọc khi Google hỏi.
6. Mở URL **/exec** được tạo. Chọn **Tổng quan**, kiểm tra dòng **Dữ liệu trực tiếp từ Google Sheets** và số hồ sơ. Tại thời điểm đối chiếu, nguồn có 121 hồ sơ, gồm 66 hồ sơ Tổ 1 và 55 hồ sơ Tổ 2. Số thực tế có thể thay đổi.
7. Khi chỉnh mã, vào **Triển khai → Quản lý bản triển khai → Chỉnh sửa → Phiên bản mới**. Khi cán bộ chỉ cập nhật ô dữ liệu hoặc thêm các cột đã ánh xạ, tải lại trang /exec để đọc bản mới.

## Cách lấy dữ liệu

- Hàng 3 là hàng tiêu đề chính. Code nhận theo tên cột, bỏ qua các dòng thống kê và chỉ lấy hồ sơ có tên thuộc Tổ 1 hoặc Tổ 2. Khi có cột **MÃ HỒ SƠ**, sử dụng mã đó. Tạm dùng STT duy nhất nếu mã còn trống.
- Ánh xạ tiêu đề tài chính ở **Code.gs** phần `fields`. Tên có dấu, xuống dòng và dấu câu được chuẩn hóa. Nếu dùng tiêu đề trùng hoặc thay tên khác hẳn, cập nhật mapping. Nhập số tiền dưới dạng số, ngày thực chi dưới dạng ngày.
- **BT bổ sung** và **NVTC** cộng chung khi hiển thị. Ngày chi vẫn được tính riêng. Nhóm **Tạm cư** được xét khi có quyết định chi hoặc đã có dự toán/khoản chi. Nếu có quyết định mà chưa có dự toán dương, hồ sơ chưa được tính hoàn tất chi. **Hoàn tất bàn giao** dùng ngày bàn giao.
- Nếu cột mới chưa có trong nguồn, web báo thiếu. Tổng tiền từ phần dữ liệu đã có vẫn hiển thị. Số 0 từ Sheets giữ nguyên, ô hoặc cột thiếu hiển thị dấu gạch trong các ô tiền cấp nhóm. Chỉ tiêu hoàn tất chi theo tháng chờ đủ các tiêu đề mới.
- Tab tổng hợp hiện chỉ có một cặp tiền/ngày cho từng khoản. Nếu một khoản có nhiều đợt, dữ liệu kỳ chỉ chính xác khi từng lần chi có dòng riêng. Phiên bản này đọc duy nhất tab tổng hợp. Khi tab lịch sử chi có cấu trúc chính thức, nối thêm tab đó để đọc từng đợt và tránh tính lại tiền tổng hợp.

## Chỉnh giao diện

- Sửa `js/app.js` hoặc `css/metro.css` trong source. Chạy `py tools/build-apps-script.py` từ thư mục Metro-2 để tạo lại `apps-script/Dashboard.html`.
- Dán lại HTML đã tạo trong Apps Script và cập nhật bản triển khai.
- `index.html` mở trực tiếp vẫn là bản xem offline dùng snapshot cũ. Bản đọc dữ liệu trực tiếp mở bằng URL **/exec**.
