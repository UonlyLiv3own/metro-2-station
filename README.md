# Frontend Dự án Ga Metro 2

Giải nén thư mục và mở `index.html` bằng Chrome hoặc Edge. Có thể mở bằng Live Server trong VS Code. Giao diện dùng HTML, CSS và JavaScript thuần, chạy cả khi mở tệp trực tiếp và không cần mạng.

| Trang | Nội dung |
| --- | --- |
| `index.html` | Giao diện trang đầu của RXT với hai nút Tổng quan và Báo cáo. |
| `pages/overview.html` | Hai hàng chỉ tiêu Tổ 1 và Tổ 2. Tiến độ nhiệm vụ và tối đa 15 hồ sơ chưa chi mỗi tổ. |
| `pages/btgpmb.html` | Năm chỉ tiêu trạng thái. Danh sách đã chi trên, chưa chi dưới. Tìm theo tên, địa chỉ, PA hoặc số quyết định. Lọc theo nhóm chi, kế toán, cán bộ thụ lý, tổ và trạng thái. |
| `pages/finance.html` | Bốn chỉ tiêu, lịch giải ngân 7 ngày và tỷ lệ từng nhóm chi. |
| `pages/detail.html` | Mở từ tên hộ trong danh sách. Có thông tin kế toán và cán bộ thụ lý, bảng tiền theo nhóm và thanh tiến độ. Liên kết quay về giữ bộ lọc trong cùng phiên mở trang. |
| `pages/report.html` | Sáu chỉ tiêu, biểu đồ 6 tháng, giải ngân theo nhóm, bảng theo kỳ và ba mục cần theo dõi. Có nút in hoặc lưu PDF. |

## Nguồn và cách cập nhật

Dữ liệu mặc định được trích từ sheet **DATA_LOOKER** của workbook Metro 2. Bản này có 121 hồ sơ, gồm 66 hồ sơ Tổ 1 và 55 hồ sơ Tổ 2. Tên, phường và trạng thái lấy theo sheet. Bốn cột tiền đã chi đều bằng 0 trong bản nguồn và chưa có ngày chi. Chế độ **Xem mô phỏng** dùng bộ hồ sơ riêng để kiểm tra giao diện có số liệu.

Để cập nhật dữ liệu, dùng Python với thư viện openpyxl rồi chạy từ thư mục đã giải nén:

```powershell
py tools/export-data.py "đường-dẫn-tệp-Metro-2.xlsx"
```

Lệnh ghi lại `data/metro2.js`. Khi Excel sử dụng công thức, hãy lưu workbook đã được Excel tính trước khi chạy lệnh. Mã hồ sơ hiện dựa theo dòng nguồn. Nếu thứ tự dòng thay đổi, các liên kết chi tiết đã lưu có thể trỏ sang hồ sơ khác.

## Quy tắc hiển thị và các mục đã bổ sung

- Phân loại hồ sơ đã chi khi có tổng tiền đã chi lớn hơn 0, kể cả chi một phần. Danh sách chưa chi đếm hồ sơ chưa ghi nhận khoản chi, kể cả hồ sơ chưa có dự toán. Bộ lọc nhóm chi trả về hồ sơ có số tiền dương ở ít nhất một trong ba trường dự toán, đã chi hoặc chưa chi của nhóm.
- Trạng thái lấy từ cột W. Cán bộ thụ lý và kế toán lấy từ B và C. Ghi chú giải chi lấy từ AV. Chỉ tiêu cưỡng chế dựa trên số quyết định ở AB. Chỉ tiêu vướng mắc tạm đếm những hồ sơ có cụm “vướng mắc” trong ghi chú AV.
- Bồi thường lần đầu tạm dùng AJ/AL/AT. Thưởng BGMB dùng AK/AR/AU. Nhóm bổ sung, NVTC hiện dùng số tiền NVTC ở AP. Tạm cư dùng AN. Tổng dự toán và chưa chi cộng các cột tương ứng có trong nguồn. Tỷ lệ giải chi chung tính trên bồi thường và thưởng BGMB, hai nhóm có cột dự toán. Giá trị thiếu hoặc tỷ lệ không xác định hiển thị **—**. Các trường này cần rà soát lại khi chốt cấu trúc Excel nghiệp vụ.
- Kỳ 7 ngày tính đến ngày mở báo cáo theo giờ Việt Nam. Các cột theo ngày gồm số tiền và số hồ sơ có chi, với thang đo riêng. Tổng số hồ sơ đã chi cả tuần đếm duy nhất từng hồ sơ. Báo cáo lấy đầu kỳ là các khoản trước 7 ngày, cộng khoản trong kỳ để ra lũy kế. Khoản thiếu ngày chi vẫn được tính vào tổng đã chi và được ghi chú ở biểu đồ theo kỳ.
- Biểu đồ tháng tạm tính một hồ sơ hoàn tất khi có dự toán, số còn chi bằng 0 và có đủ ngày chi để xác định tháng hoàn tất. Cần chốt tiêu chí nghiệp vụ khi có dữ liệu chính thức.
- Bổ sung xử lý danh sách trống, phân trang, bộ lọc tổ và trạng thái, đường dẫn chi tiết, nút quay về danh sách, hiển thị điện thoại và bố cục in. Các nhiệm vụ trọng tâm hiện dùng bốn đầu việc minh họa dựa trên các trường sẵn có.
