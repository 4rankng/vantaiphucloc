import { useState, useCallback, useMemo, useRef } from 'react'
import { apiClient } from '@/services/api'
import type { PhotoMeta } from '@/components/shared/overlays/ContainerScanner'
import type { ContType, WorkType, DeliveredTrip } from '@/data/domain'
import { CONT_TYPES } from '@/data/domain'

/**
 * ContainerForm — per-container row of the create-trip form.
 *
 * `contType` and `workType` are independent:
 *   - contType: ContType ('E20' | 'E40' | 'F20' | 'F40') — the physical container.
 *   - workType: operation performed (e.g. 'CHẠY SÀ LAN', 'ĐÓNG KHO', or a free-text custom value).
 *
 * Either may be empty (null). Both are written to the API as separate columns.
 */
export interface ContainerForm {
  containerNumber: string
  contType: ContType | null
  workType: WorkType | null
  photoTaken: boolean
  photoDataUrl?: string
  photoLat?: number | null
  photoLng?: number | null
  photoTimestamp?: string | null
  ocrLoading: boolean
  ocrError?: string
}

const EMPTY_CONT: ContainerForm = {
  containerNumber: '',
  contType: null,
  workType: null,
  photoTaken: false,
  ocrLoading: false,
}

const CONT_TYPE_SET: ReadonlySet<string> = new Set(CONT_TYPES)

/** Backward-compat: if workType historically held a ContType, treat it as contType instead. */
export function migrateWorkType(contType: ContType | null, workType: WorkType | null): [ContType | null, WorkType | null] {
  if (!contType && workType && CONT_TYPE_SET.has(workType)) return [workType as ContType, null]
  return [contType, workType]
}

/** Omit a key from a record without mutating. */
function omitKey<V>(obj: Record<number, V>, k: number): Record<number, V> {
  const { [k]: _, ...rest } = obj
  return rest
}

/** Client-side ISO 6346 container number validation. Returns error message or null. */
export function validateContainerFormat(num: string): string | null {
  const raw = num.replace(/-/g, '').toUpperCase().trim()
  if (!raw) return null
  if (raw.length < 11) return 'Cần 4 chữ cái + 7 số (vd: MSKU1234567)'
  if (raw.length > 11) return 'Quá dài — đúng 11 ký tự (4 chữ cái + 7 số)'
  if (!/^[A-Z]{4}\d{7}$/.test(raw)) return 'Sai định dạng. Đúng: 4 chữ cái + 7 số (vd: MSKU1234567)'
  return null
}

function woToContainers(wo: DeliveredTrip): ContainerForm[] {
  const [contType, workType] = migrateWorkType(wo.contType ?? null, wo.workType ?? null)
  return [{
    containerNumber: wo.contNumber ?? '',
    contType,
    workType,
    photoTaken: false,
    ocrLoading: false,
  }]
}

/**
 * Manages container state, OCR scanning, and ISO 6346 validation.
 *
 * Extracted from useCreateDeliveredTrip to isolate the ~300 lines of
 * container/OCR logic from the form submission and reference-data concerns.
 */
export function useContainerManager(existingDeliveredTrip?: DeliveredTrip | null) {
  // Container state — pre-populate from existing WO when editing
  const [containers, setContainers] = useState<ContainerForm[]>(
    existingDeliveredTrip ? woToContainers(existingDeliveredTrip) : [{ ...EMPTY_CONT }],
  )

  // Scanner state
  const [scannerOpen, setScannerOpen] = useState(false)
  const [activeContIdx, setActiveContIdx] = useState(0)

  // Consecutive OCR failure tracking
  const [consecutiveOCRFailures, setConsecutiveOCRFailures] = useState(0)
  const forceManualEntry = consecutiveOCRFailures >= 2

  // Per-container validation errors and check-digit suggestions
  const [containerErrors, setContainerErrors] = useState<Record<number, string>>({})
  const [containerSuggestions, setContainerSuggestions] = useState<Record<number, string[]>>({})
  const [containerIsoValidating, setContainerIsoValidating] = useState<Record<number, boolean>>({})

  // Shared photo from last scan — stored once, uploaded for first trip, URL shared to rest
  const lastScanPhotoRef = useRef<{ dataUrl: string; lat: number | null; lng: number | null; timestamp: string } | null>(null)

  // Debounce timers for backend validation
  const validateTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  /** Apply the validate-container response to error + suggestion state for one row. */
  const applyValidationResult = useCallback((
    idx: number,
    res: Awaited<ReturnType<typeof apiClient.validateContainer>>,
  ) => {
    const invalid = !res.success || !res.data?.valid
    setContainerIsoValidating(prev => omitKey(prev, idx))
    setContainerErrors(prev => {
      if (invalid) return { ...prev, [idx]: res.data?.error ?? 'Số container không hợp lệ' }
      return omitKey(prev, idx)
    })
    setContainerSuggestions(prev => {
      const list = invalid ? (res.data?.suggestions ?? []) : []
      if (list.length === 0) {
        if (!(idx in prev)) return prev
        return omitKey(prev, idx)
      }
      return { ...prev, [idx]: list }
    })
  }, [])

  // ─── OCR Scanner ──────────────────────────────────────────────────────────

  const handleScanComplete = useCallback((imageSrc: string, meta: PhotoMeta) => {
    // Capture index immediately — activeContIdx may change by the time .then() fires
    const idx = activeContIdx
    setScannerOpen(false)

    // Store photo in ref (not per-container) for upload-once sharing
    lastScanPhotoRef.current = {
      dataUrl: imageSrc,
      lat: meta.lat,
      lng: meta.lng,
      timestamp: meta.timestamp,
    }

    // Set loading state on active container
    setContainers(prev => prev.map((c, i) =>
      i === idx ? { ...c, ocrLoading: true, ocrError: undefined, photoTaken: true, photoDataUrl: imageSrc } : c
    ))

    apiClient.ocrContainer(imageSrc)
      .then((result) => {
        if (result.success && result.containerNumbers.length > 0) {
          setConsecutiveOCRFailures(0)
          const numbers = result.containerNumbers

          setContainers(prev => {
            // Inherit cont type + work type from the first container (or form defaults)
            const currentContType = prev[0]?.contType ?? null
            const currentWorkType = prev[0]?.workType ?? null

            // Deduplicate against existing container numbers
            const existingNumbers = new Set(
              prev.map(c => c.containerNumber.trim()).filter(Boolean)
            )
            const newNumbers = numbers.filter(n => !existingNumbers.has(n))

            // Map to ContainerForm — first new container inherits photo from scan
            const scanPhoto = prev[idx]?.photoDataUrl
            const newContainers: ContainerForm[] = newNumbers.map((n, ni) => ({
              containerNumber: n,
              contType: currentContType,
              workType: currentWorkType,
              photoTaken: ni === 0 && !!scanPhoto,
              photoDataUrl: ni === 0 ? scanPhoto : undefined,
              ocrLoading: false,
            }))

            // Remove the placeholder container at [idx] if it was empty
            const activeEmpty = prev[idx]?.containerNumber.trim() === ''
            const filtered = activeEmpty
              ? prev.filter((_, i) => i !== idx)
              : prev

            return [...filtered, ...newContainers]
          })

          // Validate each OCR-detected number (full ISO 6346 incl. check digit).
          // Auto-correct via backend suggestions when available.
          numbers.forEach(num => {
            apiClient.validateContainer(num).then(vRes => {
              if (vRes.success && vRes.data?.valid) return
              if (vRes.data?.suggestions?.length) {
                const corrected = vRes.data.suggestions[0]
                setContainers(prev => {
                  const alreadyExists = prev.some(c => c.containerNumber === corrected && c.containerNumber !== num)
                  if (alreadyExists) {
                    return prev.filter(c => c.containerNumber !== num)
                  }
                  return prev.map(c =>
                    c.containerNumber === num ? { ...c, containerNumber: corrected } : c
                  )
                })
              } else {
                // No suggestion — mark badge as invalid
                setContainers(prev => {
                  const i = prev.findIndex(c => c.containerNumber === num)
                  if (i >= 0) applyValidationResult(i, vRes)
                  return prev
                })
              }
            }).catch(() => { /* network error — ignore */ })
          })
        } else {
          // No containers detected — show error on the active slot
          setConsecutiveOCRFailures(prev => prev + 1)
          setContainers(prev => prev.map((c, i) =>
            i === idx
              ? { ...c, ocrLoading: false, ocrError: result.error ?? 'Không nhận diện được' }
              : c
          ))
        }
      })
      .catch(() => {
        setContainers(prev => prev.map((c, i) =>
          i === idx ? { ...c, ocrLoading: false, ocrError: 'Lỗi kết nối AI' } : c
        ))
      })
  }, [activeContIdx, applyValidationResult])

  // ─── Container CRUD ───────────────────────────────────────────────────────

  const updateContainer = useCallback(<K extends keyof ContainerForm>(
    idx: number,
    field: K,
    value: ContainerForm[K],
  ) => {
    // Normalize container numbers on input — strip hyphens, uppercase
    const normalizedValue: ContainerForm[K] = field === 'containerNumber' && typeof value === 'string'
      ? (value.replace(/-/g, '').toUpperCase() as ContainerForm[K])
      : value
    setContainers(prev => prev.map((c, i) =>
      i === idx ? { ...c, [field]: normalizedValue } : c,
    ))
    if (field === 'containerNumber') {
      const numStr = normalizedValue as string
      // Any edit invalidates the previous suggestions — they were for the old value.
      setContainerSuggestions(prev => {
        if (!(idx in prev)) return prev
        return omitKey(prev, idx)
      })
      // Frontend format check — immediate
      const fmtErr = validateContainerFormat(numStr)
      if (fmtErr) {
        setContainerErrors(prev => ({ ...prev, [idx]: fmtErr }))
        clearTimeout(validateTimers.current[idx])
        return
      }
      // Format OK — debounce backend ISO 6346 check (check digit)
      clearTimeout(validateTimers.current[idx])
      const raw = numStr.trim()
      if (!raw || raw.length !== 11) {
        setContainerErrors(prev => { return omitKey(prev, idx) })
        return
      }
      validateTimers.current[idx] = setTimeout(() => {
        apiClient.validateContainer(raw).then(res => {
          applyValidationResult(idx, res)
        }).catch(() => { /* ignore network errors here */ })
      }, 400)
    }
  }, [applyValidationResult])

  const validateContainerOnBlur = useCallback((idx: number) => {
    const cont = containers[idx]
    if (!cont) return
    const raw = cont.containerNumber.trim()
    const fmtErr = validateContainerFormat(raw)
    if (fmtErr) {
      setContainerErrors(prev => ({ ...prev, [idx]: fmtErr }))
      clearTimeout(validateTimers.current[idx])
      return
    }
    if (!raw || raw.length !== 11) {
      setContainerErrors(prev => { return omitKey(prev, idx) })
      clearTimeout(validateTimers.current[idx])
      return
    }
    clearTimeout(validateTimers.current[idx])
    apiClient.validateContainer(raw).then(res => {
      applyValidationResult(idx, res)
    }).catch(() => {})
  }, [containers, applyValidationResult])

  const removeContainer = useCallback((idx: number) => {
    setContainers(prev => prev.filter((_, i) => i !== idx))
    // Re-key the error + suggestion maps to match the new indices.
    const reindex = <V,>(map: Record<number, V>): Record<number, V> => {
      const next: Record<number, V> = {}
      Object.entries(map).forEach(([k, v]) => {
        const oldIdx = Number(k)
        if (oldIdx === idx) return
        next[oldIdx > idx ? oldIdx - 1 : oldIdx] = v
      })
      return next
    }
    setContainerErrors(prev => reindex(prev))
    setContainerSuggestions(prev => reindex(prev))
  }, [])

  /**
   * Apply a server-suggested correction to a container number. Auto-runs
   * validation so the error message + suggestion chips clear on success.
   */
  const applyContainerSuggestion = useCallback((idx: number, suggestion: string) => {
    const alreadyExists = containers.some((c, i) => i !== idx && c.containerNumber === suggestion)
    if (alreadyExists) {
      removeContainer(idx)
      return
    }

    setContainers(prev => prev.map((c, i) =>
      i === idx ? { ...c, containerNumber: suggestion } : c,
    ))
    // Clear the stale suggestions immediately
    setContainerSuggestions(prev => {
      if (!(idx in prev)) return prev
      return omitKey(prev, idx)
    })
    clearTimeout(validateTimers.current[idx])
    apiClient.validateContainer(suggestion).then(res => {
      applyValidationResult(idx, res)
    }).catch(() => {})
  }, [containers, removeContainer, applyValidationResult])

  // Shared cont type / work type — updates ALL containers at once
  const updateAllContType = useCallback((ct: ContType | null) => {
    setContainers(prev => prev.map(c => ({ ...c, contType: ct })))
  }, [])

  const updateAllWorkType = useCallback((wt: WorkType | null) => {
    setContainers(prev => prev.map(c => ({ ...c, workType: wt })))
  }, [])

  /** Open scanner targeting first empty container (or append a new one). */
  const scanNewContainer = useCallback(() => {
    const emptyIdx = containers.findIndex(c => !c.containerNumber.trim())
    if (emptyIdx >= 0) {
      setActiveContIdx(emptyIdx)
    } else {
      setContainers(prev => [...prev, { ...EMPTY_CONT }])
      setActiveContIdx(containers.length)
    }
    setScannerOpen(true)
  }, [containers])

  /** Commit a number as a new container badge (fills empty slot or appends). */
  const addContainerWithNumber = useCallback((number: string) => {
    const emptyIdx = containers.findIndex(c => !c.containerNumber.trim())
    const targetIdx = emptyIdx >= 0 ? emptyIdx : containers.length
    setContainers(prev => {
      const contType = prev[0]?.contType ?? null
      const workType = prev[0]?.workType ?? null
      if (emptyIdx >= 0) {
        return prev.map((c, i) =>
          i === emptyIdx ? { ...c, containerNumber: number, contType, workType } : c
        )
      }
      return [...prev, { ...EMPTY_CONT, containerNumber: number, contType, workType }]
    })
    setContainerIsoValidating(prev => ({ ...prev, [targetIdx]: true }))
    apiClient.validateContainer(number).then(res => {
      applyValidationResult(targetIdx, res)
    }).catch(() => {
      setContainerIsoValidating(prev => omitKey(prev, targetIdx))
    })
  }, [containers, applyValidationResult])

  // Whether any container has a photo taken (for nudge UI)
  const hasAnyPhoto = useMemo(() =>
    containers.some(c => c.photoTaken),
    [containers],
  )

  // Number of non-empty containers (for summary / multi-trip display)
  const containerCount = useMemo(() =>
    containers.filter(c => c.containerNumber.trim()).length,
    [containers],
  )

  return {
    containers,
    // Scanner
    scannerOpen, setScannerOpen,
    forceManualEntry,
    handleScanComplete,
    scanNewContainer,
    // Validation
    containerErrors,
    setContainerErrors,
    containerSuggestions,
    containerIsoValidating,
    validateContainerOnBlur,
    applyContainerSuggestion,
    validateContainerFormat,
    // CRUD
    updateContainer,
    removeContainer,
    addContainerWithNumber,
    updateAllContType,
    updateAllWorkType,
    // Photo
    lastScanPhotoRef,
    // Derived
    hasAnyPhoto,
    containerCount,
  }
}
