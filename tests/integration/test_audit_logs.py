"""Integration tests for audit log endpoints."""


class TestAuditLogs:
    def test_list_audit_logs(self, api_client, accountant_headers):
        resp = api_client.get("/audit-logs", headers=accountant_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data or isinstance(data, list)

    def test_list_audit_logs_filter_action(self, api_client, accountant_headers):
        resp = api_client.get("/audit-logs", headers=accountant_headers, params={"action": "CREATE"})
        assert resp.status_code == 200

    def test_list_audit_logs_filter_table(self, api_client, accountant_headers):
        resp = api_client.get("/audit-logs", headers=accountant_headers, params={"table_name": "work_orders"})
        assert resp.status_code == 200

    def test_list_audit_logs_pagination(self, api_client, accountant_headers):
        resp = api_client.get("/audit-logs", headers=accountant_headers, params={"page_size": 5})
        assert resp.status_code == 200

    def test_driver_cannot_read_audit(self, api_client, driver_headers):
        resp = api_client.get("/audit-logs", headers=driver_headers)
        assert resp.status_code == 403
