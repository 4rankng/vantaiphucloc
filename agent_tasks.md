# Tasks: Rename operation_type → work_type globally (code + DB)

- [x] (backend) Create Alembic migration to rename DB column `operation_type` → `work_type`
- [x] (backend) Update ORM model: remove `"operation_type"` column name override
- [x] (backend) Global rename `operation_type` → `work_type` in all Python source files
- [x] (backend) Revert debug code in router.py
- [x] (backend) Run `make test-backend` — 226 passed
- [x] (backend) Verify API: POST /route-pricings/import-commit returns 200
