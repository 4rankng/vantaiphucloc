# Task 0064 — Feature: One Chuyến Can Match Multiple Đơn Hàng (Multi-Container Trip)

**Type:** Missing Feature / Data Model Gap  
**Priority:** High  
**Affects:** ketoan — Ghép chuyến, Backend — matching logic  
**Source:** Product owner instruction (2026-05-11) + Excel analysis

---

## Background

Analysis of `Phúc Lộc - Shipside T4.26 HAP.xlsx` confirms the real-world operating model:

**One chuyến đã đi (driver trip) regularly carries 2–9 containers in a single run.**

Example from the data — Vehicle `15C09877` on `05/04/2026`, route `HẢI AN → NHĐV`:
- Container `HACU2244459` — 20ft, hàng, price 386,100₫
- Container `DFSU1742543` — 20ft, hàng, price 386,100₫
- Container `TRHU3363204` — 20ft, hàng, price 386,100₫
- Container `SEKU1943065` — 20ft, hàng, price 386,100₫
- Container `HACU2162807` — 20ft, hàng, price 386,100₫
- Container `TCLU6756518` — 40ft, hàng, price 448,500₫  ← different size = different price
- Container `SEKU6806506` — 40ft, hàng, price 448,500₫
- Container `MAGU5769815` — 40ft, hàng, price 448,500₫

**8 đơn hàng, 1 chuyến, 1 tài xế, same day and route, but 2 different unit prices (20ft vs 40ft).**

In this month alone: **89 out of 113 recorded trip-days were multi-container runs.**

---

## Current System Problem

The current matching model appears to be **1 work order ↔ 1 đơn hàng (trip order)**. This does not reflect reality:

- A tài xế creates **one work order** for a run (one vehicle, one date, one route)
- But that run may have **2, 3, 5, or even 9 containers** = 9 separate đơn hàng to bill the client
- The system must allow **one work order to match multiple đơn hàng**

---

## Required Changes

### 1. Matching Model: 1-to-Many
A single driver work order should be linkable to **multiple trip orders (đơn hàng)**, one per container carried.

- Work order has: vehicle plate, date, route (pickup → dropoff)
- Matching criteria: vehicle plate + date + route matches the `SỐ XE VC`, `Ngày`, and `NƠI LẤY/TRẢ` fields on the đơn hàng rows
- All đơn hàng with the same vehicle + date + route belong to the same chuyến

### 2. Match UI: Show Multiple Đơn Hàng per Work Order
In the Ghép chuyến panel (ketoan), when a work order is selected:
- Show **all matching đơn hàng** for that trip (grouped by vehicle + date + route)
- Allow the accountant to confirm the full group at once
- Display per-container details: container number, size (20/40), type (H/R), unit price

### 3. Earnings Calculation: Per-Container, Not Per-Trip
Driver earnings (tài xế thu nhập) are currently calculated per work order match. With multi-container trips, the driver's contribution must account for all containers delivered in that run.

- If a driver delivers 5 × 20ft containers in one trip, their earnings reflect 5 matched đơn hàng
- The salary computation should sum across all đơn hàng linked to a work order

### 4. Trip Order List: Group View Option
In the trip order list (`/accountant/trips`), add the ability to:
- Group by chuyến (vehicle + date + route) to see how many containers per run
- Show total value per run (sum of all container prices for that trip)

---

## Acceptance Criteria

- [ ] A single work order can be matched to 2+ đơn hàng simultaneously
- [ ] The match panel shows all đơn hàng grouped under one chuyến when vehicle + date + route match
- [ ] Driver earnings correctly aggregate across all containers in a matched run
- [ ] The trip order list can display a "per chuyến" grouped view
- [ ] Unmatching a work order detaches all linked đơn hàng (or provides choice to detach selectively)

---

## Notes
- The vehicle plate number (`SỐ XE VC`) in the Excel import is the link between a client's đơn hàng and a driver's work order. This field must be stored on đơn hàng and used in matching logic.
- Container number alone cannot be used for trip grouping — the grouping key is **vehicle + date + route**.

## Blocker

This is a major feature request requiring schema changes (matching model 1-to-many), backend logic overhaul, and UI redesign. Too large for bug-fix workflow. Requires dedicated sprint planning and implementation.
