// DEPRECATED: Route table removed entirely.
// Routes no longer exist as a separate entity. Location-based routing is used instead.
// This file is kept empty to prevent import errors during migration.

import type { ApiResponse } from '@/data/domain'

export interface RouteCreatePayload { route: string; pickupLocationId: number; dropoffLocationId: number }
export interface RouteUpdatePayload { route?: string; pickupLocationId?: number; dropoffLocationId?: number }

export async function getRoutes(): Promise<ApiResponse<never[]>> { return { data: [], success: true } }
export async function createRoute(_data: RouteCreatePayload): Promise<ApiResponse<never>> { throw new Error('Routes removed') }
export async function updateRoute(_id: number | string, _data: RouteUpdatePayload): Promise<ApiResponse<never>> { throw new Error('Routes removed') }
export async function deleteRoute(_id: number | string): Promise<ApiResponse<{ success: boolean }>> { throw new Error('Routes removed') }
