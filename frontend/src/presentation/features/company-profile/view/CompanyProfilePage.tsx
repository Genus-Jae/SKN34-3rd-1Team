import type { ReactNode } from 'react'

import type { CompanyQualificationStatus } from '../../../../domain/entities/CompanyProfile'
import {
  workspacePageStyles,
  workspaceTagClassName,
  type WorkspaceTagTone,
} from '../../../shared/workspace/WorkspacePage.styles'
import { WorkspaceToggle } from '../../../shared/workspace/WorkspaceToggle'
import { useCompanyProfileViewModel } from '../viewmodel/useCompanyProfileViewModel'
import {
  companyProfileChoiceClassName,
  companyProfileStyles,
} from './CompanyProfilePage.styles'

/** 서류 상태를 화면 문구로 옮깁니다. 자격 판정이 아니라 등록 상태만 나타냅니다. */
const qualificationLabels: Record<
  CompanyQualificationStatus,
  { label: string; tone: WorkspaceTagTone }
> = {
  HELD: { label: '보유', tone: 'ok' },
  NEEDS_CHECK: { label: '확인 필요', tone: 'warn' },
  NOT_APPLICABLE: { label: '해당 없음', tone: 'muted' },
  NOT_REGISTERED: { label: '미등록', tone: 'muted' },
}

const usageIcons: Record<'target' | 'users' | 'shield', ReactNode> = {
  target: (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
}

/**
 * 기업 프로필 화면입니다. 여기서 채운 값이 추천 점수의 근거와 파트너 매칭 입력이 됩니다.
 * 우대·인증 자격은 등록 상태만 보여주고 GovBiz가 자격을 판정하지 않습니다.
 */
export function CompanyProfilePage() {
  const {
    profile,
    summaryTags,
    completionPercent,
    checklist,
    basicFields,
    isDiscoverable,
    toggleDiscoverable,
    selectableRoles,
    availableRoles,
    toggleRole,
    selectableInterestAreas,
    interestAreas,
    toggleInterestArea,
    capabilityNote,
    updateCapabilityNote,
    notifications,
    toggleNotification,
    usageNotes,
    publicityRows,
  } = useCompanyProfileViewModel()

  return (
    <>
      <header className={workspacePageStyles.header}>
        <div className={workspacePageStyles.headerTitleGroup}>
          <p className={workspacePageStyles.eyebrow}>내 프로필</p>
          <h1 className={workspacePageStyles.title}>기업 프로필</h1>
        </div>
        <div className={workspacePageStyles.headerActions}>
          <span className={workspaceTagClassName('muted')}>
            프로필 완성도 {completionPercent}%
          </span>
        </div>
      </header>

      <div className={workspacePageStyles.content}>
        <div className={workspacePageStyles.columns}>
          <div className={workspacePageStyles.column}>
            <section className={workspacePageStyles.card} aria-label="프로필 요약">
              <div className={companyProfileStyles.summaryTop}>
                <div className={companyProfileStyles.summaryIdentity}>
                  <span className={companyProfileStyles.summaryAvatar} aria-hidden="true">
                    {profile.companyName.slice(0, 1)}
                  </span>
                  <div>
                    <strong className={companyProfileStyles.summaryName}>
                      {profile.companyName}
                    </strong>
                    <div className={companyProfileStyles.summaryTags}>
                      {summaryTags.map((tag) => (
                        <span className={workspaceTagClassName('ok')} key={tag}>
                          {tag}
                        </span>
                      ))}
                      <span className={workspaceTagClassName('muted')}>
                        설립 {profile.foundedYear}
                      </span>
                    </div>
                  </div>
                </div>
                <button className={workspacePageStyles.secondaryButton} type="button">
                  기본정보 수정
                </button>
              </div>

              <div className={companyProfileStyles.completion}>
                <div className={companyProfileStyles.completionRow}>
                  <span className={companyProfileStyles.completionLabel}>프로필 완성도</span>
                  <span className={companyProfileStyles.completionValue}>{completionPercent}%</span>
                </div>
                <div
                  className={companyProfileStyles.completionTrack}
                  role="progressbar"
                  aria-label="프로필 완성도"
                  aria-valuenow={completionPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={companyProfileStyles.completionBar}
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <span className={companyProfileStyles.completionHint}>
                  보유 역량과 우대 자격을 채우면 파트너 매칭 근거가 더 정확해집니다.
                </span>
              </div>
            </section>

            <section className={workspacePageStyles.card} aria-label="기업 기본정보">
              <div className={workspacePageStyles.cardHeader}>
                <h2 className={workspacePageStyles.cardTitle}>기업 기본정보</h2>
                <button className={workspacePageStyles.quietLink} type="button">
                  수정
                </button>
              </div>
              <div className={companyProfileStyles.fieldGrid}>
                {basicFields.map((field) => (
                  <div
                    className={
                      field.value === null
                        ? companyProfileStyles.emptyField
                        : companyProfileStyles.field
                    }
                    key={field.label}
                  >
                    <span className={companyProfileStyles.fieldLabel}>
                      {field.label}
                      {field.isOptional ? (
                        <span className={companyProfileStyles.optionalMark}>선택</span>
                      ) : null}
                    </span>
                    {field.value === null ? (
                      <span className={companyProfileStyles.emptyValue}>미입력</span>
                    ) : (
                      <span className={companyProfileStyles.fieldValue}>
                        {field.value}
                        {field.tag ? (
                          <span className={workspaceTagClassName('ok')}>{field.tag}</span>
                        ) : null}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className={workspacePageStyles.card} aria-label="협업·파트너 설정">
              <div className={workspacePageStyles.cardHeader}>
                <div>
                  <h2 className={workspacePageStyles.cardTitle}>협업·파트너 설정</h2>
                  <p className={workspacePageStyles.cardDescription}>
                    이 항목은 파트너 모집글과 파트너 찾기에서 다른 기업에게 보입니다.
                  </p>
                </div>
              </div>

              <div className={companyProfileStyles.settingRow}>
                <span className="min-w-0">
                  <strong className={companyProfileStyles.settingTitle}>
                    파트너 찾기에 우리 기업 노출
                  </strong>
                  <span className={companyProfileStyles.settingDescription}>
                    끄면 모집글에 직접 제안할 때만 프로필이 공개됩니다.
                  </span>
                </span>
                <WorkspaceToggle
                  label="파트너 찾기에 우리 기업 노출"
                  isOn={isDiscoverable}
                  onToggle={toggleDiscoverable}
                />
              </div>

              <div className={companyProfileStyles.choiceColumns}>
                <div className={companyProfileStyles.choiceGroup}>
                  <span className={companyProfileStyles.choiceLabel} id="available-roles-label">
                    참여 가능 역할
                  </span>
                  <div
                    className={companyProfileStyles.choices}
                    role="group"
                    aria-labelledby="available-roles-label"
                  >
                    {selectableRoles.map((role) => (
                      <button
                        className={companyProfileChoiceClassName(availableRoles.includes(role))}
                        key={role}
                        type="button"
                        aria-pressed={availableRoles.includes(role)}
                        onClick={() => toggleRole(role)}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={companyProfileStyles.choiceGroup}>
                  <span className={companyProfileStyles.choiceLabel} id="interest-areas-label">
                    관심 분야
                  </span>
                  <div
                    className={companyProfileStyles.choices}
                    role="group"
                    aria-labelledby="interest-areas-label"
                  >
                    {selectableInterestAreas.map((area) => (
                      <button
                        className={companyProfileChoiceClassName(interestAreas.includes(area))}
                        key={area}
                        type="button"
                        aria-pressed={interestAreas.includes(area)}
                        onClick={() => toggleInterestArea(area)}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={companyProfileStyles.capabilityGroup}>
                <label className={companyProfileStyles.choiceLabel} htmlFor="capability-note">
                  보유 역량·실적
                </label>
                <textarea
                  className={companyProfileStyles.capabilityTextarea}
                  id="capability-note"
                  value={capabilityNote}
                  onChange={(event) => updateCapabilityNote(event.target.value)}
                />
                <span className={companyProfileStyles.capabilityHint}>
                  수치와 실적은 스스로 입력한 값이며 GovBiz가 검증하지 않습니다. 모집글에는 이 문구가
                  그대로 보입니다.
                </span>
              </div>
            </section>

            <section className={workspacePageStyles.card} aria-label="우대·인증 자격">
              <div className={workspacePageStyles.cardHeader}>
                <div>
                  <h2 className={workspacePageStyles.cardTitle}>우대·인증 자격</h2>
                  <p className={workspacePageStyles.cardDescription}>
                    GovBiz는 자격을 판정하지 않습니다. 등록한 서류 상태만 표시하고, 적합 여부는 공고
                    원문과 기관에서 확인하세요.
                  </p>
                </div>
                <button className={workspacePageStyles.secondaryButton} type="button">
                  상태 업데이트
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {profile.qualifications.map((qualification) => {
                  const status = qualificationLabels[qualification.status]
                  return (
                    <div className={companyProfileStyles.statusRow} key={qualification.label}>
                      <span>{qualification.label}</span>
                      <span className={workspaceTagClassName(status.tone)}>
                        {qualification.detail
                          ? `${status.label} · ${qualification.detail}`
                          : status.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className={workspacePageStyles.card} aria-label="계정과 알림">
              <h2 className={workspacePageStyles.cardTitle}>계정과 알림</h2>
              <div className="flex flex-col gap-2">
                <div className={companyProfileStyles.accountRow}>
                  <span className="min-w-0">
                    <span className={companyProfileStyles.accountLabel}>담당자</span>
                    <span className={companyProfileStyles.accountValue}>
                      {profile.managerName} · {profile.managerEmail}
                    </span>
                  </span>
                  <span className={workspaceTagClassName(profile.isEmailVerified ? 'ok' : 'warn')}>
                    {profile.isEmailVerified ? '이메일 인증됨' : '이메일 미인증'}
                  </span>
                </div>

                <div className={companyProfileStyles.accountRow}>
                  <span className={companyProfileStyles.accountValue}>비밀번호</span>
                  <button className={workspacePageStyles.quietLink} type="button">
                    변경
                  </button>
                </div>

                <div className={companyProfileStyles.settingRow}>
                  <span className={companyProfileStyles.accountValue}>
                    관심 공고 마감 3일 전 알림
                  </span>
                  <WorkspaceToggle
                    label="관심 공고 마감 3일 전 알림"
                    isOn={notifications.savedProgramDeadline}
                    onToggle={() => toggleNotification('savedProgramDeadline')}
                  />
                </div>
                <div className={companyProfileStyles.settingRow}>
                  <span className={companyProfileStyles.accountValue}>파트너 제안·메시지 알림</span>
                  <WorkspaceToggle
                    label="파트너 제안·메시지 알림"
                    isOn={notifications.partnerProposal}
                    onToggle={() => toggleNotification('partnerProposal')}
                  />
                </div>
                <div className={companyProfileStyles.settingRow}>
                  <span className={companyProfileStyles.accountValue}>
                    프로필 조건에 맞는 새 공고 알림
                  </span>
                  <WorkspaceToggle
                    label="프로필 조건에 맞는 새 공고 알림"
                    isOn={notifications.newMatchingProgram}
                    onToggle={() => toggleNotification('newMatchingProgram')}
                  />
                </div>
              </div>
              <div className={companyProfileStyles.dangerRow}>
                <button className={workspacePageStyles.dangerLink} type="button">
                  계정 삭제
                </button>
              </div>
            </section>
          </div>

          <aside className={workspacePageStyles.column} aria-label="프로필 안내">
            <section className={workspacePageStyles.card}>
              <p className={workspacePageStyles.sectionEyebrow}>이 정보가 쓰이는 곳</p>
              <div className={companyProfileStyles.usageList}>
                {usageNotes.map((note) => (
                  <div className={companyProfileStyles.usageItem} key={note.title}>
                    <span className={companyProfileStyles.usageIcon}>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        {usageIcons[note.icon]}
                      </svg>
                    </span>
                    <span>
                      <strong className={companyProfileStyles.usageTitle}>{note.title}</strong>
                      <span className={companyProfileStyles.usageDescription}>
                        {note.description}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className={workspacePageStyles.card} aria-label="공개 범위">
              <p className={workspacePageStyles.sectionEyebrow}>공개 범위</p>
              <table className={companyProfileStyles.publicityTable}>
                <thead>
                  <tr>
                    <th className={companyProfileStyles.publicityHeadCell}>항목</th>
                    <th className={companyProfileStyles.publicityHeadCell}>모집·찾기</th>
                    <th className={companyProfileStyles.publicityHeadCell}>제안 수락 후</th>
                  </tr>
                </thead>
                <tbody>
                  {publicityRows.map((row) => (
                    <tr key={row.label}>
                      <td className={companyProfileStyles.publicityCell}>{row.label}</td>
                      <td
                        className={
                          row.beforeAccept
                            ? companyProfileStyles.publicOpen
                            : companyProfileStyles.publicClosed
                        }
                      >
                        {row.beforeAccept ? '공개' : '비공개'}
                      </td>
                      <td
                        className={
                          row.afterAccept
                            ? companyProfileStyles.publicOpen
                            : companyProfileStyles.publicClosed
                        }
                      >
                        {row.afterAccept ? '공개' : '비공개'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className={workspacePageStyles.card} aria-label="완성도 체크리스트">
              <p className={workspacePageStyles.sectionEyebrow}>완성도 체크리스트</p>
              <div className={companyProfileStyles.checklist}>
                {checklist.map((item) => (
                  <div className={companyProfileStyles.checklistItem} key={item.label}>
                    {item.isDone ? (
                      <span className={companyProfileStyles.doneMark} aria-hidden="true">
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      </span>
                    ) : (
                      <span className={companyProfileStyles.todoMark} aria-hidden="true" />
                    )}
                    <span
                      className={
                        item.isDone
                          ? companyProfileStyles.doneLabel
                          : companyProfileStyles.todoLabel
                      }
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </>
  )
}
