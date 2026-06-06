import { useRef } from 'react'
import { Upload } from 'lucide-react'

interface FileDropZoneProps {
  onFileSelect: (file: File) => void
  accept?: string
}

export function FileDropZone({ onFileSelect, accept = '.xlsx,.xls,.csv' }: FileDropZoneProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    dropRef.current?.classList.add('is-dragging')
  }

  function handleDragLeave() {
    dropRef.current?.classList.remove('is-dragging')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    dropRef.current?.classList.remove('is-dragging')
    const file = e.dataTransfer.files?.[0]
    if (file) onFileSelect(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset so the same file can be re-selected after error/reset
    e.target.value = ''
    if (file) onFileSelect(file)
  }

  return (
    <>
      <div
        ref={dropRef}
        onClick={() => fileRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="nepo-dropzone"
        style={{ minHeight: 130 }}
      >
        <Upload
          className="h-7 w-7 mb-2"
          style={{ color: 'var(--ink-3)' }}
          strokeWidth={1.5}
        />
        <p
          className="text-[13.5px] font-semibold m-0"
          style={{ color: 'var(--ink)' }}
        >
          Kéo & thả file vào đây
        </p>
        <p className="text-[12px] m-0 mt-1" style={{ color: 'var(--ink-3)' }}>
          hoặc nhấn để chọn từ máy · .xlsx .xls .csv
        </p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
    </>
  )
}
