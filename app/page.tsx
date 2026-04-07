export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-brand-900 mb-2">
            cookie-kmt
          </h1>
          <p className="text-lg text-brand-600">
            LINE CRM System
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <p className="text-brand-700 mb-6">
            縮毛矯正・髪質改善に特化した<br />
            LINE CRM システム
          </p>

          <div className="space-y-3">
            <a
              href="/customer/checkin"
              className="block w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-lg transition"
            >
              📱 チェックイン（QR読込）
            </a>

            <a
              href="/staff/login"
              className="block w-full bg-brand-200 hover:bg-brand-300 text-brand-900 font-semibold py-3 rounded-lg transition"
            >
              👤 スタッフログイン
            </a>

            <a
              href="/admin"
              className="block w-full bg-gray-400 hover:bg-gray-500 text-white font-semibold py-3 rounded-lg transition"
            >
              ⚙️ 管理画面
            </a>
          </div>
        </div>

        <p className="text-sm text-brand-600">
          v0.1.0 - Phase 0 基盤
        </p>
      </div>
    </main>
  );
}
