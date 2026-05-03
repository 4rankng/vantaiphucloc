from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.repositories.client_repo import ClientRepository
from app.repositories.location_repo import LocationRepository
from app.repositories.pricing_repo import PricingRepository
from app.repositories.route_repo import RouteRepository
from app.repositories.salary_repo import SalaryPeriodConfigRepository, SalaryPeriodRepository
from app.repositories.trip_order_repo import TripOrderRepository
from app.repositories.user_repo import UserRepository
from app.repositories.vendor_repo import VendorRepository
from app.repositories.work_order_repo import WorkOrderRepository


def get_location_repo(db: AsyncSession = Depends(get_db)) -> LocationRepository:
    return LocationRepository(session=db)


def get_vendor_repo(db: AsyncSession = Depends(get_db)) -> VendorRepository:
    return VendorRepository(session=db)


def get_client_repo(db: AsyncSession = Depends(get_db)) -> ClientRepository:
    return ClientRepository(session=db)


def get_route_repo(db: AsyncSession = Depends(get_db)) -> RouteRepository:
    return RouteRepository(session=db)


def get_pricing_repo(db: AsyncSession = Depends(get_db)) -> PricingRepository:
    return PricingRepository(session=db)


def get_work_order_repo(db: AsyncSession = Depends(get_db)) -> WorkOrderRepository:
    return WorkOrderRepository(session=db)


def get_trip_order_repo(db: AsyncSession = Depends(get_db)) -> TripOrderRepository:
    return TripOrderRepository(session=db)


def get_user_repo(db: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(session=db)


def get_salary_repo(db: AsyncSession = Depends(get_db)) -> SalaryPeriodRepository:
    return SalaryPeriodRepository(session=db)


def get_salary_config_repo(db: AsyncSession = Depends(get_db)) -> SalaryPeriodConfigRepository:
    return SalaryPeriodConfigRepository(session=db)
