import { adminMembers } from './adminMemberPlaceholders'

/**
 * 어드민 회원·기업 목록의 대표 ViewModel입니다. 목록과 상단 요약 수치를 계산해 돌려줍니다.
 * 회원 조회 API가 생기면 이 자리에서 UseCase를 호출하고 View는 그대로 둡니다.
 */
export function useAdminMembersViewModel() {
  const verifiedCount = adminMembers.filter((member) => member.isEmailVerified).length
  const reportedCount = adminMembers.filter((member) => member.status === 'REPORTED').length
  const blockedCount = adminMembers.filter(
    (member) => member.status === 'PROPOSAL_BLOCKED',
  ).length

  return {
    members: adminMembers,
    stats: [
      { value: `${adminMembers.length}명`, label: '전체 회원', tone: 'neutral' as const },
      { value: `${verifiedCount}명`, label: '이메일 인증됨', tone: 'ok' as const },
      { value: `${adminMembers.length - verifiedCount}명`, label: '미인증', tone: 'warn' as const },
      { value: `${reportedCount}건`, label: '신고 접수', tone: 'warn' as const },
      { value: `${blockedCount}건`, label: '제안 정지', tone: 'danger' as const },
    ],
    filters: [
      { label: '상태', isActive: false },
      { label: '인증', isActive: false },
      { label: '신고 접수만', isActive: false },
    ],
    // 운영 규칙은 코드에 고정된 값이라 이 화면에서는 읽기만 합니다. 값 변경은 설정 화면이 맡습니다.
    operationPolicies: [
      { label: '모집 마감일', value: '공고 접수 마감 이전만 허용 · 공고 마감 시 자동 종료' },
      { label: '제안 유효기간', value: '7일 무응답 시 자동 종료' },
      { label: '담당자 정보 공개', value: '제안 수락 후에만 상호 공개' },
      { label: '스팸 임계값', value: '24시간 내 제안 10건 초과 시 발송 정지' },
      { label: '신고 3회 누적', value: '모집글 자동 숨김 후 운영자 검토' },
    ],
  }
}
