# Ẩn tác nghiệp xuất/nhập tàu cho tài xế

## Trạng thái

Hoàn tất

## Mục tiêu

Không hiển thị lựa chọn `XUẤT/NHẬP TÀU` trong lưới tác nghiệp khi tài xế tạo hoặc sửa chuyến.

## Phạm vi

- Thêm cơ chế ẩn có chủ đích vào `ContainerTypeGrid`.
- Áp dụng cơ chế này duy nhất ở màn tạo/sửa chuyến của tài xế.
- Giữ nguyên cấu hình tác nghiệp, API, giá cước và các chuyến đã lưu.

## Kiểm tra

- Tác nghiệp bị ẩn khi danh sách lấy từ API và khi dùng danh sách dự phòng.
- Lint và build frontend hoàn tất thành công.

## Kết quả

- `XUẤT/NHẬP TÀU` không hiện ở màn tạo/sửa chuyến của tài xế, kể cả khi giá trị cũ đã tồn tại hoặc được nhập lại qua `Khác`.
- Các màn kế toán, quản trị và chi tiết chuyến vẫn giữ dữ liệu tác nghiệp này.
- `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` và `git diff --check` đều đạt.
