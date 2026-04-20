import { useState } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
import { Button } from '@/components/ui/button'
import { Camera, Upload, Image, CheckCircle, X } from 'lucide-react'

const mockPhotos = [
  { id: 'P1', url: '', containerNumber: 'MSKU-7283456', type: 'Nạp hàng', timestamp: '20/04/2025 08:30', status: 'uploaded' },
  { id: 'P2', url: '', containerNumber: 'MSKU-7283456', type: 'Seal', timestamp: '20/04/2025 08:35', status: 'uploaded' },
  { id: 'P3', url: '', containerNumber: 'MSKU-1122987', type: 'Dỡ hàng', timestamp: '19/04/2025 16:20', status: 'uploaded' },
]

export default function DriverPhotos() {
  const [showCamera, setShowCamera] = useState(false)

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <GlassCard className="p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-navy-50 flex items-center justify-center mx-auto mb-4 text-navy-300">
          <Camera size={32} />
        </div>
        <h3 className="text-sm font-bold text-navy-900">Chụp ảnh container</h3>
        <p className="text-[11px] text-gray-400 mt-1 mb-4">Chụp ảnh container, seal, chứng từ cho OCR</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => setShowCamera(true)} className="bg-gold-400 text-navy-950 hover:bg-gold-300 font-semibold gap-2">
            <Camera size={16}/> Chụp ảnh
          </Button>
          <Button variant="outline" className="gap-2">
            <Upload size={16}/> Tải lên
          </Button>
        </div>
      </GlassCard>

      {/* Recent photos */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">Ảnh gần đây</h4>
        {mockPhotos.map((p) => (
          <GlassCard key={p.id} className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-navy-100 flex items-center justify-center text-navy-300 shrink-0">
                <Image size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-navy-900">{p.type}</span>
                  {p.status === 'uploaded' && <CheckCircle size={14} className="text-emerald-500" />}
                </div>
                <p className="text-[11px] text-gray-400 font-mono-num">Cont: {p.containerNumber}</p>
                <p className="text-[10px] text-gray-400">{p.timestamp}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
