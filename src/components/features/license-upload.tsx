'use client'

import { useState, useRef } from 'react'
import { uploadLicense } from '@/actions/license'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Camera, Upload, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface LicenseUploadProps {
  currentImageUrl: string | null
  hasLicense: boolean
}

export function LicenseUpload({ currentImageUrl, hasLicense }: LicenseUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl)
  const [uploaded, setUploaded] = useState(hasLicense)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // プレビュー表示
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    // アップロード
    setUploading(true)
    try {
      const formData = new FormData()
      formData.set('file', file)
      const result = await uploadLicense(formData)

      if (result.error) {
        toast.error(result.error)
        setPreviewUrl(currentImageUrl)
        return
      }

      toast.success('美容師免許をアップロードしました')
      setUploaded(true)
    } finally {
      setUploading(false)
      // inputをリセット
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">アップロード状況</span>
        {uploaded ? (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            提出済み
          </Badge>
        ) : (
          <Badge variant="outline" className="text-gray-500 border-gray-300">
            未提出
          </Badge>
        )}
      </div>

      {/* プレビュー */}
      {previewUrl && (
        <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border bg-gray-50">
          <Image
            src={previewUrl}
            alt="美容師免許"
            fill
            className="object-contain"
            unoptimized
          />
        </div>
      )}

      {/* アップロードボタン */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            アップロード中...
          </>
        ) : uploaded ? (
          <>
            <Camera className="h-4 w-4 mr-2" />
            写真を変更する
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            美容師免許の写真をアップロード
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground">
        JPG・PNG対応（5MB以下）
      </p>
    </div>
  )
}
