"""Concrete repository implementations for the Operations context."""

from __future__ import annotations

from datetime import date
from typing import Sequence

from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.contexts.operations.domain.entities import BookedTrip, DeliveredTrip
from app.contexts.operations.domain.repositories import (
    BookedTripRepository,
    DeliveredTripRepository,
)
from app.contexts.operations.domain.value_objects import (
    BookedTripId,
    DeliveredTripId,
)
from app.contexts.operations.infrastructure.mappers import (
    booked_trip_to_domain,
    booked_trip_to_orm,
    delivered_trip_to_domain,
    delivered_trip_to_orm,
)
from app.contexts.operations.infrastructure.orm import (
    BookedTripORM,
    DeliveredTripORM,
)
from app.models.domain import MappingProfile


# ── BookedTrip ────────────────────────────────────────────────────


class SqlBookedTripRepository(BookedTripRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _hydrate(self, orm: BookedTripORM) -> BookedTrip:
        return booked_trip_to_domain(orm)

    async def get_by_id(self, tid: BookedTripId) -> BookedTrip | None:
        orm = (await self.session.execute(
            select(BookedTripORM).where(BookedTripORM.id == int(tid))
        )).scalar_one_or_none()
        return await self._hydrate(orm) if orm else None

    async def list(
        self,
        *,
        offset: int,
        limit: int,
        client_id: int | None = None,
        trip_date_from: date | None = None,
        trip_date_to: date | None = None,
    ) -> tuple[Sequence[BookedTrip], int]:
        q = select(BookedTripORM)
        if client_id is not None:
            q = q.where(BookedTripORM.client_id == client_id)
        if trip_date_from is not None:
            q = q.where(BookedTripORM.trip_date >= trip_date_from)
        if trip_date_to is not None:
            q = q.where(BookedTripORM.trip_date <= trip_date_to)
        total = await self.session.scalar(
            select(func.count()).select_from(q.subquery())
        ) or 0
        q = q.order_by(BookedTripORM.id.desc()).offset(offset).limit(limit)
        rows = list((await self.session.execute(q)).scalars().all())
        items = [await self._hydrate(r) for r in rows]
        return items, int(total)

    async def find_duplicate(
        self,
        *,
        client_id: int,
        trip_date: date,
        container_number: str,
    ) -> BookedTrip | None:
        q = (
            select(BookedTripORM)
            .where(
                BookedTripORM.client_id == client_id,
                BookedTripORM.trip_date == trip_date,
                BookedTripORM.cont_number == container_number,
            )
            .limit(1)
        )
        orm = (await self.session.execute(q)).scalars().first()
        return await self._hydrate(orm) if orm else None

    async def add(self, t: BookedTrip) -> BookedTrip:
        orm = booked_trip_to_orm(t)
        self.session.add(orm)
        await self.session.flush()
        return await self._hydrate(orm)

    async def save(self, t: BookedTrip) -> BookedTrip:
        existing = (await self.session.execute(
            select(BookedTripORM).where(BookedTripORM.id == int(t.id))
        )).scalar_one()
        booked_trip_to_orm(t, existing)
        await self.session.flush()
        return await self._hydrate(existing)

    async def delete(self, tid: BookedTripId) -> None:
        orm = (await self.session.execute(
            select(BookedTripORM).where(BookedTripORM.id == int(tid))
        )).scalar_one_or_none()
        if orm is None:
            return
        await self.session.delete(orm)
        await self.session.flush()


# ── DeliveredTrip ────────────────────────────────────────────────────


class SqlDeliveredTripRepository(DeliveredTripRepository):
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def _hydrate(self, orm: DeliveredTripORM) -> DeliveredTrip:
        return delivered_trip_to_domain(orm)

    async def get_by_id(self, wid: DeliveredTripId) -> DeliveredTrip | None:
        orm = (await self.session.execute(
            select(DeliveredTripORM).where(DeliveredTripORM.id == int(wid))
        )).scalar_one_or_none()
        return await self._hydrate(orm) if orm else None

    async def list(
        self,
        *,
        offset: int,
        limit: int,
        client_id: int | None = None,
        driver_id: int | None = None,
        vendor_id: int | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        matched: bool | None = None,
        sort_by: str | None = None,
        sort_order: str = 'desc',
        search: str | None = None,
    ) -> tuple[Sequence[DeliveredTrip], int]:
        from app.models.domain import Client as ClientORM
        q = select(DeliveredTripORM).options(
            selectinload(DeliveredTripORM.client),
            selectinload(DeliveredTripORM.pickup_location),
            selectinload(DeliveredTripORM.dropoff_location),
            selectinload(DeliveredTripORM.driver),
            selectinload(DeliveredTripORM.vendor),
        )
        if client_id is not None:
            q = q.where(DeliveredTripORM.client_id == client_id)
        if driver_id is not None:
            q = q.where(DeliveredTripORM.driver_id == driver_id)
        if vendor_id is not None:
            q = q.where(DeliveredTripORM.vendor_id == vendor_id)
        if search:
            from sqlalchemy import exists
            from app.core.vi_search import vi_ilike
            from app.models.domain import Location as LocationORM
            client_exists = exists().where(
                ClientORM.id == DeliveredTripORM.client_id,
                or_(
                    vi_ilike(ClientORM.name, search),
                    vi_ilike(ClientORM.code, search),
                ),
            )
            pickup_exists = exists().where(
                LocationORM.id == DeliveredTripORM.pickup_location_id,
                vi_ilike(LocationORM.name, search),
            )
            dropoff_exists = exists().where(
                LocationORM.id == DeliveredTripORM.dropoff_location_id,
                vi_ilike(LocationORM.name, search),
            )
            q = q.where(or_(
                vi_ilike(DeliveredTripORM.vessel, search),
                vi_ilike(DeliveredTripORM.cont_number, search),
                vi_ilike(DeliveredTripORM.work_type, search),
                client_exists,
                pickup_exists,
                dropoff_exists,
            ))
        if date_from is not None:
            q = q.where(
                (DeliveredTripORM.trip_date >= date_from) |
                ((DeliveredTripORM.trip_date == None) & (DeliveredTripORM.created_at >= date_from))  # noqa: E711
            )
        if date_to is not None:
            q = q.where(
                (DeliveredTripORM.trip_date <= date_to) |
                ((DeliveredTripORM.trip_date == None) & (DeliveredTripORM.created_at <= date_to))  # noqa: E711
            )
        if matched is not None:
            if matched:
                q = q.where(DeliveredTripORM.booked_trip_id.isnot(None))
            else:
                q = q.where(DeliveredTripORM.booked_trip_id.is_(None))
        total = await self.session.scalar(
            select(func.count()).select_from(q.subquery())
        ) or 0
        # Dynamic sort
        _SORTABLE_DIRECT = {
            'trip_date': DeliveredTripORM.trip_date,
            'vessel': DeliveredTripORM.vessel,
            'matched': DeliveredTripORM.booked_trip_id,
            'revenue': DeliveredTripORM.revenue,
            'created_at': DeliveredTripORM.created_at,
            'cont_number': DeliveredTripORM.cont_number,
            'cont_type': DeliveredTripORM.cont_type,
            'work_type': DeliveredTripORM.work_type,
        }
        sort_col = _SORTABLE_DIRECT.get(sort_by or '') if sort_by else None

        if sort_col is None and sort_by:
            from app.models.domain import Client as ClientORM, Location as LocationORM
            _JOIN_SORTS = {
                'client_code': (ClientORM, DeliveredTripORM.client_id, 'code'),
                'vehicle_plate': (None, DeliveredTripORM.vehicle_plate, None),
                'pickup_name': (LocationORM, DeliveredTripORM.pickup_location_id, 'name'),
                'dropoff_name': (LocationORM, DeliveredTripORM.dropoff_location_id, 'name'),
            }
            join_spec = _JOIN_SORTS.get(sort_by)
            if join_spec:
                model, fk_col, attr_name = join_spec
                q = q.outerjoin(model, model.id == fk_col)
                sort_col = getattr(model, attr_name)

        if sort_col is not None:
            order_expr = sort_col.asc() if sort_order == 'asc' else sort_col.desc()
            q = q.order_by(order_expr, DeliveredTripORM.id.desc())
        else:
            q = q.order_by(DeliveredTripORM.id.desc())
        q = q.offset(offset).limit(limit)
        rows = list((await self.session.execute(q)).scalars().all())
        items = [await self._hydrate(r) for r in rows]
        return items, int(total)

    async def list_by_ids(
        self, ids: Sequence[DeliveredTripId]
    ) -> Sequence[DeliveredTrip]:
        if not ids:
            return []
        rows = list((await self.session.execute(
            select(DeliveredTripORM)
            .options(
                selectinload(DeliveredTripORM.client),
                selectinload(DeliveredTripORM.pickup_location),
                selectinload(DeliveredTripORM.dropoff_location),
                selectinload(DeliveredTripORM.driver),
                selectinload(DeliveredTripORM.vendor),
            )
            .where(DeliveredTripORM.id.in_([int(i) for i in ids]))
        )).scalars().all())
        return [await self._hydrate(r) for r in rows]

    async def find_duplicate_containers(
        self,
        *,
        date_from: date | None = None,
        date_to: date | None = None,
        client_id: int | None = None,
        driver_id: int | None = None,
    ) -> list:
        """Return container numbers that appear on 2+ delivered trips in the window.

        Matching key is normalized (TRIM + lower) so 'hacu1234567' and
        'HACU1234567 ' collapse into one group.

        Implementation: query all matching trips in one shot, then group in
        Python — keeps the SQL portable to SQLite (no array_agg) and Postgres.
        """
        from collections import defaultdict

        from app.contexts.operations.application.dto import DuplicateContainerGroup

        normalized = func.lower(func.trim(DeliveredTripORM.cont_number))

        # Step 1: identify duplicate keys (unfiltered by client/driver so a cont
        # that appears twice across clients still counts) within the date window
        dup_q = (
            select(normalized.label("key"), func.count().label("cnt"))
            .where(
                DeliveredTripORM.cont_number.isnot(None),
                DeliveredTripORM.cont_number != "",
            )
            .group_by(normalized)
            .having(func.count() > 1)
        )
        if date_from is not None:
            dup_q = dup_q.where(DeliveredTripORM.trip_date >= date_from)
        if date_to is not None:
            dup_q = dup_q.where(DeliveredTripORM.trip_date <= date_to)

        dup_keys = {key for key, _ in (await self.session.execute(dup_q)).all() if key}
        if not dup_keys:
            return []

        # Step 2: fetch every trip whose normalized key is in the duplicate set,
        # re-applying client/driver filters so the returned count reflects the
        # caller's scope
        keys = list(dup_keys)
        trips_q = select(
            DeliveredTripORM.cont_number,
            DeliveredTripORM.id,
            DeliveredTripORM.trip_date,
            DeliveredTripORM.driver_id,
        ).where(normalized.in_(keys))
        if date_from is not None:
            trips_q = trips_q.where(DeliveredTripORM.trip_date >= date_from)
        if date_to is not None:
            trips_q = trips_q.where(DeliveredTripORM.trip_date <= date_to)
        if client_id is not None:
            trips_q = trips_q.where(DeliveredTripORM.client_id == client_id)
        if driver_id is not None:
            trips_q = trips_q.where(DeliveredTripORM.driver_id == driver_id)

        buckets: dict[str, list[tuple]] = defaultdict(list)
        for raw, trip_id, trip_date, trip_driver_id in (await self.session.execute(trips_q)).all():
            key = (raw or "").strip().lower()
            if not key:
                continue
            buckets[key].append((raw, trip_id, trip_date, trip_driver_id))

        groups: list[DuplicateContainerGroup] = []
        for key, items in buckets.items():
            # A container duplicated globally but reduced to a single trip by
            # the caller's client/driver scope is NOT a duplicate in that
            # scope — drop it so callers never see a count==1 "duplicate".
            if len(items) < 2:
                continue
            display_cont = next(
                (r.strip() for r, _, _, _ in items if r and r.strip()),
                key.upper(),
            )
            groups.append(DuplicateContainerGroup(
                cont_number=display_cont,
                count=len(items),
                trip_ids=[int(i) for _, i, _, _ in items],
                trip_dates=[d for _, _, d, _ in items],
                driver_ids=[dr if dr is not None else None for _, _, _, dr in items],
            ))
        groups.sort(key=lambda g: (-g.count, g.cont_number))
        return groups

    async def find_duplicate_candidates(
        self,
        *,
        driver_id: int,
        photo_hash: str | None = None,
        cont_number: str | None = None,
        pickup_location_id: int | None = None,
        dropoff_location_id: int | None = None,
        cont_type: str | None = None,
        since: date | None = None,
        exclude_trip_id: int | None = None,
    ) -> list:
        """Existing trips by the same driver that look like the submitted one.

        Two tiers (``work_type`` ignored):
          * Tier 1 (strongest): identical ``cont_photo_hash``.
          * Tier 2: container edit distance <= 1 AND same pickup AND same
            dropoff AND same cont_type.

        The candidate set is tiny (one driver, ~7 days) so we fetch once and
        score in Python.
        """
        from app.contexts.operations.application.dto import DuplicateCheckCandidate
        from app.utils.fuzzy import container_edit_distance
        from app.utils.iso6346 import normalize_container_number

        q = select(
            DeliveredTripORM.id,
            DeliveredTripORM.cont_number,
            DeliveredTripORM.cont_type,
            DeliveredTripORM.cont_photo_hash,
            DeliveredTripORM.pickup_location_id,
            DeliveredTripORM.dropoff_location_id,
            DeliveredTripORM.work_type,
            DeliveredTripORM.trip_date,
            DeliveredTripORM.created_at,
        ).where(DeliveredTripORM.driver_id == driver_id)
        if since is not None:
            q = q.where(
                (DeliveredTripORM.trip_date >= since)
                | (
                    (DeliveredTripORM.trip_date == None)  # noqa: E711
                    & (DeliveredTripORM.created_at >= since)
                )
            )
        if exclude_trip_id is not None:
            q = q.where(DeliveredTripORM.id != exclude_trip_id)

        rows = (await self.session.execute(q)).all()

        norm_input = normalize_container_number(cont_number) if cont_number else ""
        candidates: list[DuplicateCheckCandidate] = []
        for (
            trip_id,
            t_cont,
            t_type,
            t_hash,
            t_pickup,
            t_dropoff,
            t_work,
            t_date,
            t_created,
        ) in rows:
            # Tier 1: identical photo content hash.
            if photo_hash and t_hash and t_hash == photo_hash:
                candidates.append(
                    DuplicateCheckCandidate(
                        trip_id=int(trip_id),
                        cont_number=t_cont,
                        trip_date=t_date,
                        work_type=t_work or "",
                        created_at=t_created,
                        reason="photo",
                        photo_match=True,
                    )
                )
                continue

            # Tier 2: same container (fuzzy) + same route + same type.
            if norm_input and t_cont:
                t_norm = normalize_container_number(t_cont)
                dist = container_edit_distance(norm_input, t_norm)
                if (
                    dist is not None
                    and dist <= 1
                    and pickup_location_id is not None
                    and t_pickup == pickup_location_id
                    and dropoff_location_id is not None
                    and t_dropoff == dropoff_location_id
                    and cont_type is not None
                    and (t_type or None) == (cont_type or None)
                ):
                    candidates.append(
                        DuplicateCheckCandidate(
                            trip_id=int(trip_id),
                            cont_number=t_cont,
                            trip_date=t_date,
                            work_type=t_work or "",
                            created_at=t_created,
                            reason="fields",
                            photo_match=False,
                        )
                    )

        # Photo matches first; within each tier, newest first (stable sort).
        candidates.sort(key=lambda c: c.created_at, reverse=True)
        candidates.sort(key=lambda c: 0 if c.photo_match else 1)
        return candidates

    async def add(self, w: DeliveredTrip) -> DeliveredTrip:
        orm = delivered_trip_to_orm(w)
        self.session.add(orm)
        await self.session.flush()
        return await self._hydrate(orm)

    async def save(self, w: DeliveredTrip) -> DeliveredTrip:
        existing = (await self.session.execute(
            select(DeliveredTripORM).where(DeliveredTripORM.id == int(w.id))
        )).scalar_one()
        delivered_trip_to_orm(w, existing)
        await self.session.flush()
        return await self._hydrate(existing)

    async def delete(self, wid: DeliveredTripId) -> None:
        orm = (await self.session.execute(
            select(DeliveredTripORM).where(DeliveredTripORM.id == int(wid))
        )).scalar_one_or_none()
        if orm is None:
            return
        await self.session.delete(orm)
        await self.session.flush()


# ── MappingProfile ────────────────────────────────────────────────────


class MappingProfileRepository:
    """Async repository for MappingProfile persistence.

    Caller owns the transaction (via get_db dependency). We only flush.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        profile_name: str,
        template_filename: str,
        header_signature: str,
        column_mapping_json: str,
        pivot_columns_json: str,
        created_by_id: int,
        is_active: bool = True,
    ) -> MappingProfile:
        profile = MappingProfile(
            profile_name=profile_name,
            template_filename=template_filename,
            header_signature=header_signature,
            column_mapping_json=column_mapping_json,
            pivot_columns_json=pivot_columns_json,
            created_by_id=created_by_id,
            is_active=is_active,
        )
        self.session.add(profile)
        await self.session.flush()
        return profile

    async def get_by_signature(self, header_signature: str) -> MappingProfile | None:
        stmt = (
            select(MappingProfile)
            .where(
                MappingProfile.header_signature == header_signature,
                MappingProfile.is_active == True,  # noqa: E712
            )
            .order_by(MappingProfile.use_count.desc(), MappingProfile.last_used_at.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_by_id(self, profile_id: int) -> MappingProfile | None:
        stmt = select(MappingProfile).where(MappingProfile.id == profile_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_active(
        self, profile_name: str | None = None
    ) -> Sequence[MappingProfile]:
        stmt = select(MappingProfile).where(
            MappingProfile.is_active == True  # noqa: E712
        )
        if profile_name:
            stmt = stmt.where(MappingProfile.profile_name == profile_name)
        stmt = stmt.order_by(
            MappingProfile.use_count.desc(),
            MappingProfile.last_used_at.desc(),
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def mark_used(self, profile_id: int) -> None:
        stmt = (
            update(MappingProfile)
            .where(MappingProfile.id == profile_id)
            .values(
                last_used_at=func.now(),
                use_count=MappingProfile.use_count + 1,
            )
        )
        await self.session.execute(stmt)
