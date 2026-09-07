import type { AdminMember, AdminMemberStatus } from '../../../../domain/entities/AdminMember'
import {
  workspaceChipClassName,
  workspacePageStyles,
  workspaceTagClassName,
  type WorkspaceTagTone,
} from '../../../shared/workspace/WorkspacePage.styles'
import { useAdminMembersViewModel } from '../viewmodel/useAdminMembersViewModel'
import {
  adminMembersPageStyles,
  adminMembersStatValueClassName,
} from './AdminMembersPage.styles'

const statusLabels: Record<AdminMemberStatus, { label: string; tone: WorkspaceTagTone }> = {
  ACTIVE: { label: '정상', tone: 'ok' },
  REPORTED: { label: '신고 접수', tone: 'warn' },
  PROPOSAL_BLOCKED: { label: '제안 정지', tone: 'danger' },
  PENDING: { label: '대기', tone: 'muted' },
}

/** 신고 접수와 제안 정지는 목록에서 바로 눈에 띄어야 하므로 행 배경을 다르게 칠합니다. */
function memberRowClassName(member: AdminMember) {
  if (member.status === 'PROPOSAL_BLOCKED') return workspacePageStyles.dangerRow
  if (member.status === 'REPORTED') return workspacePageStyles.warnRow
  return ''
}

/** 어드민 회원·기업 목록입니다. 정지와 인증 메일 재발송 같은 조치는 이 목록에서 시작합니다. */
export function AdminMembersPage() {
  const { members, stats, filters, operationPolicies } = useAdminMembersViewModel()

  return (
    <>
      <header className={workspacePageStyles.header}>
        <div className={workspacePageStyles.headerTitleGroup}>
          <p className={workspacePageStyles.eyebrow}>관리자 · 회원·기업</p>
          <h1 className={workspacePageStyles.title}>회원·기업 목록</h1>
        </div>
        <div className={workspacePageStyles.headerActions}>
          <button className={workspacePageStyles.secondaryButton} type="button">
            CSV 내보내기
          </button>
        </div>
      </header>

      <div className={workspacePageStyles.content}>
        <div className={adminMembersPageStyles.statRow}>
          {stats.map((stat) => (
            <div className={adminMembersPageStyles.statCell} key={stat.label}>
              <strong className={adminMembersStatValueClassName(stat.tone)}>{stat.value}</strong>
              <span className={adminMembersPageStyles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>

        <section className={workspacePageStyles.card} aria-label="회원·기업 목록">
          <div className={adminMembersPageStyles.toolbar}>
            <span className={adminMembersPageStyles.search}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              기업명, 이메일, 사업자번호
            </span>
            {filters.map((filter) => (
              <span className={workspaceChipClassName(filter.isActive)} key={filter.label}>
                {filter.label}
              </span>
            ))}
            <span className={adminMembersPageStyles.resultCount}>
              1–{members.length} / {members.length}명
            </span>
          </div>

          <div className={adminMembersPageStyles.tableScroll}>
            <table className={workspacePageStyles.table}>
              <thead>
                <tr>
                  <th className={workspacePageStyles.tableHeadCell}>기업</th>
                  <th className={workspacePageStyles.tableHeadCell}>담당자 이메일</th>
                  <th className={workspacePageStyles.tableHeadCell}>인증</th>
                  <th className={workspacePageStyles.tableHeadCell}>프로필</th>
                  <th className={workspacePageStyles.tableHeadCell}>모집글 / 제안</th>
                  <th className={workspacePageStyles.tableHeadCell}>가입일</th>
                  <th className={workspacePageStyles.tableHeadCell}>상태</th>
                  <th className={workspacePageStyles.tableHeadCell}>조치</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const status = statusLabels[member.status]
                  return (
                    <tr className={memberRowClassName(member)} key={member.id}>
                      <td
                        className={`${workspacePageStyles.tableCell} ${workspacePageStyles.tableStrongCell}`}
                      >
                        {member.companyName}
                      </td>
                      <td
                        className={`${workspacePageStyles.tableCell} ${adminMembersPageStyles.emailCell}`}
                      >
                        {member.managerEmail}
                      </td>
                      <td className={workspacePageStyles.tableCell}>
                        <span
                          className={workspaceTagClassName(
                            member.isEmailVerified ? 'ok' : 'warn',
                          )}
                        >
                          {member.isEmailVerified ? '인증됨' : '미인증'}
                        </span>
                      </td>
                      <td className={workspacePageStyles.tableCell}>
                        {member.profileCompletionPercent}%
                      </td>
                      <td className={workspacePageStyles.tableCell}>
                        {member.recruitmentCount} / {member.proposalCount}
                      </td>
                      <td className={workspacePageStyles.tableCell}>{member.joinedOn}</td>
                      <td className={workspacePageStyles.tableCell}>
                        <span className={workspaceTagClassName(status.tone)}>{status.label}</span>
                      </td>
                      <td className={workspacePageStyles.tableCell}>
                        <span className={workspacePageStyles.tableActionCell}>
                          <button className={workspacePageStyles.quietLink} type="button">
                            상세
                          </button>
                          {member.isEmailVerified ? (
                            <button className={workspacePageStyles.dangerLink} type="button">
                              정지
                            </button>
                          ) : (
                            <button className={workspacePageStyles.mutedLink} type="button">
                              인증 메일 재발송
                            </button>
                          )}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className={workspacePageStyles.pagination}>
            <span>
              1–{members.length} / {members.length}명
            </span>
            <span className="flex gap-2">
              <button className={workspacePageStyles.secondaryButton} type="button">
                이전
              </button>
              <button className={workspacePageStyles.secondaryButton} type="button">
                다음
              </button>
            </span>
          </div>
        </section>

        <section className={workspacePageStyles.card} aria-label="모집·제안 운영 규칙">
          <div className={workspacePageStyles.cardHeader}>
            <div>
              <h2 className={workspacePageStyles.cardTitle}>모집·제안 운영 규칙</h2>
              <p className={workspacePageStyles.cardDescription}>
                코드에 고정된 정책입니다. 값 변경은 설정 화면에서만 할 수 있습니다.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {operationPolicies.map((policy) => (
              <div className={adminMembersPageStyles.policyRow} key={policy.label}>
                <span className={adminMembersPageStyles.policyLabel}>{policy.label}</span>
                <span className={adminMembersPageStyles.policyValue}>{policy.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
