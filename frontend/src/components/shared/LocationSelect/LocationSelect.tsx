import { useState, useCallback, useMemo, useRef } from 'react'
import { InlineSelect } from '@/components/shared/InlineSelect/InlineSelect'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { useLocations, useCreateLocation } from '@/hooks/use-queries'
import { useToast } from '@/components/atoms/Toast'
import type { InlineSelectOption } from '@/components/shared/InlineSelect/InlineSelect'

interface LocationSelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function LocationSelect({ value, onChange, placeholder = 'Chọn địa điểm' }: LocationSelectProps) {
  const { data: locations = [] } = useLocations()
  const createLocation = useCreateLocation()
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const options: InlineSelectOption[] = useMemo(
    () => locations.map(l => ({ value: l.name, label: l.name })),
    [locations],
  )

  const handleCreate = useCallback(async () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    const res = await createLocation.mutateAsync({ name: trimmed })
    onChange(res.name)
    setCreateOpen(false)
    setNewName('')
  }, [newName, createLocation, onChange])

  const handleCreateNew = useCallback(() => {
    setNewName('')
    setCreateOpen(true)
  }, [])

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setCreateOpen(false)
      setNewName('')
      // Return focus to the input to prevent aria-hidden focus trap
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [])

  return (
    <>
      <InlineSelect
        placeholder={placeholder}
        value={value}
        options={options}
        onChange={onChange}
        onCreateNew={handleCreateNew}
        createNewLabel="Tạo địa điểm mới"
      />
      <Dialog open={createOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo địa điểm mới</DialogTitle>
          </DialogHeader>
          <Input
            ref={inputRef}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            placeholder="Nhập tên địa điểm"
            className="text-sm"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)} className="flex-1">Huỷ</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()} className="flex-1 btn-primary">
              Tạo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
