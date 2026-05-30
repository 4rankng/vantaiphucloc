import { useState, useMemo, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useDrivers,
  useVehicleDrivers,
  useAddVehicleDriver,
  useRemoveVehicleDriver,
  useCreateVehicle,
  useCreateDriver,
  useUpdateDriver,
  useDeleteVehicle,
  useDeleteDriver,
  useVehicles,
} from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import { api } from '@/services/api/client'
import { apiClient } from '@/services/api'
import { fuzzyMatch } from '@/lib/search-utils'
import { groupByVehicle } from '@/lib/accounting-utils'
import { useInfiniteScroll } from '@/components/shared/ListUtils'
import type { Driver } from '@/data/domain'

export type FocusableField = 'fullName' | 'phone' | 'plate'
export type FocusState = FocusableField | null

export interface DriverRowFormData {
  fullName: string
  phone: string
  plate: string
}

const BATCH = 15

export function useFleetManager() {
  const toast = useToast()
  const qc = useQueryClient()

  const { data: vdRows = [], isLoading: vdLoading } = useVehicleDrivers()
  const { data: driversList = [], isLoading: driversLoading } = useDrivers()
  const { data: vehicles = [] } = useVehicles()

  const createVehicle = useCreateVehicle()
  const createDriver = useCreateDriver()
  const updateDriver = useUpdateDriver()
  const addVehicleDriver = useAddVehicleDriver()
  const removeVehicleDriver = useRemoveVehicleDriver()
  const deleteVehicle = useDeleteVehicle()
  const deleteDriver = useDeleteDriver()

  const groups = useMemo(() => groupByVehicle(vdRows, vehicles), [vdRows, vehicles])

  const assignedDriverIds = useMemo(() => {
    const set = new Set<number>()
    for (const g of groups) {
      for (const d of g.drivers) {
        set.add(d.driverId)
      }
    }
    return set
  }, [groups])

  const multiDriverVehicles = useMemo(() => groups.filter((g) => g.drivers.length > 1).length, [groups])
  const vehiclesWithoutDriver = useMemo(() => groups.filter((g) => g.drivers.length === 0).length, [groups])
  const driversWithoutVehicle = Math.max(0, driversList.length - assignedDriverIds.size)

  const [fleetSearch, setFleetSearch] = useState('')
  const [fleetLimit, setFleetLimit] = useState(BATCH)
  const [driverSearch, setDriverSearch] = useState('')
  const [driverLimit, setDriverLimit] = useState(BATCH)

  const handleFleetSearch = useCallback((q: string) => {
    setFleetSearch(q)
    setFleetLimit(BATCH)
  }, [])

  const handleDriverSearch = useCallback((q: string) => {
    setDriverSearch(q)
    setDriverLimit(BATCH)
  }, [])

  const filteredGroups = useMemo(() => {
    const q = fleetSearch.trim()
    if (!q) return groups
    return groups.filter((g) => fuzzyMatch(g.plate, q) || g.drivers.some((d) => fuzzyMatch(d.driverName, q)))
  }, [groups, fleetSearch])

  const visibleGroups = filteredGroups.slice(0, fleetLimit)
  const fleetHasMore = fleetLimit < filteredGroups.length
  const loadMoreFleet = useCallback(() => setFleetLimit((n) => n + BATCH), [])
  const fleetSentinel = useInfiniteScroll(loadMoreFleet)

  const filteredDrivers = useMemo(() => {
    const q = driverSearch.trim()
    if (!q) return driversList
    return driversList.filter(
      (d) =>
        fuzzyMatch(d.fullName ?? d.username, q) ||
        fuzzyMatch(d.phone ?? '', q) ||
        fuzzyMatch(d.vehiclePlate ?? '', q)
    )
  }, [driversList, driverSearch])

  const visibleDrivers = filteredDrivers.slice(0, driverLimit)
  const driverHasMore = driverLimit < filteredDrivers.length
  const loadMoreDrivers = useCallback(() => setDriverLimit((n) => n + BATCH), [])
  const driverSentinel = useInfiniteScroll(loadMoreDrivers)

  const [savingDriver, setSavingDriver] = useState(false)

  const addVehicle = useCallback(
    async (plate: string) => {
      try {
        await createVehicle.mutateAsync(plate)
        toast.success('Đã thêm xe')
      } catch {
        toast.error('Không thể thêm xe')
      }
    },
    [createVehicle, toast]
  )

  const handleCreateDriver = useCallback(
    async (data: { username: string; fullName: string; phone: string; plate: string; password?: string }) => {
      try {
        await createDriver.mutateAsync({
          username: data.username,
          fullName: data.fullName,
          phone: data.phone,
          password: data.password,
          plate: data.plate.trim() || undefined,
        })
        toast.success('Đã thêm lái xe')
        qc.invalidateQueries({ queryKey: ['vehicles'] })
      } catch {
        toast.error('Không thể thêm lái xe')
      }
    },
    [createDriver, toast, qc]
  )

  const handleUpdateDriver = useCallback(
    async (driver: Driver, data: DriverRowFormData) => {
      setSavingDriver(true)
      try {
        const updates: Record<string, string> = {}
        if (data.fullName !== (driver.fullName ?? '')) {
          updates.full_name = data.fullName
        }
        if (data.phone !== (driver.phone ?? '')) {
          updates.phone = data.phone
        }
        if (Object.keys(updates).length > 0) {
          await updateDriver.mutateAsync({ id: driver.id, data: updates })
        }
        // Refresh UI with name/phone changes before attempting vehicle update
        qc.invalidateQueries({ queryKey: ['drivers'] })
        qc.invalidateQueries({ queryKey: ['vehicles'] })
        qc.invalidateQueries({ queryKey: ['vehicle-drivers'] })

        if (data.plate !== undefined && data.plate !== (driver.vehiclePlate ?? '')) {
          try {
            await api.put(`/drivers/${driver.id}/vehicle`, { plate: data.plate })
          } catch {
            // Vehicle update failed but name/phone were already saved
            toast.error('Đã lưu thông tin, nhưng không thể cập nhật biển số xe')
            qc.invalidateQueries({ queryKey: ['drivers'] })
            qc.invalidateQueries({ queryKey: ['vehicle-drivers'] })
            return
          }
        }
        toast.success('Đã lưu thay đổi')
      } catch {
        toast.error('Không thể lưu')
        throw new Error('Save failed')
      } finally {
        setSavingDriver(false)
      }
    },
    [updateDriver, qc, toast]
  )

  const handleAddDriverToVehicle = useCallback(
    async (vehicleId: number, driverId: number, effectiveFrom: string) => {
      try {
        await addVehicleDriver.mutateAsync({ vehicleId, driverId, effectiveFrom })
        toast.success('Đã thêm lái xe')
        qc.invalidateQueries({ queryKey: ['drivers'] })
      } catch {
        toast.error('Không thể thêm lái xe')
      }
    },
    [addVehicleDriver, toast, qc]
  )

  const confirmRemoveDriver = useCallback(
    async (vdId: number) => {
      try {
        await removeVehicleDriver.mutateAsync(vdId)
        toast.success('Đã gỡ lái xe')
        qc.invalidateQueries({ queryKey: ['drivers'] })
      } catch {
        toast.error('Không thể gỡ lái xe')
      }
    },
    [removeVehicleDriver, toast, qc]
  )

  const handleResetPassword = useCallback(
    async (driverId: number, currentUsername: string, data: { username: string; password: string }) => {
      const hasPwd = data.password.trim().length > 0
      const hasUser = data.username.trim() !== currentUsername
      if (!hasPwd && !hasUser) return
      try {
        const updates: Record<string, unknown> = {}
        if (hasUser) updates.username = data.username.trim()
        if (hasPwd) updates.password = data.password.trim()
        await apiClient.updateUser(driverId, updates)
        if (hasPwd && hasUser) {
          toast.success('Đã đổi mật khẩu & tên đăng nhập')
        } else if (hasPwd) {
          toast.success('Đã đổi mật khẩu')
        } else {
          toast.success('Đã đổi tên đăng nhập')
        }
        qc.invalidateQueries({ queryKey: ['drivers'] })
        qc.invalidateQueries({ queryKey: ['drivers-paged'] })
        qc.invalidateQueries({ queryKey: ['vehicle-drivers'] })
      } catch {
        toast.error('Không thể lưu thay đổi')
        throw new Error('Reset password failed')
      }
    },
    [toast, qc]
  )

  const handleDeleteVehicle = useCallback(
    async (id: number) => {
      try {
        await deleteVehicle.mutateAsync(id)
        toast.success('Đã vô hiệu hoá xe')
      } catch {
        toast.error('Không thể xoá xe')
      }
    },
    [deleteVehicle, toast]
  )

  const handleDeleteDriver = useCallback(
    async (id: number) => {
      try {
        await deleteDriver.mutateAsync(id)
        toast.success('Đã vô hiệu hoá lái xe')
      } catch {
        toast.error('Không thể xoá lái xe')
      }
    },
    [deleteDriver, toast]
  )

  return {
    data: {
      groups,
      drivers: driversList,
      vehicles,
    },
    stats: {
      vehicleCount: groups.length,
      driverCount: driversList.length,
      multiDriverVehicles,
      vehiclesWithoutDriver,
      driversWithoutVehicle,
    },
    fleet: {
      search: fleetSearch,
      setSearch: handleFleetSearch,
      visibleGroups,
      hasMore: fleetHasMore,
      sentinel: fleetSentinel,
    },
    driverList: {
      search: driverSearch,
      setSearch: handleDriverSearch,
      visibleDrivers,
      hasMore: driverHasMore,
      sentinel: driverSentinel,
    },
    actions: {
      addVehicle,
      createDriver: handleCreateDriver,
      updateDriver: handleUpdateDriver,
      addDriverToVehicle: handleAddDriverToVehicle,
      removeDriver: confirmRemoveDriver,
      resetPassword: handleResetPassword,
      deleteVehicle: handleDeleteVehicle,
      deleteDriver: handleDeleteDriver,
    },
    loading: {
      vdLoading,
      driversLoading,
      addVehiclePending: createVehicle.isPending,
      createDriverPending: createDriver.isPending,
      savingDriver,
      deleteVehiclePending: deleteVehicle.isPending,
      deleteDriverPending: deleteDriver.isPending,
    },
  }
}
