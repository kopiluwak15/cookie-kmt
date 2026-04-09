'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCachedStaffInfo } from '@/lib/cached-auth'

/**
 * 美容師免許の写真をアップロード
 * Supabase Storage の license-images バケットに保存
 * ファイル名: {staff_id}.jpg
 */
export async function uploadLicense(formData: FormData) {
  const staff = await getCachedStaffInfo()
  if (!staff) return { error: 'ログインが必要です' }

  const file = formData.get('file') as File | null
  if (!file) return { error: 'ファイルが選択されていません' }

  // ファイルサイズ制限（5MB）
  if (file.size > 5 * 1024 * 1024) {
    return { error: 'ファイルサイズは5MB以下にしてください' }
  }

  // 画像ファイルのみ許可
  if (!file.type.startsWith('image/')) {
    return { error: '画像ファイル（JPG/PNG）のみアップロードできます' }
  }

  const supabase = createAdminClient()

  // 拡張子を取得
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filePath = `${staff.id}.${ext}`

  // アップロード（既存ファイルは上書き）
  const { error: uploadError } = await supabase.storage
    .from('license-images')
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    })

  if (uploadError) {
    console.error('[License Upload] error:', uploadError.message)
    return { error: `アップロードに失敗しました: ${uploadError.message}` }
  }

  // staffテーブルにファイルパスを保存
  const { error: updateError } = await supabase
    .from('staff')
    .update({ license_image_path: filePath })
    .eq('id', staff.id)

  if (updateError) {
    console.error('[License Upload] DB update error:', updateError.message)
    return { error: 'ファイルは保存されましたが、データベースの更新に失敗しました' }
  }

  return { success: true, path: filePath }
}

/**
 * 美容師免許の画像URLを取得
 */
export async function getLicenseUrl(staffId: string): Promise<string | null> {
  const supabase = createAdminClient()

  // staffのlicense_image_pathを取得
  const { data: staff } = await supabase
    .from('staff')
    .select('license_image_path')
    .eq('id', staffId)
    .single()

  if (!staff?.license_image_path) return null

  // 署名付きURL生成（1時間有効）
  const { data } = await supabase.storage
    .from('license-images')
    .createSignedUrl(staff.license_image_path, 3600)

  return data?.signedUrl ?? null
}
