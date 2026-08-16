# Tổng quan Đối soát cho kế toán

## Status

Completed

## Scope

Mở rộng tổng hợp chuyến trong kỳ hiện có để trả về số F20, F40, E20, E40, tổng cước và tổng lương sản lượng; trình bày các số này trong khối tổng quan của trang Đối soát.

## Acceptance criteria

- Số liệu áp dụng đúng kỳ và các bộ lọc chủ hàng, lái xe, trạng thái đang chọn.
- Tổng cước lấy từ `revenue`; lương sản lượng lấy từ `driver_salary`; cả hai hiển thị đủ chữ số VND.
- Màn rộng có ba nhóm dễ quét: chuyến xe, cơ cấu container và giá trị; màn hẹp không tràn ngang.
- Giữ nguyên các chỉ số và API đang có ngoài các trường tổng hợp bổ sung.

## Validation

- Thêm kiểm thử API cho bốn loại container và hai tổng tiền.
- Chạy kiểm thử backend liên quan, lint/build frontend và kiểm tra trình duyệt ở desktop/mobile.

## Results

- API, type frontend và khối tổng quan đã hoàn tất.
- Bộ pytest backend, ruff, lint/build frontend và kiểm tra trình duyệt desktop/tablet/mobile đều đạt.
