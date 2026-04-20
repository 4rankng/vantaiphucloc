# TTransport — Workflow Engine Requirements

## 1. Tổng quan

Workflow Engine là một thư viện (library) Python độc lập, đóng vai trò black-box trong hệ thống. Backend gọi qua contract rõ ràng, không cần biết logic nội bộ.

## 2. Yêu cầu Chức năng

### 2.1 Lưu trữ
- **REQ-WF-01:** Một bảng duy nhất `workflows` (id, run_id, state, attempt, data, created_at, updated_at)
- **REQ-WF-02:** Mỗi thực thể (trip, expense, invoice) có đúng 1 run_id duy nhất
- **REQ-WF-03:** Trường `data` (JSONB) lưu trữ linh hoạt: entity_type, entity_id, event, payload, kết quả action, lỗi

### 2.2 Định nghĩa Workflow (trong code)
- **REQ-WF-04:** States, transitions, actions được định nghĩa hoàn toàn trong code — không lưu trong database
- **REQ-WF-05:** Mỗi transition cấu hình được `max_attempts` riêng (một số cho retry, một số không)
- **REQ-WF-06:** Mỗi transition có danh sách actions được thực thi theo thứ tự
- **REQ-WF-07:** Mỗi action có thuộc tính `is_blocking` — nếu true và thất bại, không chuyển state

### 2.3 API Contract (Input/Output)
- **REQ-WF-08:** `engine.create(workflow_id, entity_type, entity_id, initial_data)` → trả về `WorkflowRun`
- **REQ-WF-09:** `engine.load(entity_type, entity_id)` → trả về `WorkflowRun | None`
- **REQ-WF-10:** `run.resume(event, data, user_id)` → cập nhật state, đặt attempt=1 để kích worker
- **REQ-WF-11:** Backend KHÔNG bao giờ tương tác trực tiếp với bảng `workflows` — chỉ qua engine
- **REQ-WF-12:** `engine.poll_pending()` → trả về danh sách runs có `attempt > 0`
- **REQ-WF-13:** `run.execute()` → worker gọi để thực thi transition actions

### 2.4 Resume Logic
- **REQ-WF-14:** API load workflow run bằng entity → gọi `resume(event, data)`
- **REQ-WF-15:** Engine tự động validate: transition hợp lệ (from_state + event match), required data đủ, role đúng
- **REQ-WF-16:** Nếu transition không hợp lệ → throw `WorkflowError` với chi tiết (current_state, valid_events)
- **REQ-WF-17:** Nếu hợp lệ → cập nhật state mới, đặt `attempt = 1`, lưu data

### 2.5 Worker Logic
- **REQ-WF-18:** Worker poll định kỳ các runs có `attempt > 0`
- **REQ-WF-19:** Worker hỏi code: "transition nào cho state + event này?" và "attempt còn ≤ max_attempts?"
- **REQ-WF-20:** Nếu `attempt = 0` → worker bỏ qua (chưa sẵn sàng)
- **REQ-WF-21:** Nếu `attempt > max_attempts` → worker bỏ qua (cần can thiệp thủ công)
- **REQ-WF-22:** Thực thi actions theo thứ tự:
  - Thành công → `attempt = 0` (đợi event tiếp theo), cập nhật state
  - Thất bại action blocking → `attempt += 1` (thử lại lần sau)
  - Thất bại action non-blocking → ghi log, tiếp tục actions tiếp theo

### 2.6 Attempt Lifecycle
- **REQ-WF-23:** `attempt = 0`: Pending, worker bỏ qua, chờ API gọi resume
- **REQ-WF-24:** `attempt = 1`: Worker thực thi lần đầu
- **REQ-WF-25:** `attempt = 2, 3...`: Retry tự động sau thất bại
- **REQ-WF-26:** `attempt > max_attempts`: Dừng retry, hiển thị trên dashboard cho Admin can thiệp

## 3. Yêu cầu Phi Chức năng

### 3.1 Contract Stability
- **REQ-WF-27:** Public interface (`create`, `load`, `resume`, `execute`, `poll_pending`) không thay đổi giữa các version
- **REQ-WF-28:** Nội bộ (định nghĩa workflow, action handlers, retry strategy) có thể thay đổi mà không ảnh hưởng caller
- **REQ-WF-29:** Data JSONB chỉ được thêm field mới, không xóa field cũ (backward compatibility)

### 3.2 Separation of Concerns
- **REQ-WF-30:** Audit Log ghi hành động người dùng (ai bấm gì, lúc nào, giá trị cũ/mới) — tách biệt hoàn toàn
- **REQ-WF-31:** Workflow table chỉ lưu trạng thái hệ thống — không chứa user context
- **REQ-WF-32:** API route mỏng: xác thực + ghi audit log + gọi engine.resume() → trả về ngay

### 3.3 Error Handling
- **REQ-WF-33:** Engine throw các error type cụ thể: `InvalidTransitionError`, `ValidationError`, `PermissionDeniedError`, `MaxAttemptsExceededError`
- **REQ-WF-34:** Mỗi error cung cấp đủ thông tin để frontend hiển thị (valid_events, missing_fields, required_roles)
- **REQ-WF-35:** Lỗi action được ghi vào `data.errors` để debug, không ảnh hưởng các action non-blocking tiếp theo

### 3.4 Extensibility
- **REQ-WF-36:** Thêm workflow mới chỉ cần thêm code class, không thay đổi database schema
- **REQ-WF-37:** Thêm state/transition mới chỉ cần thêm vào code definition
- **REQ-WF-38:** Action handlers là các Python function độc lập, đăng ký qua decorator hoặc registry

## 4. Phân tách Trách nhiệm

```
Backend API:
  ├─ Xác thực request (JWT + RBAC)
  ├─ Ghi Audit Log (hành động user)
  ├─ engine.load() → run.resume(event, data)
  └─ Trả về response

Workflow Engine (Library):
  ├─ Validate transition (state + event)
  ├─ Cập nhật state + attempt
  ├─ Persist vào WORKFLOWS table
  └─ Cung cấp interface cho worker

Worker:
  ├─ Poll attempt > 0
  ├─ Hỏi engine: transition + max_attempts
  ├─ Execute actions
  └─ Thành công: attempt=0 / Thất bại: attempt++
```

## 5. Workflows Phase 1

### 5.1 Trip Workflow
- 10 states (0-9): draft → assigned → pickup_empty → at_port → loaded → in_transit → arriving → delivered → completed / cancelled
- 9 transitions với max_attempts khác nhau (OCR: 3 retries, simple: 1)

### 5.2 Expense Workflow
- 3 states (0-2): pending → approved / rejected
- 2 transitions

### 5.3 Invoice Workflow
- 5 states (0-4): draft → issued → partial_paid / fully_paid / overdue
- 5 transitions

## 6. Không Yêu cầu

- Không sử dụng Temporal, Prefect hay workflow engine bên ngoài
- Không lưu trữ transition history trong workflow table (chỉ state hiện tại)
- Không cần Web UI riêng cho workflow (tích hợp vào dashboard hiện có)
- Không cần distributed execution (single server, single worker)
