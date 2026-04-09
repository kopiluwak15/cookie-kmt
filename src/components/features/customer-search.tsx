'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { searchCustomers, getRecentCustomers, getTodayCheckedInCustomers, createCustomer } from '@/actions/customers'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Search, UserPlus, Users, Clock, QrCode } from 'lucide-react'

interface CustomerResult {
  id: string
  customer_code: string
  name: string
  name_kana: string | null
  phone: string | null
  last_visit_date: string | null
  line_user_id: string | null
}

interface CustomerSearchProps {
  onSelect: (customer: CustomerResult) => void
  selectedCustomer: CustomerResult | null
  /** trueの場合、本日チェックイン済み＋未ログの顧客のみ表示 */
  checkedInOnly?: boolean
}

export function CustomerSearch({
  onSelect,
  selectedCustomer,
  checkedInOnly = false,
}: CustomerSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CustomerResult[]>([])
  const [recentCustomers, setRecentCustomers] = useState<CustomerResult[]>([])
  const [checkedInCustomers, setCheckedInCustomers] = useState<CustomerResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showMode, setShowMode] = useState<'search' | 'recent' | 'checkedin'>('recent')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 初回ロード
  useEffect(() => {
    if (checkedInOnly) {
      loadCheckedInCustomers()
    } else {
      loadRecentCustomers()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedInOnly])

  // 外側クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadRecentCustomers() {
    try {
      const data = await getRecentCustomers()
      setRecentCustomers(data)
    } catch {
      // silent
    }
  }

  async function loadCheckedInCustomers() {
    try {
      const data = await getTodayCheckedInCustomers()
      setCheckedInCustomers(data)
    } catch {
      // silent
    }
  }

  const defaultMode = checkedInOnly ? 'checkedin' : 'recent'

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value)
      if (timerRef.current) clearTimeout(timerRef.current)

      if (value.length < 1) {
        setResults([])
        setShowMode(checkedInOnly ? 'checkedin' : 'recent')
        setShowResults(true)
        return
      }

      // 検索時は常に全顧客から検索（チェックインモードでも）
      setShowMode('search')
      timerRef.current = setTimeout(async () => {
        setLoading(true)
        try {
          const data = await searchCustomers(value)
          setResults(data)
          setShowResults(true)
        } finally {
          setLoading(false)
        }
      }, 300)
    },
    [checkedInOnly, checkedInCustomers]
  )

  const handleFocus = () => {
    if (query.length > 0 && results.length > 0) {
      setShowMode('search')
    } else {
      setShowMode(defaultMode)
    }
    setShowResults(true)
  }

  const handleSelect = (customer: CustomerResult) => {
    onSelect(customer)
    setShowResults(false)
    setQuery('')
  }

  const handleClear = () => {
    onSelect(null as unknown as CustomerResult)
    setQuery('')
  }

  const handleCreateCustomer = async (formData: FormData) => {
    setCreating(true)
    try {
      const customer = await createCustomer(formData)
      onSelect(customer)
      setDialogOpen(false)
      setQuery('')
      await loadRecentCustomers()
    } finally {
      setCreating(false)
    }
  }

  const displayList = showMode === 'search'
    ? results
    : showMode === 'checkedin'
    ? checkedInCustomers
    : recentCustomers

  if (selectedCustomer) {
    return (
      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex-1">
          <div className="font-medium">
            {selectedCustomer.customer_code} {selectedCustomer.name}
          </div>
          <div className="text-sm text-muted-foreground">
            {selectedCustomer.phone || '電話番号未登録'}
            {selectedCustomer.line_user_id ? ' | LINE連携済' : ' | LINE未連携'}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleClear}>
          変更
        </Button>
      </div>
    )
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="名前・ID・電話番号で検索..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
            onFocus={handleFocus}
          />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" title="新規顧客登録">
              <UserPlus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新規顧客登録</DialogTitle>
            </DialogHeader>
            <form action={handleCreateCustomer} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">名前 *</Label>
                <Input id="new-name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-kana">フリガナ</Label>
                <Input id="new-kana" name="name_kana" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-phone">電話番号</Label>
                <Input id="new-phone" name="phone" type="tel" />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? '登録中...' : '登録する'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 検索結果 / 顧客一覧ドロップダウン */}
      {showResults && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-72 overflow-auto">
          {/* ヘッダー */}
          <div className="px-3 py-2 border-b bg-gray-50 flex items-center gap-1.5 text-xs text-muted-foreground sticky top-0">
            {showMode === 'search' ? (
              <>
                <Search className="h-3 w-3" />
                検索結果
              </>
            ) : showMode === 'checkedin' ? (
              <>
                <QrCode className="h-3 w-3" />
                本日チェックイン済み（タップで選択）
              </>
            ) : (
              <>
                <Clock className="h-3 w-3" />
                最近の顧客（タップで選択）
              </>
            )}
          </div>

          {loading ? (
            <div className="p-3 text-sm text-muted-foreground">検索中...</div>
          ) : displayList.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">
              {showMode === 'search'
                ? '該当する顧客が見つかりません'
                : showMode === 'checkedin'
                ? '本日チェックイン済みで未ログの顧客はいません'
                : '顧客が登録されていません'}
            </div>
          ) : (
            displayList.map((customer) => (
              <button
                key={customer.id}
                type="button"
                className="w-full text-left px-3 py-2.5 hover:bg-gray-100 border-b last:border-b-0 transition-colors"
                onClick={() => handleSelect(customer)}
              >
                <div className="font-medium text-sm">
                  {customer.customer_code} {customer.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {customer.phone || ''}
                  {customer.last_visit_date
                    ? ` | 最終来店: ${customer.last_visit_date}`
                    : ' | 新規'}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
