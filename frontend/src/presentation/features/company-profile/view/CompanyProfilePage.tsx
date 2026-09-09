import { useEffect } from 'react'
import type { ReactNode } from 'react'

import type { CompanyQualificationStatus } from '../../../../domain/entities/CompanyProfile'
import {
  workspacePageStyles,
  workspaceTagClassName,
  type WorkspaceTagTone,
} from '../../../shared/workspace/WorkspacePage.styles'
import { WorkspaceToggle } from '../../../shared/workspace/WorkspaceToggle'
import { YearPicker } from '../../../shared/workspace/YearPicker'
import { formatBusinessNumber } from '../../../../domain/entities/Company'
import { useCompanyProfileViewModel, type ProfileFormValues } from '../viewmodel/useCompanyProfileViewModel'
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
 * 기업 프로필 화면입니다. 기업 기본정보는 사업자등록번호 조회로 등록·수정하고, 여기서 채운 값이
 * 추천 점수의 근거와 파트너 매칭 입력이 됩니다. 우대·인증 자격은 등록 상태만 보여주고 GovBiz가 자격을 판정하지 않습니다.
 * 협업·파트너 설정, 우대·인증, 계정과 알림, 공개 범위는 아직 예시 값이며 준비 중입니다.
 */
export function CompanyProfilePage() {
  const vm = useCompanyProfileViewModel()
  const {
    companyState,
    company,
    demo,
    notice,
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
  } = vm

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
        <p className={workspacePageStyles.emptyNote}>
          기업 기본정보는 저장됩니다. 협업·파트너 설정, 우대·인증 자격, 알림, 공개 범위는 아직 예시 값이며 화면을 나가면 초기화됩니다.
        </p>
        {notice ? <p className={companyProfileStyles.notice} role="status">{notice}</p> : null}
        <div className={workspacePageStyles.columns}>
          <div className={workspacePageStyles.column}>
            <section className={workspacePageStyles.card} aria-label="프로필 요약">
              <div className={companyProfileStyles.summaryTop}>
                <div className={companyProfileStyles.summaryIdentity}>
                  <span className={companyProfileStyles.summaryAvatar} aria-hidden="true">
                    {company === null ? '?' : company.companyName.slice(0, 1)}
                  </span>
                  <div>
                    <strong className={companyProfileStyles.summaryName}>
                      {company === null ? '기업 미등록' : company.companyName}
                    </strong>
                    <div className={companyProfileStyles.summaryTags}>
                      {summaryTags.map((tag) => (
                        <span className={workspaceTagClassName('ok')} key={tag}>
                          {tag}
                        </span>
                      ))}
                      {company === null ? (
                        <span className={workspaceTagClassName('muted')}>사업자등록번호 확인 전</span>
                      ) : (
                        <span className={workspaceTagClassName('muted')}>설립 {company.foundedYear}</span>
                      )}
                    </div>
                  </div>
                </div>
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
                  {company === null
                    ? '사업자등록번호를 조회해 등록하면 기업 회원이 되어 파트너 모집글을 작성할 수 있습니다.'
                    : '보유 역량과 우대 자격을 채우면 파트너 매칭 근거가 더 정확해집니다.'}
                </span>
              </div>
            </section>

            {companyState.status === 'loading' ? (
              <section className={workspacePageStyles.card} aria-label="기업 정보 불러오기">
                <p className={workspacePageStyles.emptyNote} aria-live="polite">기업 정보를 불러오는 중입니다.</p>
              </section>
            ) : null}
            {companyState.status === 'error' ? (
              <section className={workspacePageStyles.card} aria-label="기업 정보 불러오기">
                <p className={workspacePageStyles.emptyNote} role="alert">기업 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
              </section>
            ) : null}
            {companyState.status === 'unregistered' ? <RegistrationCard vm={vm} /> : null}
            {company !== null && vm.isEditing ? (
              <section className={workspacePageStyles.card} aria-label="기업 기본정보 수정">
                <div className={workspacePageStyles.cardHeader}>
                  <div>
                    <h2 className={workspacePageStyles.cardTitle}>기업 기본정보 수정</h2>
                    <p className={workspacePageStyles.cardDescription}>
                      기업명·사업자등록번호·사업자 상태는 조회 값이라 바꿀 수 없습니다.
                    </p>
                  </div>
                </div>
                <form className={companyProfileStyles.form} aria-label="기업 기본정보 수정" onSubmit={vm.submitUpdate} noValidate>
                  <ProfileFields vm={vm} idPrefix="edit" />
                  {vm.formErrors.form ? <p className={companyProfileStyles.formError} role="alert">{vm.formErrors.form}</p> : null}
                  <div className={companyProfileStyles.formActions}>
                    <button className={workspacePageStyles.secondaryButton} type="button" onClick={vm.cancelEditing} disabled={vm.isSaving}>
                      취소
                    </button>
                    <button className={workspacePageStyles.primaryButton} type="submit" disabled={vm.isSaving}>
                      {vm.isSaving ? '저장 중…' : '저장'}
                    </button>
                  </div>
                </form>
              </section>
            ) : null}
            {company !== null && !vm.isEditing ? (
              <section className={workspacePageStyles.card} aria-label="기업 기본정보">
                <div className={workspacePageStyles.cardHeader}>
                  <h2 className={workspacePageStyles.cardTitle}>기업 기본정보</h2>
                  <button className={workspacePageStyles.quietLink} type="button" onClick={vm.startEditing}>
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
            ) : null}

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
                <button className={workspacePageStyles.secondaryButton} type="button" disabled>
                  상태 업데이트 · 준비 중
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {demo.qualifications.map((qualification) => {
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
                      {demo.managerName} · {vm.account?.email ?? demo.managerEmail}
                    </span>
                  </span>
                  <span className={workspaceTagClassName(vm.account?.emailVerified ? 'ok' : 'warn')}>
                    {vm.account?.emailVerified ? '이메일 인증됨' : '이메일 미인증'}
                  </span>
                </div>

                <div className={companyProfileStyles.accountRow}>
                  <span className={companyProfileStyles.accountValue}>비밀번호</span>
                  <button className={workspacePageStyles.quietLink} type="button" disabled>
                    변경 · 준비 중
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
                <button className={workspacePageStyles.dangerLink} type="button" disabled>
                  계정 삭제 · 준비 중
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
                      <span className="sr-only"> · {item.isDone ? '완료' : '미완료'}</span>
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

type ViewModel = ReturnType<typeof useCompanyProfileViewModel>

/** 기업이 없을 때 기본정보 카드 자리에 나오는 등록 폼입니다. 사업자등록번호 조회로 상호·상태를 채운 뒤 나머지를 입력합니다. */
function RegistrationCard({ vm }: { vm: ViewModel }) {
  const lookupBusy = vm.lookup.status === 'looking'
  return (
    <section className={workspacePageStyles.card} aria-label="기업 등록">
      <div className={workspacePageStyles.cardHeader}>
        <div>
          <h2 className={workspacePageStyles.cardTitle}>기업 등록</h2>
          <p className={workspacePageStyles.cardDescription}>
            사업자등록번호를 조회하면 기업명과 사업자 상태가 채워집니다. 소재지·업종·설립연도는 직접 입력하고 홈페이지는 선택입니다.
          </p>
        </div>
      </div>
      <form className={companyProfileStyles.form} aria-label="기업 등록" onSubmit={vm.submitRegistration} noValidate>
        <div className={companyProfileStyles.lookupRow}>
          <label className={companyProfileStyles.formField} htmlFor="register-businessNumber">
            <span className={companyProfileStyles.formLabel}>사업자등록번호</span>
            <input
              className={companyProfileStyles.input}
              id="register-businessNumber"
              type="text"
              name="businessNumber"
              inputMode="numeric"
              autoComplete="off"
              maxLength={12}
              placeholder="000-00-00000"
              aria-invalid={vm.formErrors.businessNumber !== undefined}
              aria-describedby={vm.formErrors.businessNumber ? 'register-businessNumber-error' : 'register-businessNumber-hint'}
              value={vm.businessNumber}
              onChange={(event) => vm.updateBusinessNumber(event.target.value)}
            />
          </label>
          <button className={workspacePageStyles.secondaryButton} type="button" onClick={() => void vm.lookupBusiness()} disabled={lookupBusy || !vm.canLookup}>
            {lookupBusy ? '조회 중…' : '조회'}
          </button>
        </div>
        {vm.formErrors.businessNumber
          ? <p id="register-businessNumber-error" className={companyProfileStyles.formError} role="alert">{vm.formErrors.businessNumber}</p>
          : <span id="register-businessNumber-hint" className={companyProfileStyles.formHint}>{vm.businessNumberHint}</span>}

        {vm.lookup.status === 'found' ? (
          <div className={companyProfileStyles.lookupResult} role="status" aria-label="조회 결과">
            <div className={companyProfileStyles.lookupHeadline}>
              <strong className={companyProfileStyles.lookupName}>{vm.lookup.business.companyName}</strong>
              <span className={workspaceTagClassName(vm.lookup.business.isActive ? 'ok' : 'warn')}>{vm.lookup.business.businessStatus}</span>
            </div>
            <span className={companyProfileStyles.lookupDetail}>{formatBusinessNumber(vm.lookup.business.businessNumber)}</span>
            {vm.lookup.business.isActive ? null : (
              <span className={companyProfileStyles.lookupWarning}>계속사업자만 등록할 수 있습니다.</span>
            )}
          </div>
        ) : null}
        {vm.lookup.status === 'failed' ? <p className={companyProfileStyles.formError} role="alert">{vm.lookup.message}</p> : null}

        <ProfileFields vm={vm} idPrefix="register" />
        {vm.formErrors.form ? <p className={companyProfileStyles.formError} role="alert">{vm.formErrors.form}</p> : null}
        <div className={companyProfileStyles.formActions}>
          <button
            className={workspacePageStyles.primaryButton}
            type="submit"
            disabled={vm.isSaving || vm.lookup.status !== 'found' || !vm.lookup.business.isActive}
          >
            {vm.isSaving ? '등록 중…' : '기업 등록'}
          </button>
        </div>
      </form>
    </section>
  )
}

/**
 * 등록과 수정이 같은 입력 항목을 씁니다. `idPrefix`로 두 폼의 label·input 연결을 구분하고,
 * 오류는 필드 아래에 각각 보여 주며 검증에 실패하면 첫 오류 필드로 포커스를 옮깁니다.
 */
function ProfileFields({ vm, idPrefix }: { vm: ViewModel; idPrefix: string }) {
  const { focusField, clearFocusField } = vm
  useEffect(() => {
    if (focusField === null) return
    document.getElementById(`${idPrefix}-${focusField}`)?.focus()
    clearFocusField()
  }, [focusField, clearFocusField, idPrefix])

  const field = (name: keyof ProfileFormValues) => ({
    id: `${idPrefix}-${name}`,
    name,
    'aria-invalid': vm.formErrors[name] !== undefined,
    'aria-describedby': vm.formErrors[name] ? `${idPrefix}-${name}-error` : undefined,
    value: vm.form[name],
  })
  const errorOf = (name: keyof ProfileFormValues) =>
    vm.formErrors[name] ? <p id={`${idPrefix}-${name}-error`} className={companyProfileStyles.formError} role="alert">{vm.formErrors[name]}</p> : null
  const foundedYear = /^\d{4}$/.test(vm.form.foundedYear) ? Number(vm.form.foundedYear) : null

  return (
    <div className={companyProfileStyles.formGrid}>
      <div className={companyProfileStyles.formField}>
        <label className={companyProfileStyles.formLabel} htmlFor={`${idPrefix}-region`}>소재지</label>
        <select className={companyProfileStyles.input} {...field('region')} onChange={(event) => vm.updateForm('region', event.target.value)}>
          <option value="">선택</option>
          {vm.regions.map((region) => <option key={region} value={region}>{region}</option>)}
        </select>
        {errorOf('region')}
      </div>
      <div className={companyProfileStyles.formField}>
        <label className={companyProfileStyles.formLabel} htmlFor={`${idPrefix}-industry`}>업종</label>
        <select className={companyProfileStyles.input} {...field('industry')} onChange={(event) => vm.updateForm('industry', event.target.value)}>
          <option value="">선택</option>
          {vm.industries.map((industry) => <option key={industry} value={industry}>{industry}</option>)}
        </select>
        {errorOf('industry')}
      </div>
      <div className={companyProfileStyles.formField}>
        <label className={companyProfileStyles.formLabel} htmlFor={`${idPrefix}-foundedYear`}>설립연도</label>
        <YearPicker
          id={`${idPrefix}-foundedYear`}
          label="설립연도"
          value={foundedYear}
          min={vm.foundedYearMin}
          max={vm.currentYear}
          invalid={vm.formErrors.foundedYear !== undefined}
          onChange={(year) => vm.updateForm('foundedYear', String(year))}
        />
        {errorOf('foundedYear')}
      </div>
      <div className={companyProfileStyles.formField}>
        <label className={companyProfileStyles.formLabel} htmlFor={`${idPrefix}-homepageUrl`}>홈페이지 <span className={companyProfileStyles.optionalMark}>선택</span></label>
        <input
          className={companyProfileStyles.input}
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="https://company.co.kr"
          {...field('homepageUrl')}
          onChange={(event) => vm.updateForm('homepageUrl', event.target.value)}
        />
        {errorOf('homepageUrl') ?? (vm.homepagePreview ? <span className={companyProfileStyles.formHint}>{vm.homepagePreview}</span> : null)}
      </div>
    </div>
  )
}
