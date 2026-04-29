export function ForceUpdateOverlay() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'var(--theme-bg-primary)' }}>
      <div className="text-center px-6">
        <div className="mx-auto w-10 h-10 border-3 border-t-transparent rounded-full animate-spin mb-4"
          style={{ borderColor: 'var(--theme-brand-primary)', borderTopColor: 'transparent' }} />
        <p className="text-lg font-bold" style={{ color: 'var(--theme-text-primary)' }}>
          Đang cập nhật ứng dụng...
        </p>
        <p className="text-sm mt-2" style={{ color: 'var(--theme-text-muted)' }}>
          Vui lòng chờ trong giây lát
        </p>
      </div>
    </div>
  )
}
