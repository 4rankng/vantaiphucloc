# API Sample Curls (Local Dev)

Base URL: `http://localhost:8000/api/v1`

---

## Auth

### Login
```bash
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}' | jq
```

### Refresh Token
```bash
curl -s -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"<refresh_token>"}' | jq
```

### Logout
```bash
curl -s -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Authorization: Bearer <access_token>" | jq
```

> **Tip**: After login, export the token to avoid repeating it:
> ```bash
> export TOKEN="<access_token>"
> ```

---

## Users

### Get Current User
```bash
curl -s http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Update Current User
```bash
curl -s -X PUT http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Nguyen Van A"}' | jq
```

### List Users
```bash
curl -s "http://localhost:8000/api/v1/users?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### List Users by Role
```bash
curl -s "http://localhost:8000/api/v1/users?role=driver&page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Create User
```bash
curl -s -X POST http://localhost:8000/api/v1/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0901234567",
    "email": "driver@example.com",
    "username": "driver01",
    "password": "secret123",
    "role": "driver",
    "full_name": "Tran Van B",
    "cccd": "123456789012",
    "vendor": "ABC Logistics",
    "tractor_plate": "51C-12345"
  }' | jq
```

### Update User
```bash
curl -s -X PUT http://localhost:8000/api/v1/users/2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Tran Van B Updated","phone":"0909876543"}' | jq
```

### Delete User
```bash
curl -s -X DELETE http://localhost:8000/api/v1/users/2 \
  -H "Authorization: Bearer $TOKEN" -w "\nHTTP %{http_code}\n"
```

### Change Password
```bash
curl -s -X POST http://localhost:8000/api/v1/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"current_password":"secret","new_password":"newsecret123"}' | jq
```

---

## Clients

### List Clients
```bash
curl -s "http://localhost:8000/api/v1/clients?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Create Client
```bash
curl -s -X POST http://localhost:8000/api/v1/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Coca-Cola Vietnam",
    "code": "CCV",
    "type": "enterprise",
    "phone": "0281234567",
    "tax_code": "1234567890",
    "address": "123 Nguyen Hue, Q1, HCM",
    "contact_person": "Le Thi C"
  }' | jq
```

### Update Client
```bash
curl -s -X PUT http://localhost:8000/api/v1/clients/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone":"0289876543","address":"456 Le Loi, Q1, HCM"}' | jq
```

### Delete Client (soft delete with reason)
```bash
curl -s -X DELETE http://localhost:8000/api/v1/clients/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Client no longer active"}' -w "\nHTTP %{http_code}\n"
```

---

## Locations

### List Locations (paginated)
```bash
curl -s "http://localhost:8000/api/v1/locations?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### List All Locations (no pagination)
```bash
curl -s http://localhost:8000/api/v1/locations/all \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Create Location
```bash
curl -s -X POST http://localhost:8000/api/v1/locations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Cat Lai Port"}' | jq
```

### Update Location
```bash
curl -s -X PUT http://localhost:8000/api/v1/locations/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Cat Lai Port - Updated"}' | jq
```

### Delete Location
```bash
curl -s -X DELETE http://localhost:8000/api/v1/locations/1 \
  -H "Authorization: Bearer $TOKEN" -w "\nHTTP %{http_code}\n"
```

---

## Routes

### List Routes
```bash
curl -s "http://localhost:8000/api/v1/routes?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Create Route
```bash
curl -s -X POST http://localhost:8000/api/v1/routes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "route": "Cat Lai - Binh Duong",
    "pickup_location": "Cat Lai Port",
    "dropoff_location": "VSIP Binh Duong",
    "type_20ft": 1500000,
    "type_40ft": 2000000,
    "is_two_way": false
  }' | jq
```

### Update Route
```bash
curl -s -X PUT http://localhost:8000/api/v1/routes/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type_20ft":1600000,"type_40ft":2100000}' | jq
```

### Delete Route
```bash
curl -s -X DELETE http://localhost:8000/api/v1/routes/1 \
  -H "Authorization: Bearer $TOKEN" -w "\nHTTP %{http_code}\n"
```

---

## Pricings

### List Pricings
```bash
curl -s "http://localhost:8000/api/v1/pricings?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Filter Pricings
```bash
curl -s "http://localhost:8000/api/v1/pricings?client_id=1&work_type=import&page=1" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Create Pricing
```bash
curl -s -X POST http://localhost:8000/api/v1/pricings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": 1,
    "client_name": "Coca-Cola Vietnam",
    "work_type": "import",
    "route": "Cat Lai - Binh Duong",
    "lines": [
      {"container_type": "20ft", "price": 1500000},
      {"container_type": "40ft", "price": 2000000}
    ]
  }' | jq
```

### Update Pricing
```bash
curl -s -X PUT http://localhost:8000/api/v1/pricings/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lines": [
      {"container_type": "20ft", "price": 1600000},
      {"container_type": "40ft", "price": 2200000}
    ]
  }' | jq
```

### Delete Pricing
```bash
curl -s -X DELETE http://localhost:8000/api/v1/pricings/1 \
  -H "Authorization: Bearer $TOKEN" -w "\nHTTP %{http_code}\n"
```

---

## Work Orders

### Validate Container Number
```bash
curl -s "http://localhost:8000/api/v1/work-orders/validate-container?container_number=MSKU1234567" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### List Work Orders
```bash
curl -s "http://localhost:8000/api/v1/work-orders?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Filter Work Orders
```bash
curl -s "http://localhost:8000/api/v1/work-orders?driver_id=1&status=pending&date_from=2026-01-01&date_to=2026-05-03" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Get Work Order
```bash
curl -s http://localhost:8000/api/v1/work-orders/1 \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Create Work Order
```bash
curl -s -X POST http://localhost:8000/api/v1/work-orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "containers": ["MSKU1234567"],
    "client_id": 1,
    "client_name": "Coca-Cola Vietnam",
    "route": "Cat Lai - Binh Duong",
    "pickup_location": "Cat Lai Port",
    "dropoff_location": "VSIP Binh Duong",
    "driver_id": 2,
    "driver_name": "Tran Van B",
    "tractor_plate": "51C-12345"
  }' | jq
```

### Batch Create Work Orders
```bash
curl -s -X POST http://localhost:8000/api/v1/work-orders/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "containers": ["MSKU1234567"],
        "client_id": 1,
        "client_name": "Coca-Cola Vietnam",
        "route": "Cat Lai - Binh Duong",
        "driver_id": 2,
        "driver_name": "Tran Van B",
        "tractor_plate": "51C-12345"
      },
      {
        "containers": ["TCNU9876543"],
        "client_id": 1,
        "client_name": "Coca-Cola Vietnam",
        "route": "Cat Lai - Binh Duong",
        "driver_id": 3,
        "driver_name": "Pham Van D",
        "tractor_plate": "51C-67890"
      }
    ]
  }' | jq
```

### Update Work Order
```bash
curl -s -X PUT http://localhost:8000/api/v1/work-orders/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress"}' | jq
```

### Cancel Work Order
```bash
curl -s -X PUT http://localhost:8000/api/v1/work-orders/1/cancel \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Customer cancelled request"}' | jq
```

### OCR Container Number
```bash
curl -s -X POST http://localhost:8000/api/v1/work-orders/ocr-container \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "image_data": "<base64_encoded_image>",
    "mime_type": "image/jpeg",
    "container_index": 0
  }' | jq
```

### Export Work Orders (Excel)
```bash
curl -s -o work_orders.xlsx \
  "http://localhost:8000/api/v1/work-orders/export?date_from=2026-01-01&date_to=2026-05-03" \
  -H "Authorization: Bearer $TOKEN" -w "\nHTTP %{http_code}\n"
```

---

## Trip Orders

### List Trip Orders
```bash
curl -s "http://localhost:8000/api/v1/trip-orders?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Filter Trip Orders
```bash
curl -s "http://localhost:8000/api/v1/trip-orders?client_id=1&status=pending&date_from=2026-01-01&date_to=2026-05-03" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Get Trip Order
```bash
curl -s http://localhost:8000/api/v1/trip-orders/1 \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Create Trip Order
```bash
curl -s -X POST http://localhost:8000/api/v1/trip-orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trip_date": "2026-05-03",
    "client_id": 1,
    "client_name": "Coca-Cola Vietnam",
    "work_type": "import",
    "route": "Cat Lai - Binh Duong",
    "pickup_location": "Cat Lai Port",
    "dropoff_location": "VSIP Binh Duong",
    "containers": ["MSKU1234567"],
    "unit_price": 1500000,
    "driver_salary": 300000,
    "allowance": 100000
  }' | jq
```

### Update Trip Order
```bash
curl -s -X PUT http://localhost:8000/api/v1/trip-orders/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"unit_price":1600000,"driver_salary":350000}' | jq
```

### Cancel Trip Order
```bash
curl -s -X PUT http://localhost:8000/api/v1/trip-orders/1/cancel \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Duplicate entry"}' | jq
```

### Confirm Trip Order
```bash
curl -s -X PUT http://localhost:8000/api/v1/trip-orders/1/confirm \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Download Import Template
```bash
curl -s -o trip_template.xlsx \
  http://localhost:8000/api/v1/trip-orders/template \
  -H "Authorization: Bearer $TOKEN" -w "\nHTTP %{http_code}\n"
```

### Import Trip Orders (Excel)
```bash
curl -s -X POST http://localhost:8000/api/v1/trip-orders/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@trip_orders.xlsx" | jq
```

### Export Trip Orders (Excel)
```bash
curl -s -o trip_orders.xlsx \
  "http://localhost:8000/api/v1/trip-orders/export?date_from=2026-01-01&date_to=2026-05-03" \
  -H "Authorization: Bearer $TOKEN" -w "\nHTTP %{http_code}\n"
```

---

## Reconciliation

### Reconcile (match work order to trip order)
```bash
curl -s -X POST http://localhost:8000/api/v1/reconcile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"work_order_id":1,"trip_order_id":1}' | jq
```

### Unmatch
```bash
curl -s -X POST http://localhost:8000/api/v1/reconcile/unmatch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"work_order_id":1,"reason":"Wrong match"}' | jq
```

### Suggest Matches for Work Order
```bash
curl -s http://localhost:8000/api/v1/suggest-matches/1 \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Suggest Work Orders for Trip Order
```bash
curl -s http://localhost:8000/api/v1/suggest-wos/1 \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Reconcile via Excel Upload
```bash
curl -s -X POST http://localhost:8000/api/v1/reconcile/upload-excel \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@reconcile_data.xlsx" \
  -F "client_id=1" | jq
```

### Export Reconciliation (Excel)
```bash
curl -s -o reconcile.xlsx \
  "http://localhost:8000/api/v1/reconcile/export-excel?client_id=1&date_from=2026-01-01&date_to=2026-05-03" \
  -H "Authorization: Bearer $TOKEN" -w "\nHTTP %{http_code}\n"
```

---

## Drivers

### List Drivers
```bash
curl -s "http://localhost:8000/api/v1/drivers?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Create Driver
```bash
curl -s -X POST http://localhost:8000/api/v1/drivers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "driver02",
    "phone": "0912345678",
    "tractor_plate": "51C-99999",
    "vendor": "ABC Logistics"
  }' | jq
```

---

## Vendors

### List Vendors
```bash
curl -s "http://localhost:8000/api/v1/vendors?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Create Vendor
```bash
curl -s -X POST http://localhost:8000/api/v1/vendors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ABC Logistics",
    "type": "transport",
    "phone": "0281111222",
    "tax_code": "9876543210",
    "address": "789 Nguyen Thi Dinh, Q2, HCM",
    "contact_person": "Vo Van E"
  }' | jq
```

### Update Vendor
```bash
curl -s -X PUT http://localhost:8000/api/v1/vendors/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone":"0283333444"}' | jq
```

### Delete Vendor
```bash
curl -s -X DELETE http://localhost:8000/api/v1/vendors/1 \
  -H "Authorization: Bearer $TOKEN" -w "\nHTTP %{http_code}\n"
```

---

## Salary

### Calculate Salary (async)
```bash
curl -s -X POST http://localhost:8000/api/v1/salary/calculate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"driver_id":2,"start_date":"2026-04-01","end_date":"2026-04-30"}' | jq
```

### List Salary Periods
```bash
curl -s "http://localhost:8000/api/v1/salary?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### List Salary Periods for Specific Driver
```bash
curl -s "http://localhost:8000/api/v1/salary?driver_id=2&active_only=true" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Driver's Own Salary
```bash
curl -s "http://localhost:8000/api/v1/driver/salary?page=1&page_size=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Salary Dashboard
```bash
curl -s "http://localhost:8000/api/v1/salary/dashboard?period_start=2026-04-01&period_end=2026-04-30" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Update Salary Period
```bash
curl -s -X PUT http://localhost:8000/api/v1/salary/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved"}' | jq
```

### Export Salary (Excel)
```bash
curl -s -o salary.xlsx \
  "http://localhost:8000/api/v1/salary/export?start_date=2026-04-01&end_date=2026-04-30" \
  -H "Authorization: Bearer $TOKEN" -w "\nHTTP %{http_code}\n"
```

---

## Salary Config

### Get Salary Config
```bash
curl -s http://localhost:8000/api/v1/salary-config \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Update Salary Config
```bash
curl -s -X PUT http://localhost:8000/api/v1/salary-config \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"from_day":1,"to_day":31}' | jq
```

---

## Dashboard

### Dashboard Summary
```bash
curl -s http://localhost:8000/api/v1/dashboard/summary \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Notifications
```bash
curl -s http://localhost:8000/api/v1/dashboard/notifications \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Push Notifications

### Get Vapid Public Key
```bash
curl -s http://localhost:8000/api/v1/push/vapid-public-key | jq
```

### Subscribe
```bash
curl -s -X POST http://localhost:8000/api/v1/push/subscriptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "https://fcm.googleapis.com/fcm/send/xxx",
    "p256dh": "<key>",
    "auth": "<auth>",
    "user_agent": "Mozilla/5.0"
  }' | jq
```

### Unsubscribe
```bash
curl -s -X DELETE http://localhost:8000/api/v1/push/subscriptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"endpoint":"https://fcm.googleapis.com/fcm/send/xxx"}' | jq
```

---

## Audit Logs

### List Audit Logs
```bash
curl -s "http://localhost:8000/api/v1/audit-logs?page=1&page_size=20" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Filter Audit Logs
```bash
curl -s "http://localhost:8000/api/v1/audit-logs?table_name=work_orders&action=INSERT&page=1" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## System Health

### API Info
```bash
curl -s http://localhost:8000/api/ | jq
```

### Health Check
```bash
curl -s http://localhost:8000/api/health | jq
```

### Worker Health
```bash
curl -s http://localhost:8000/api/health/worker | jq
```

### Database Health
```bash
curl -s http://localhost:8000/api/health/db | jq
```

### Check Background Job Status
```bash
curl -s http://localhost:8000/api/v1/jobs/<job_id> \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## OpenAPI Docs

- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc
- OpenAPI JSON: http://localhost:8000/api/openapi.json
