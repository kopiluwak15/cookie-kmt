import { STAGE_DEFINITIONS, type Stage, type EmploymentType } from '@/types'

// ============================================
// 業務委託 報酬計算
// ============================================
export function calculateContractorCompensation(
  monthRevenue: number,
  commissionRate: number = 0.4,
) {
  const grossCommission = Math.round(monthRevenue * commissionRate)
  const withholdingTax = Math.round(grossCommission * 0.1021)
  const netEstimate = grossCommission - withholdingTax
  return { grossCommission, withholdingTax, netEstimate }
}

// ============================================
// 正社員 S4 インセンティブ計算
// ============================================
export function calculateS4Incentive(
  monthRevenue: number,
  previousMonthRevenue: number | null,
): { incentive: number; eligible: boolean; reason: string } {
  const threshold = 600000
  const rate = 0.10

  if (monthRevenue <= threshold) {
    return { incentive: 0, eligible: false, reason: `売上¥${threshold.toLocaleString()}未満` }
  }
  if (previousMonthRevenue === null || previousMonthRevenue <= threshold) {
    return {
      incentive: 0,
      eligible: false,
      reason: '2ヶ月連続¥600,000超過が条件（先月未達成）',
    }
  }

  const incentive = Math.round((monthRevenue - threshold) * rate)
  return { incentive, eligible: true, reason: '2ヶ月連続達成' }
}

// ============================================
// ステージ昇格条件・進捗
// ============================================
export function getStageAdvancementInfo(
  currentStage: Stage | null,
  thisMonthRevenue: number,
  lastMonthRevenue: number | null,
): { nextStage: Stage | null; criteria: string; progress: number; eligible: boolean } {
  if (!currentStage) {
    return { nextStage: null, criteria: '-', progress: 0, eligible: false }
  }

  const stageIndex = STAGE_DEFINITIONS.findIndex(s => s.stage === currentStage)
  if (stageIndex === -1 || stageIndex >= STAGE_DEFINITIONS.length - 1) {
    return { nextStage: null, criteria: '最高ステージ', progress: 1, eligible: false }
  }

  const nextDef = STAGE_DEFINITIONS[stageIndex + 1]

  switch (currentStage) {
    case 'S1': {
      const target = 250000
      return {
        nextStage: 'S2',
        criteria: `月売上¥${target.toLocaleString()}達成`,
        progress: Math.min(thisMonthRevenue / target, 1),
        eligible: thisMonthRevenue >= target,
      }
    }
    case 'S2': {
      const target = 350000
      return {
        nextStage: 'S3',
        criteria: `月売上¥${target.toLocaleString()}達成`,
        progress: Math.min(thisMonthRevenue / target, 1),
        eligible: thisMonthRevenue >= target,
      }
    }
    case 'S3': {
      const target = 575000
      return {
        nextStage: 'S4',
        criteria: `月売上¥${target.toLocaleString()}達成`,
        progress: Math.min(thisMonthRevenue / target, 1),
        eligible: thisMonthRevenue >= target,
      }
    }
    case 'S4': {
      const target = 600000
      const lastOk = lastMonthRevenue !== null && lastMonthRevenue >= target
      const thisOk = thisMonthRevenue >= target
      return {
        nextStage: 'S5',
        criteria: `月売上¥${target.toLocaleString()}を2ヶ月連続 + 役職要件`,
        progress: thisOk ? (lastOk ? 1 : 0.5) : Math.min(thisMonthRevenue / target, 0.49),
        eligible: false, // S5は自動昇格しない（役職要件は管理者判断）
      }
    }
    case 'S5':
      return {
        nextStage: 'S6',
        criteria: 'エリアマネージャー任命（管理者判断）',
        progress: 0,
        eligible: false,
      }
    default:
      return { nextStage: null, criteria: '-', progress: 0, eligible: false }
  }
}

// ============================================
// ステージ選択時のデフォルト値
// ============================================
export function getStageDefaults(stage: Stage) {
  const def = STAGE_DEFINITIONS.find(s => s.stage === stage)
  return {
    baseSalary: def?.baseSalary ?? 0,
  }
}

// ============================================
// 雇用形態選択時のデフォルト値
// ============================================
export function getEmploymentTypeDefaults(type: EmploymentType) {
  switch (type) {
    case 'full_time':
      return { stage: 'S1' as Stage, baseSalary: 190000, hourlyRate: null, commissionRate: null }
    case 'part_time':
      return { stage: null, baseSalary: null, hourlyRate: 1200, commissionRate: null }
    case 'contractor':
      return { stage: null, baseSalary: null, hourlyRate: null, commissionRate: 0.4 }
  }
}
