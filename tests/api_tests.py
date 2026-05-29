#!/usr/bin/env python3
"""
Smoke tests for vantaiphucloc backend API.
Tests key endpoints across all user roles (giamdoc, ketoan, laixe).

Usage:
    python tests/api_tests.py
    make api-test
"""

from __future__ import annotations

import sys
import time

import httpx

# ── Config ─────────────────────────────────────────────────────────────────────

BASE_URL = "http://localhost:8100/api/v1"
TIMEOUT = 30.0

PROFILES: dict[str, dict] = {
    "giamdoc": {"username": "giamdoc", "password": "admin123", "role": "director"},
    "ketoan":  {"username": "ketoan",  "password": "admin123", "role": "accountant"},
    "laixe":   {"username": "laixe",   "password": "admin123", "role": "driver"},
}

# Default date range used for dashboard queries
DATE_FROM = "2026-04-21"
DATE_TO   = "2026-05-20"


# ── Helpers ────────────────────────────────────────────────────────────────────

class C:
    """ANSI colours — disabled when stdout is not a TTY."""
    GRN = "\033[92m" if sys.stdout.isatty() else ""
    RED = "\033[91m" if sys.stdout.isatty() else ""
    YLW = "\033[93m" if sys.stdout.isatty() else ""
    BLD = "\033[1m"  if sys.stdout.isatty() else ""
    RST = "\033[0m"  if sys.stdout.isatty() else ""


def _tsv(fail: bool, msg: str) -> str:
    sym = f"{C.RED}✗" if fail else f"{C.GRN}✓"
    return f"  {sym}{C.RST} {msg}"


passed = 0
failed = 0


def ok(msg: str) -> None:
    global passed
    passed += 1
    print(_tsv(False, msg))


def fail(msg: str, detail: str = "") -> None:
    global failed
    failed += 1
    print(_tsv(True, msg))
    if detail:
        print(f"      {detail[:300]}")


def info(msg: str) -> None:
    print(f"  {C.YLW}→{C.RST} {msg}")


# ── Core ───────────────────────────────────────────────────────────────────────

class ApiTester:
    def __init__(self) -> None:
        self.client = httpx.Client(base_url=BASE_URL, timeout=TIMEOUT)
        self.tokens: dict[str, str] = {}

    # ── auth ────────────────────────────────────────────────────────────────

    def _login(self, profile: str) -> bool:
        creds = PROFILES[profile]
        for attempt in range(3):
            resp = self.client.post("/auth/login", json=creds)
            if resp.status_code == 200:
                self.tokens[profile] = resp.json()["access_token"]
                return True
            if resp.status_code == 429:
                time.sleep(2**attempt)
                continue
            return False
        return False

    def _ensure_laixe(self) -> None:
        """Create the laixe driver account if it doesn't exist yet."""
        if not self._login("ketoan"):
            fail("Cannot login as ketoan — cannot create laixe account")
            return

        resp = self.client.post(
            "/drivers",
            json={
                "username": "laixe",
                "phone": "0999000001",
                "full_name": "Lái Xế Test",
                "password": "admin123",
            },
            headers=self._hdr("ketoan"),
        )
        if resp.status_code in (200, 201):
            info("Created laixe account via /drivers")
        elif resp.status_code == 400 and ("already" in resp.text.lower() or "exists" in resp.text.lower()):
            info("laixe account already exists")
        else:
            # Fallback: try /users endpoint
            resp2 = self.client.post(
                "/users",
                json={
                    "username": "laixe",
                    "password": "admin123",
                    "phone": "0999000001",
                    "full_name": "Lái Xế Test",
                    "role": "driver",
                },
                headers=self._hdr("ketoan"),
            )
            if resp2.status_code in (200, 201):
                info("Created laixe account via /users")
            elif "already" in resp2.text.lower() or "exists" in resp2.text.lower():
                info("laixe account already exists (via /users)")
            else:
                fail("Cannot create laixe account", f"/drivers: {resp.status_code} | /users: {resp2.status_code}")

    def _hdr(self, profile: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.tokens[profile]}"}

    # ── single endpoint check ───────────────────────────────────────────────

    def check(
        self,
        label: str,
        profile: str,
        method: str,
        path: str,
        expected: int = 200,
        **kwargs,
    ) -> httpx.Response | None:
        resp = self.client.request(method, path, headers=self._hdr(profile), **kwargs)
        tag = f"[{profile}] {label}"
        if resp.status_code == expected:
            ok(f"{tag} → {resp.status_code}")
            return resp
        fail(f"{tag} → {resp.status_code} (expected {expected})", resp.text)
        return None

    # ── test phases ─────────────────────────────────────────────────────────

    def phase_auth(self) -> None:
        print(f"\n{C.BLD}Phase 1 — Authentication{C.RST}")
        for name in PROFILES:
            if self._login(name):
                ok(f"Login {name} ({PROFILES[name]['role']})")
            else:
                fail(f"Login {name} failed")
                if name == "laixe":
                    info("Attempting to create laixe account …")
                    self._ensure_laixe()
                    if self._login("laixe"):
                        ok("Login laixe after account creation")
                    else:
                        fail("Login laixe still failing after creation attempt")

        if not self.tokens:
            fail("No profiles could login — is the backend running on :8100?")
            self.client.close()
            sys.exit(1)

    def phase_dashboard(self) -> None:
        print(f"\n{C.BLD}Phase 2 — Dashboard{C.RST}")

        for profile in self.tokens:
            # trip-daily-stats (the primary endpoint requested)
            resp = self.check(
                f"trip-daily-stats ({DATE_FROM} → {DATE_TO})",
                profile, "GET",
                f"/dashboard/trip-daily-stats?date_from={DATE_FROM}&date_to={DATE_TO}",
            )
            if resp:
                d = resp.json()
                info(
                    f"total={d.get('total', 0)}  matched={d.get('matched', 0)}  "
                    f"pending={d.get('pending', 0)}  revenue={d.get('total_revenue', 0)}"
                )

            # dashboard summary
            self.check("dashboard summary", profile, "GET", "/dashboard/summary")

            # dashboard notifications
            self.check("dashboard notifications", profile, "GET", "/dashboard/notifications")

    def phase_role_access(self) -> None:
        """Verify role-based access control for key resources."""
        print(f"\n{C.BLD}Phase 3 — Role Access{C.RST}")

        for profile in self.tokens:
            role = PROFILES[profile]["role"]

            # ── drivers list (all roles can read) ──────────────────────────
            self.check("list drivers", profile, "GET", "/drivers")

            # ── users list (accountant+ only) ──────────────────────────────
            if role in ("director", "accountant", "superadmin"):
                self.check("list users", profile, "GET", "/users")
            else:
                self.check("list users (expect 403)", profile, "GET", "/users", expected=403)

            # ── clients (partners) list ──────────────────────────────────
            self.check("list clients", profile, "GET", "/clients")

            # ── locations list ─────────────────────────────────────────────
            self.check("list locations", profile, "GET", "/locations")

            # ── booked trips (work orders) ─────────────────────────────────
            self.check("list booked-trips", profile, "GET", "/booked-trips")

            # ── delivered trips (trip orders) ──────────────────────────────
            self.check("list delivered-trips", profile, "GET", "/delivered-trips")

    def phase_date_variations(self) -> None:
        """Test trip-daily-stats with different date ranges."""
        print(f"\n{C.BLD}Phase 4 — Date Range Variations{C.RST}")

        if "ketoan" not in self.tokens:
            info("Skipping — ketoan not authenticated")
            return

        p = "ketoan"
        cases = [
            ("single day",     "2026-05-01", "2026-05-01"),
            ("one week",       "2026-05-01", "2026-05-07"),
            ("one month",      "2026-05-01", "2026-05-31"),
            ("future range",   "2099-01-01", "2099-01-31"),
            ("past range",     "2020-01-01", "2020-12-31"),
        ]
        for label, df, dt in cases:
            resp = self.check(
                f"trip-daily-stats ({label})",
                p, "GET",
                f"/dashboard/trip-daily-stats?date_from={df}&date_to={dt}",
            )
            if resp:
                d = resp.json()
                info(f"total={d.get('total', 0)}  buckets={len(d.get('buckets', []))}")

        # invalid date format → should return 422
        self.check(
            "trip-daily-stats (bad date → 422)",
            p, "GET",
            "/dashboard/trip-daily-stats?date_from=not-a-date&date_to=2026-05-20",
            expected=422,
        )

    def phase_unauth(self) -> None:
        """Verify unauthenticated requests are rejected."""
        print(f"\n{C.BLD}Phase 5 — Unauthenticated Access{C.RST}")

        paths = [
            ("GET", "/dashboard/trip-daily-stats?date_from=2026-05-01&date_to=2026-05-20"),
            ("GET", "/dashboard/summary"),
            ("GET", "/drivers"),
            ("GET", "/users"),
        ]
        for method, path in paths:
            resp = self.client.request(method, path)
            tag = f"no-auth {method} {path.split('?')[0]}"
            if resp.status_code == 401:
                ok(f"{tag} → 401")
            else:
                fail(f"{tag} → {resp.status_code} (expected 401)")

    # ── main runner ─────────────────────────────────────────────────────────

    def run(self) -> bool:
        print(f"\n{C.BLD}{'=' * 50}")
        print(f"  Vantaiphucloc API Smoke Tests")
        print(f"  {BASE_URL}")
        print(f"{'=' * 50}{C.RST}")

        self.phase_auth()
        self.phase_dashboard()
        self.phase_role_access()
        self.phase_date_variations()
        self.phase_unauth()

        # ── Summary ────────────────────────────────────────────────────────
        print(f"\n{C.BLD}{'=' * 50}")
        print(f"  Results:  {C.GRN}{passed} passed{C.RST}  {C.RED}{failed} failed{C.RST}")
        print(f"{'=' * 50}{C.RST}\n")

        self.client.close()
        return failed == 0


# ── Entry ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    success = ApiTester().run()
    sys.exit(0 if success else 1)
