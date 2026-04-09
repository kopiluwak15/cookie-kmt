import jsPDF from 'jspdf'

export interface TimecardRecord {
  id: string
  date: string
  checkin_time: string | null
  checkout_time: string | null
  workTime: string
}

// 日本語フォント（MS Gothicの代替としてHelveticaを使用、文字は英数字のみの場合）
// より確実な方法として、HTMLCanvas を使った方法もあるが、
// ここではシンプルに doc.text() で日本語をサポートするために
// jsPDF の setFont でサポートされたフォントを使用
export async function generateTimecardPDF(
  staffName: string,
  month: string,
  records: TimecardRecord[],
  totalHours: string,
  includeLog: boolean = false
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  }) as any

  // 日本語フォント設定（NotoSansJPをサポート）
  // jsPDF デフォルトではUnicode対応していないため、
  // 代わりに UTF-8 エンコーディングで日本語を出力
  try {
    // setFont で日本語対応フォントを試す
    doc.setFont('NotoSansJP', 'normal')
  } catch {
    // フォントが見つからない場合は、Helvetica にフォールバック
    doc.setFont('helvetica', 'normal')
  }

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 10
  let yPosition = margin + 10

  // タイトル
  doc.setFontSize(16)
  doc.text('タイムカード', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 10

  // スタッフ名と月
  doc.setFontSize(12)
  doc.text(`スタッフ名: ${staffName}`, margin, yPosition)
  yPosition += 6
  doc.text(`対象月: ${month}`, margin, yPosition)
  yPosition += 10

  // 表ヘッダー
  doc.setFontSize(10)
  const columnWidths = [15, 10, 20, 20, 30]
  const columns = ['日', '曜日', '出勤', '退勤', '勤務時間']
  let xPosition = margin

  doc.setFillColor(200, 200, 200)
  columns.forEach((col, index) => {
    doc.rect(xPosition, yPosition, columnWidths[index], 7, 'F')
    doc.text(col, xPosition + columnWidths[index] / 2, yPosition + 5, {
      align: 'center',
    })
    xPosition += columnWidths[index]
  })
  yPosition += 8

  // データ行
  const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土']
  records.forEach(record => {
    if (yPosition > pageHeight - margin - 10) {
      doc.addPage()
      yPosition = margin
    }

    const date = new Date(record.date + 'T00:00:00')
    const day = date.getDate()
    const dayOfWeek = daysOfWeek[date.getDay()]
    const checkinTime = formatTime(record.checkin_time)
    const checkoutTime = formatTime(record.checkout_time)

    xPosition = margin
    const rowHeight = 6

    // 背景色（交互）
    if (Math.floor((yPosition - (margin + 18)) / rowHeight) % 2 === 0) {
      doc.setFillColor(245, 245, 245)
      doc.rect(margin, yPosition, pageWidth - 2 * margin, rowHeight, 'F')
    }

    // データ
    doc.setFontSize(9)
    const rowData = [day.toString(), dayOfWeek, checkinTime, checkoutTime, record.workTime]

    rowData.forEach((data, index) => {
      doc.text(data, xPosition + columnWidths[index] / 2, yPosition + rowHeight - 1, {
        align: 'center',
      })
      xPosition += columnWidths[index]
    })

    // 罫線
    xPosition = margin
    columns.forEach((_, index) => {
      doc.rect(xPosition, yPosition, columnWidths[index], rowHeight)
      xPosition += columnWidths[index]
    })

    yPosition += rowHeight
  })

  // 合計
  yPosition += 5
  doc.setFontSize(11)
  doc.text(`合計勤務時間: ${totalHours}`, margin, yPosition)

  // ページ番号
  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page)
    doc.setFontSize(8)
    doc.text(
      `${page} / ${totalPages}`,
      pageWidth - margin - 10,
      pageHeight - margin,
      { align: 'right' }
    )
  }

  // PDF保存
  const filename = `タイムカード_${staffName}_${month.replace('-', '年')}月.pdf`
  doc.save(filename)
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '-'
  try {
    const date = new Date(timeStr)
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '-'
  }
}
