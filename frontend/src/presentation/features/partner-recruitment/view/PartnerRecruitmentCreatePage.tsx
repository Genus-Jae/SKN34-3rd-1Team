import { Link } from 'react-router'

import {
  workspacePageStyles,
  workspaceTagClassName,
} from '../../../shared/workspace/WorkspacePage.styles'
import { appPaths } from '../../../shared/routes/appPaths'
import { usePartnerRecruitmentCreateViewModel } from '../viewmodel/usePartnerRecruitmentCreateViewModel'
import {
  partnerRecruitmentStyles,
  partnerRoleChoiceClassName,
} from './PartnerRecruitment.styles'

/**
 * 모집글 작성 화면입니다. 모집글은 공식 공고 하나에 반드시 묶이고,
 * 모집 마감일은 공고 접수 마감일 이전만 허용합니다. 등록에 성공하면 새 모집글 상세로 이동합니다.
 */
export function PartnerRecruitmentCreatePage() {
  const {
    ownRoles,
    seekingRoles,
    ownRole,
    seekingRole,
    selectOwnRole,
    selectSeekingRole,
    seekingCountRange,
    seekingCount,
    updateSeekingCount,
    regionOptions,
    seekingRegion,
    updateSeekingRegion,
    companyAgeYearsRange,
    minimumCompanyAgeYears,
    updateMinimumCompanyAgeYears,
    recruitmentDeadline,
    maximumRecruitmentDeadline,
    minimumRecruitmentDeadline,
    updateRecruitmentDeadline,
    capabilities,
    capabilityDraft,
    updateCapabilityDraft,
    addCapabilityOnEnter,
    removeCapability,
    title,
    titleMaxLength,
    updateTitle,
    body,
    bodyMaxLength,
    updateBody,
    error,
    isSubmitting,
    submit,
    canCreate,
    profilePath,
    ownCompany,
    programKeyword,
    updateProgramKeyword,
    programSearch,
    canAttachRecruitment,
    selectedProgram,
    selectProgram,
    clearProgram,
    writingTips,
  } = usePartnerRecruitmentCreateViewModel()

  if (!canCreate || ownCompany === null) {
    return (
      <>
        <header className={workspacePageStyles.header}>
          <div className={workspacePageStyles.headerTitleGroup}>
            <Link className={workspacePageStyles.headerBackLink} to={appPaths.partners}>파트너 모집 목록</Link>
            <h1 className={workspacePageStyles.title}>모집글 작성</h1>
          </div>
        </header>
        <div className={workspacePageStyles.content}>
          <section className={workspacePageStyles.card} aria-label="기업 등록 필요">
            <h2 className={workspacePageStyles.cardTitle}>기업을 등록한 뒤 모집글을 쓸 수 있습니다</h2>
            <p className={workspacePageStyles.emptyNote}>
              모집글에는 사업자등록번호 조회로 확인한 기업명이 표시됩니다. 프로필에서 사업자등록번호를 조회하고 기업을 등록해 주세요.
            </p>
            <div className={partnerRecruitmentStyles.linkRow}>
              <Link className={workspacePageStyles.primaryButton} to={profilePath}>프로필에서 기업 등록</Link>
            </div>
          </section>
        </div>
      </>
    )
  }

  const describedBy = (field: NonNullable<typeof error>['field']) => (error?.field === field ? 'recruitment-error' : undefined)

  return (
    <>
      <header className={workspacePageStyles.header}>
        <div className={workspacePageStyles.headerTitleGroup}>
          <Link className={workspacePageStyles.headerBackLink} to={appPaths.partners}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            파트너 모집 목록
          </Link>
          <h1 className={workspacePageStyles.title}>모집글 작성</h1>
        </div>
      </header>

      <div className={workspacePageStyles.content}>
        <p className={workspacePageStyles.emptyNote}>공고 하나를 골라 모집글을 등록합니다. 같은 공고에는 모집글을 하나만 쓸 수 있습니다.</p>
        <div className={workspacePageStyles.columns}>
          <form className={partnerRecruitmentStyles.form} onSubmit={(event) => void submit(event)} aria-label="모집글 작성" noValidate>
            <section className={partnerRecruitmentStyles.formSection}>
              <div className={partnerRecruitmentStyles.formSectionHeader}>
                <div className={partnerRecruitmentStyles.formSectionTitleGroup}>
                  <span className={partnerRecruitmentStyles.formStepBadge} aria-hidden="true">1</span>
                  <h2 className={partnerRecruitmentStyles.formSectionTitle}>연결할 공고</h2>
                  <span className={partnerRecruitmentStyles.formSectionHint}>
                    모집글은 접수 중인 공식 공고 하나에 반드시 묶입니다.
                  </span>
                </div>
              </div>

              {selectedProgram ? (
                <div className={partnerRecruitmentStyles.selectedProgram} aria-label="선택한 공고">
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-[0.4rem]">
                      <span className={workspaceTagClassName('ok')}>{selectedProgram.sourceName}</span>
                      <span className={partnerRecruitmentStyles.cardDeadline}>
                        {selectedProgram.applicationEndDate === null ? '공고 마감일 미정' : `공고 마감 ${selectedProgram.applicationEndDate}`}
                      </span>
                    </span>
                    <strong className={partnerRecruitmentStyles.selectedProgramTitle}>
                      {selectedProgram.title}
                    </strong>
                    <span className={partnerRecruitmentStyles.selectedProgramMeta}>
                      {selectedProgram.organization} · {selectedProgram.applicationPeriod}
                    </span>
                  </span>
                  <button className={workspacePageStyles.secondaryButton} type="button" onClick={clearProgram}>
                    공고 변경
                  </button>
                </div>
              ) : (
                <div className={partnerRecruitmentStyles.field}>
                  <label htmlFor="program-keyword">공고 검색</label>
                  <input
                    className={partnerRecruitmentStyles.fieldControl}
                    id="program-keyword"
                    type="search"
                    name="programKeyword"
                    placeholder="공고명이나 기관명을 두 글자 이상 입력하세요"
                    aria-invalid={error?.field === 'program'}
                    aria-describedby={describedBy('program')}
                    value={programKeyword}
                    onChange={(event) => updateProgramKeyword(event.target.value)}
                  />
                  <span className={partnerRecruitmentStyles.fieldHint}>접수 중인 공고만 검색합니다. 관심 공고함 연동은 준비 중입니다.</span>
                  {programSearch.status === 'searching' ? (
                    <p className={workspacePageStyles.emptyNote}>공고를 찾는 중입니다.</p>
                  ) : programSearch.status === 'failed' ? (
                    <p className={workspacePageStyles.emptyNote} role="alert">공고를 검색하지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
                  ) : programSearch.status === 'found' && programSearch.programs.length === 0 ? (
                    <p className={workspacePageStyles.emptyNote}>검색어에 맞는 접수 중 공고가 없습니다.</p>
                  ) : programSearch.status === 'found' ? (
                    <ul className={partnerRecruitmentStyles.programResultList} aria-label="공고 검색 결과">
                      {programSearch.programs.map((program) => (
                        <li className={partnerRecruitmentStyles.programResult} key={`${program.sourceCode}:${program.id}`}>
                          <span className="flex min-w-0 flex-col gap-[0.15rem]">
                            <span className={partnerRecruitmentStyles.selectedProgramTitle}>{program.title}</span>
                            <span className={partnerRecruitmentStyles.selectedProgramMeta}>
                              {program.organization} · {program.applicationEndDate === null ? '마감일 미정' : `마감 ${program.applicationEndDate}`}
                              {canAttachRecruitment(program) ? null : ' · 오늘 접수 마감'}
                            </span>
                          </span>
                          <button
                            className={workspacePageStyles.secondaryButton}
                            type="button"
                            aria-label={`${program.title} 선택`}
                            disabled={!canAttachRecruitment(program)}
                            onClick={() => selectProgram(program)}
                          >
                            선택
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
            </section>

            <span className={partnerRecruitmentStyles.formDivider} aria-hidden="true" />

            <section className={partnerRecruitmentStyles.formSection}>
              <div className={partnerRecruitmentStyles.formSectionTitleGroup}>
                <span className={partnerRecruitmentStyles.formStepBadge} aria-hidden="true">2</span>
                <h2 className={partnerRecruitmentStyles.formSectionTitle}>역할과 조건</h2>
              </div>

              <div className={partnerRecruitmentStyles.fieldRow}>
                <div className={partnerRecruitmentStyles.field}>
                  <span id="own-role-label">우리 기업의 역할</span>
                  <div className={partnerRecruitmentStyles.roleChoices} role="group" aria-labelledby="own-role-label">
                    {ownRoles.map((role) => (
                      <button
                        className={partnerRoleChoiceClassName(ownRole === role.value)}
                        key={role.value}
                        type="button"
                        aria-pressed={ownRole === role.value}
                        onClick={() => selectOwnRole(role.value)}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={partnerRecruitmentStyles.field}>
                  <span id="seeking-role-label">찾는 역할</span>
                  <div
                    className={partnerRecruitmentStyles.roleChoices}
                    role="group"
                    aria-labelledby="seeking-role-label"
                  >
                    {seekingRoles.map((role) => (
                      <button
                        className={partnerRoleChoiceClassName(seekingRole === role.value)}
                        key={role.value}
                        type="button"
                        aria-pressed={seekingRole === role.value}
                        onClick={() => selectSeekingRole(role.value)}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={partnerRecruitmentStyles.fieldRow}>
                <div className={partnerRecruitmentStyles.field}>
                  <label htmlFor="seeking-count">찾는 기업 수</label>
                  <span className={partnerRecruitmentStyles.unitField}>
                    <input
                      className={partnerRecruitmentStyles.fieldControl}
                      id="seeking-count"
                      type="number"
                      name="seekingCount"
                      inputMode="numeric"
                      min={seekingCountRange.min}
                      max={seekingCountRange.max}
                      step={1}
                      aria-invalid={error?.field === 'seekingCount'}
                      aria-describedby={describedBy('seekingCount')}
                      value={Number.isNaN(seekingCount) ? '' : seekingCount}
                      onChange={(event) => updateSeekingCount(event.target.value)}
                    />
                    <span className={partnerRecruitmentStyles.unitLabel} aria-hidden="true">곳</span>
                  </span>
                  <span className={partnerRecruitmentStyles.fieldHint}>함께할 기업 수를 {seekingCountRange.min}~{seekingCountRange.max} 사이로 적습니다.</span>
                </div>

                <div className={partnerRecruitmentStyles.field}>
                  <label htmlFor="seeking-region">희망 지역</label>
                  <select
                    className={partnerRecruitmentStyles.fieldControl}
                    id="seeking-region"
                    name="seekingRegion"
                    value={seekingRegion}
                    onChange={(event) => updateSeekingRegion(event.target.value)}
                  >
                    {regionOptions.map((region) => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                  {selectedProgram ? (
                    <span className={partnerRecruitmentStyles.fieldHint}>
                      공고 지원대상 원문: {selectedProgram.targetDescription}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className={partnerRecruitmentStyles.field}>
                <label htmlFor="capability-input">필요 역량</label>
                <div className={partnerRecruitmentStyles.capabilityBox}>
                  {capabilities.map((capability) => (
                    <span className={partnerRecruitmentStyles.capabilityChip} key={capability}>
                      {capability}
                      <button
                        className={partnerRecruitmentStyles.capabilityRemove}
                        type="button"
                        aria-label={`${capability} 삭제`}
                        onClick={() => removeCapability(capability)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    className={partnerRecruitmentStyles.capabilityInput}
                    id="capability-input"
                    type="text"
                    placeholder="역량 입력 후 Enter"
                    aria-describedby={describedBy('capabilities')}
                    value={capabilityDraft}
                    onChange={(event) => updateCapabilityDraft(event.target.value)}
                    onKeyDown={addCapabilityOnEnter}
                  />
                </div>
              </div>

              <div className={partnerRecruitmentStyles.fieldRow}>
                <div className={partnerRecruitmentStyles.field}>
                  <label htmlFor="recruitment-deadline">모집 마감일</label>
                  <input
                    className={partnerRecruitmentStyles.fieldControl}
                    id="recruitment-deadline"
                    type="date"
                    name="recruitmentDeadline"
                    min={minimumRecruitmentDeadline}
                    max={maximumRecruitmentDeadline ?? undefined}
                    required
                    aria-invalid={error?.field === 'recruitmentDeadline'}
                    aria-describedby={describedBy('recruitmentDeadline')}
                    value={recruitmentDeadline}
                    onChange={(event) => updateRecruitmentDeadline(event.target.value)}
                  />
                  <span className={partnerRecruitmentStyles.fieldHint}>
                    {maximumRecruitmentDeadline === null
                      ? '오늘 이후 날짜를 고르세요. 공고가 먼저 마감되면 모집도 자동 종료됩니다.'
                      : `공고 접수 마감 전날인 ${maximumRecruitmentDeadline}까지 고를 수 있으며, 공고가 먼저 마감되면 모집도 자동 종료됩니다.`}
                  </span>
                </div>

                <div className={partnerRecruitmentStyles.field}>
                  <label htmlFor="company-age">
                    <span className={partnerRecruitmentStyles.fieldLabelRow}>
                      희망 업력 <span className={partnerRecruitmentStyles.optionalMark}>선택</span>
                    </span>
                  </label>
                  <span className={partnerRecruitmentStyles.unitField}>
                    <input
                      className={partnerRecruitmentStyles.fieldControl}
                      id="company-age"
                      type="number"
                      name="minimumCompanyAgeYears"
                      inputMode="numeric"
                      min={companyAgeYearsRange.min}
                      max={companyAgeYearsRange.max}
                      step={1}
                      placeholder="무관"
                      aria-invalid={error?.field === 'minimumCompanyAgeYears'}
                      aria-describedby={describedBy('minimumCompanyAgeYears')}
                      value={minimumCompanyAgeYears ?? ''}
                      onChange={(event) => updateMinimumCompanyAgeYears(event.target.value)}
                    />
                    <span className={partnerRecruitmentStyles.unitLabel} aria-hidden="true">년 이상</span>
                  </span>
                  <span className={partnerRecruitmentStyles.fieldHint}>비워 두면 업력 무관으로 표시합니다.</span>
                </div>
              </div>
            </section>

            <span className={partnerRecruitmentStyles.formDivider} aria-hidden="true" />

            <section className={partnerRecruitmentStyles.formSection}>
              <div className={partnerRecruitmentStyles.formSectionHeader}>
                <div className={partnerRecruitmentStyles.formSectionTitleGroup}>
                  <span className={partnerRecruitmentStyles.formStepBadge} aria-hidden="true">3</span>
                  <h2 className={partnerRecruitmentStyles.formSectionTitle}>소개</h2>
                </div>
              </div>

              <div className={partnerRecruitmentStyles.field}>
                <label htmlFor="recruitment-title">제목</label>
                <input
                  className={partnerRecruitmentStyles.fieldControl}
                  id="recruitment-title"
                  type="text"
                  name="title"
                  maxLength={titleMaxLength}
                  required
                  aria-invalid={error?.field === 'title'}
                  aria-describedby={describedBy('title')}
                  placeholder="어떤 과제에 어떤 파트너를 찾는지 한 줄로 적어 주세요."
                  value={title}
                  onChange={(event) => updateTitle(event.target.value)}
                />
                <span className={partnerRecruitmentStyles.proposalCounter}>
                  {title.length} / {titleMaxLength}
                </span>
              </div>

              <div className={partnerRecruitmentStyles.field}>
                <label htmlFor="recruitment-body">본문</label>
                <textarea
                  className={`${partnerRecruitmentStyles.fieldControl} ${partnerRecruitmentStyles.fieldTextarea}`}
                  id="recruitment-body"
                  name="body"
                  maxLength={bodyMaxLength}
                  required
                  aria-invalid={error?.field === 'body'}
                  aria-describedby={describedBy('body')}
                  placeholder="우리 기업 소개, 맡을 역할, 상대에게 바라는 역량과 일정을 적어 주세요."
                  value={body}
                  onChange={(event) => updateBody(event.target.value)}
                />
                <span className={partnerRecruitmentStyles.proposalCounter}>
                  {body.length} / {bodyMaxLength}
                </span>
                <span className={partnerRecruitmentStyles.fieldHint}>
                  연락처, 이메일, 금액 확약은 본문에 적지 마세요. 담당자 정보는 제안 수락 후 자동으로
                  공개됩니다.
                </span>
              </div>
            </section>

            {error ? <p id="recruitment-error" className={workspacePageStyles.emptyNote} role="alert">{error.message}</p> : null}
            <div className={partnerRecruitmentStyles.formActions}>
              <p className={partnerRecruitmentStyles.formActionsNote}>
                등록하면 목록과 상세에 바로 공개됩니다. 수정·마감은 준비 중이니 내용을 한 번 더 확인해 주세요.
              </p>
              <div className={partnerRecruitmentStyles.formActionButtons}>
                <Link className={partnerRecruitmentStyles.formCancelButton} to={appPaths.partners}>
                  취소
                </Link>
                <button className={partnerRecruitmentStyles.formSubmitButton} type="submit" disabled={isSubmitting}>
                  {isSubmitting ? '등록 중…' : '모집글 등록'}
                </button>
              </div>
            </div>
          </form>

          <aside className={workspacePageStyles.column} aria-label="작성 참고">
            <section className={workspacePageStyles.card}>
              <p className={workspacePageStyles.sectionEyebrow}>모집글에 표시되는 우리 기업</p>
              <div className={partnerRecruitmentStyles.authorRow}>
                <span
                  className={`${partnerRecruitmentStyles.authorAvatar} ${partnerRecruitmentStyles.authorAvatarMine}`}
                >
                  {ownCompany.initial}
                </span>
                <span className="min-w-0">
                  <span className={partnerRecruitmentStyles.authorName}>{ownCompany.name}</span>
                  <span className={partnerRecruitmentStyles.authorSummary}>사업자등록번호 조회로 확인한 등록 기업</span>
                </span>
              </div>
              <div className={partnerRecruitmentStyles.tagRow}>
                <span className={workspaceTagClassName('ok')}>사업자 확인</span>
                <span className={workspaceTagClassName(ownCompany.isEmailVerified ? 'ok' : 'muted')}>
                  {ownCompany.isEmailVerified ? '이메일 인증' : '이메일 인증 전'}
                </span>
              </div>
              <p className={workspacePageStyles.emptyNote}>
                프로필의 소재지·업종·설립연도가 함께 보입니다. 담당자 이메일은 제안을 수락한 뒤에만 상대에게 공개되고,
                참여 제안은 기업을 등록한 회원끼리 주고받습니다.
              </p>
            </section>

            <section className={workspacePageStyles.card}>
              <p className={workspacePageStyles.sectionEyebrow}>공고 원문 확인</p>
              {selectedProgram ? (
                <>
                  <p className={partnerRecruitmentStyles.requirementRow}>
                    <span className={workspaceTagClassName('ok')}>원문</span>
                    {selectedProgram.targetDescription}
                  </p>
                  <a className={workspacePageStyles.quietLink} href={selectedProgram.sourceUrl} rel="noreferrer" target="_blank">
                    공식 원문 보기
                  </a>
                </>
              ) : (
                <p className={workspacePageStyles.emptyNote}>공고를 고르면 지원대상 원문과 공식 원문 링크가 여기에 보입니다.</p>
              )}
              <p className={partnerRecruitmentStyles.disclaimer}>
                공고 원문에서 발췌한 문장만 표시합니다. 컨소시엄 요건은 원문과 기관에서 직접 확인하세요.
              </p>
            </section>

            <section className={partnerRecruitmentStyles.noticeCard}>
              <p className={workspacePageStyles.sectionEyebrow}>작성 팁</p>
              <div className="flex flex-col gap-[0.35rem]">
                {writingTips.map((tip) => (
                  <span className={partnerRecruitmentStyles.noticeText} key={tip}>
                    · {tip}
                  </span>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </>
  )
}
