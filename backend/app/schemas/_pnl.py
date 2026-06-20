from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field

__all__ = [
    "ClientRevenueBreakdownOut",
    "MonthlyPnLOut",
    "DriverSalarySummaryItem",
    "DashboardSummaryOut",
    "KpiTrendDeltas",
    "KpiTrendsOut",
    "VehicleExpenseSummary",
    "VehiclePnLRow",
    "VehiclePnLResponse",
    "TripDayBucket",
    "TripDailyStatsOut",
    "DirectorDashboardOut",
    "DirectorDashboardDrilldownOut",
    "DirectorDashboardDrilldownTotals",
    "DirectorDashboardDrilldownClient",
    "DirectorDashboardDrilldownVehicle",
    "VehiclePnLGroup",
]


# ---------------------------------------------------------------------------
# P&L dashboard
# ---------------------------------------------------------------------------


class ClientRevenueBreakdownOut(BaseModel):
    client_id: int
    client_name: str
    matched_trip_count: int
    revenue: int


class MonthlyPnLOut(BaseModel):
    start_date: date
    end_date: date
    revenue: int
    total_productivity_salary: int
    total_allowance: int
    total_base_salary: int
    total_vehicle_expenses: int = 0
    total_vendor_cost: int = 0
    profit: int
    matched_trip_count: int
    client_breakdown: list[ClientRevenueBreakdownOut]


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------


class DriverSalarySummaryItem(BaseModel):
    driver_id: int
    driver_name: str
    total_jobs: int
    total_salary: int


class DashboardSummaryOut(BaseModel):
    total_revenue: int
    total_expense: int
    trip_count: int
    active_trips: int
    outstanding_debt: int
    driver_salary_summary: list[DriverSalarySummaryItem] = []
    unmatched_delivered_trip_count: int = 0
    pending_trip_count: int = 0


class KpiTrendDeltas(BaseModel):
    """Percent change comparing the second half of the window vs the first half."""

    unmatched_delivered_trips: float = 0.0
    pending_trips: float = 0.0
    driver_salary: float = 0.0
    revenue: float = 0.0


class KpiTrendsOut(BaseModel):
    """Daily time-series for accountant dashboard KPI cards."""

    end_date: date
    days: int
    labels: list[str]
    unmatched_delivered_trips: list[int]
    pending_trips: list[int]
    driver_salary: list[int]
    revenue: list[int]
    deltas: KpiTrendDeltas


# ---------------------------------------------------------------------------
# Per-vehicle P&L
# ---------------------------------------------------------------------------


class VehicleExpenseSummary(BaseModel):
    """Expense subtotals by category for one vehicle."""

    xang_dau: int = 0
    sua_chua: int = 0
    tien_luat: int = 0
    khac: int = 0
    total: int = 0


class VehiclePnLRow(BaseModel):
    """P&L breakdown for a single vehicle in a period."""

    vehicle_id: int
    plate: str
    is_vendor: bool = False
    vendor_name: str | None = None
    revenue: int
    cp_xe: VehicleExpenseSummary
    cp_luong_san_luong: int
    cp_luong_co_ban: int
    cp_vendor: int = 0
    loi_nhuan: int


class VehiclePnLResponse(BaseModel):
    date_from: date
    date_to: date
    rows: list[VehiclePnLRow]
    total_revenue: int
    total_profit: int


class TripDayBucket(BaseModel):
    day: int
    date: str = ""
    matched: int = 0
    pending: int = 0


class TripDailyStatsOut(BaseModel):
    date_from: date
    date_to: date
    total: int = 0
    matched: int = 0
    pending: int = 0
    internal_count: int = 0
    vendor_count: int = 0
    total_revenue: int = 0
    match_rate: float | None = None
    buckets: list[TripDayBucket] = []


# ---------------------------------------------------------------------------
# Director dashboard
# ---------------------------------------------------------------------------


class DirectorKpiTrend(BaseModel):
    value: str
    positive: bool


class DirectorRouteStat(BaseModel):
    name: str
    count: int


class DirectorDriverStat(BaseModel):
    name: str
    plate: str = ""
    trip_count: int


class VehiclePnLGroup(BaseModel):
    """A PnL group (own fleet or from-vendor) bundling the rows and totals."""

    rows: list[VehiclePnLRow] = []
    total_revenue: int = 0
    total_cost: int = 0
    total_profit: int = 0
    trip_count: int = 0


class DirectorDashboardDrilldownTotals(BaseModel):
    total: int = 0
    matched: int = 0
    pending: int = 0
    revenue: int = 0
    cost: int = 0
    profit: int = 0


class DirectorDashboardDrilldownVehicle(BaseModel):
    vehicle_plate: str
    trip_count: int = 0
    matched: int = 0
    pending: int = 0
    revenue: int = 0
    cost: int = 0
    profit: int = 0


class DirectorDashboardDrilldownClient(BaseModel):
    client_id: int
    client_name: str
    trip_count: int = 0
    matched: int = 0
    pending: int = 0
    revenue: int = 0
    cost: int = 0
    profit: int = 0
    vehicles: list[DirectorDashboardDrilldownVehicle] = []


class DirectorDashboardDrilldownOut(BaseModel):
    date_from: date
    date_to: date
    totals: DirectorDashboardDrilldownTotals
    clients: list[DirectorDashboardDrilldownClient] = []


class DirectorDashboardOut(BaseModel):
    total: int = 0
    matched: int = 0
    pending: int = 0
    match_rate: float | None = None
    revenue: int = 0
    avg_revenue_per_trip: int = 0
    total_cost: int = 0
    profit: int = 0
    total_delta: float | None = None
    matched_delta: float | None = None
    pending_delta: float | None = None
    revenue_delta: float | None = None
    cost_delta: float | None = None
    profit_delta: float | None = None
    buckets: list[TripDayBucket] = []
    top_routes: list[DirectorRouteStat] = []
    top_drivers: list[DirectorDriverStat] = []
    own_fleet_pnl: VehiclePnLGroup = Field(default_factory=lambda: VehiclePnLGroup())
    vendor_pnl: VehiclePnLGroup = Field(default_factory=lambda: VehiclePnLGroup())
