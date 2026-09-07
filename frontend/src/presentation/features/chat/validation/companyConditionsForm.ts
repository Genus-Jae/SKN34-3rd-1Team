import type { SupportProgramCompanyConditions } from '../../../../domain/repositories/SupportProgramRepository'

export type CompanyConditionsDraft = Record<keyof SupportProgramCompanyConditions, string>

export const companyConditionFields = [
  { key: 'region', label: '현재 소재지', maxLength: 50, placeholder: '예: 서울' },
  { key: 'industry', label: '업종', maxLength: 100, placeholder: '예: 소프트웨어 개발업' },
  { key: 'establishedOn', label: '설립일', maxLength: 10, placeholder: '' },
  { key: 'supportPurpose', label: '지원 목적', maxLength: 100, placeholder: '예: 사업화 자금' },
] as const

export function emptyCompanyConditionsDraft(): CompanyConditionsDraft {
  return { region: '', industry: '', establishedOn: '', supportPurpose: '' }
}

export function seoulToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

/** 입력 당시 서울 날짜로 검사하며 실제 검색 시에는 서버가 다시 검증합니다. */
export function validateCompanyConditions(draft: CompanyConditionsDraft, today = seoulToday()):
  | { conditions: SupportProgramCompanyConditions; error: null }
  | { conditions: null; error: string } {
  const conditions: SupportProgramCompanyConditions = {}
  for (const field of companyConditionFields) {
    const rawValue = draft[field.key]
    if (/\p{C}/u.test(rawValue)) {
      return { conditions: null, error: `${field.label}에 제어문자를 입력할 수 없습니다.` }
    }
    const value = rawValue.trim()
    if (!value) continue
    if (value.length > field.maxLength) {
      return { conditions: null, error: `${field.label}은 제어문자 없이 ${field.maxLength}자 이하로 입력해 주세요.` }
    }
    if (field.key === 'establishedOn') {
      const date = new Date(`${value}T00:00:00Z`)
      if (value !== rawValue || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.valueOf())
        || date.toISOString().slice(0, 10) !== value || value < '1900-01-01' || value > today) {
        return { conditions: null, error: `설립일은 1900-01-01부터 오늘(${today}, 서울 기준)까지의 실제 날짜로 입력해 주세요.` }
      }
    }
    conditions[field.key] = value
  }
  return { conditions, error: null }
}
