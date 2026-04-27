/**
 * LIFF / ブラウザ側のジオロケーション取得ヘルパー
 *
 * navigator.geolocation.getCurrentPosition を Promise 化し、
 * 失敗時は {lat: null, lng: null} を返す（サーバー側で「位置情報未取得」として拒否される）。
 */

export interface UserCoords {
  lat: number | null
  lng: number | null
}

const DEFAULT_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 60000,
}

export async function getUserCoords(
  options: PositionOptions = DEFAULT_OPTIONS
): Promise<UserCoords> {
  if (typeof window === 'undefined' || !window.navigator?.geolocation) {
    return { lat: null, lng: null }
  }

  return new Promise<UserCoords>((resolve) => {
    let settled = false
    const safety = setTimeout(() => {
      if (!settled) {
        settled = true
        resolve({ lat: null, lng: null })
      }
    }, (options.timeout ?? 8000) + 1000)

    try {
      window.navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (settled) return
          settled = true
          clearTimeout(safety)
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
        },
        () => {
          if (settled) return
          settled = true
          clearTimeout(safety)
          resolve({ lat: null, lng: null })
        },
        options
      )
    } catch {
      if (settled) return
      settled = true
      clearTimeout(safety)
      resolve({ lat: null, lng: null })
    }
  })
}
