import { Link } from 'react-router'

import {
  workspacePageStyles,
  workspaceTagClassName,
} from '../../../shared/workspace/WorkspacePage.styles'
import { appPaths } from '../../../shared/routes/appPaths'
import { WorkspaceToggle } from '../../../shared/workspace/WorkspaceToggle'
import { usePartnerRecruitmentCreateViewModel } from '../viewmodel/usePartnerRecruitmentCreateViewModel'
import {
  partnerRecruitmentStyles,
  partnerRoleChoiceClassName,
} from './PartnerRecruitment.styles'

/**
 * 모집글 작성 화면입니다. 모집글은 공식 공고 하나에 반드시 묶이고,
 * 모집 마감일은 공고 접수 마감일 이전만 허용합니다.
 */
export function PartnerRecruitmentCreatePage() {
  const {
    ownRoles,
    seekingRoles,
    ownRole,
    seekingRole,
    selectOwnRole,
    selectSeekingRole,
    seekingCount,
    updateSeekingCount,
    seekingRegion,
    updateSeekingRegion,
    seekingCompanyAge,
    updateSeekingCompanyAge,
    recruitmentDeadline,
    maximumRecruitmentDeadline,
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
    error,
    updateBody,
    proposalSettings,
    toggleProposalSetting,
    submit,
    draftStatus,
    ownCompany,
    selectedProgram,
    programRequirements,
    writingTips,
  } = usePartnerRecruitmentCreateViewModel()

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
        <div className={workspacePageStyles.headerActions}>
          <span className={workspaceTagClassName('muted')}>{draftStatus}</span>
        </div>
      </header>

      <div className={workspacePageStyles.content}>
        <p className={workspacePageStyles.emptyNote}>모집글 작성 데모입니다. 입력은 저장·등록되지 않으며 화면을 나가면 사라집니다.</p>
        <div className={workspacePageStyles.columns}>
          <form className={partnerRecruitmentStyles.form} onSubmit={submit} aria-label="모집글 작성" noValidate>
            <section className={partnerRecruitmentStyles.formSection}>
              <div className={partnerRecruitmentStyles.formSectionHeader}>
                <div className={partnerRecruitmentStyles.formSectionTitleGroup}>
                  <span className={partnerRecruitmentStyles.formStepBadge} aria-hidden="true">1</span>
                  <h2 className={partnerRecruitmentStyles.formSectionTitle}>연결할 공고</h2>
                  <span className={partnerRecruitmentStyles.formSectionHint}>
                    모집글은 공식 공고 하나에 반드시 묶입니다.
                  </span>
                </div>
              </div>

              <div className={partnerRecruitmentStyles.selectedProgram}>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-[0.4rem]">
                    <span className={workspaceTagClassName('ok')}>{selectedProgram.source}</span>
                    <span className={partnerRecruitmentStyles.cardDeadline}>
                      {selectedProgram.deadline}
                    </span>
                  </span>
                  <strong className={partnerRecruitmentStyles.selectedProgramTitle}>
                    {selectedProgram.title}
                  </strong>
                  <span className={partnerRecruitmentStyles.selectedProgramMeta}>
                    {selectedProgram.organization} · {selectedProgram.selectedFrom}
                  </span>
                </span>
                <button className={workspacePageStyles.secondaryButton} type="button" disabled>
                  공고 변경 · 준비 중
                </button>
              </div>

              <span className={partnerRecruitmentStyles.programSearchBox}>
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
                다른 공고 검색 · 관심 공고함에서 고르거나 공고명으로 찾기
              </span>
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
                        className={partnerRoleChoiceClassName(ownRole === role)}
                        key={role}
                        type="button"
                        aria-pressed={ownRole === role}
                        onClick={() => selectOwnRole(role)}
                      >
                        {role}
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
                        className={partnerRoleChoiceClassName(seekingRole === role)}
                        key={role}
                        type="button"
                        aria-pressed={seekingRole === role}
                        onClick={() => selectSeekingRole(role)}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={partnerRecruitmentStyles.fieldRow}>
                <label className={partnerRecruitmentStyles.field}>
                  <span>찾는 기업 수</span>
                  <input
                    className={partnerRecruitmentStyles.fieldControl}
                    type="text"
                    name="seekingCount"
                    value={seekingCount}
                    onChange={(event) => updateSeekingCount(event.target.value)}
                  />
                </label>

                <div className={partnerRecruitmentStyles.field}>
                  <label htmlFor="seeking-region">희망 지역</label>
                  <input
                    className={partnerRecruitmentStyles.fieldControl}
                    id="seeking-region"
                    type="text"
                    name="seekingRegion"
                    value={seekingRegion}
                    onChange={(event) => updateSeekingRegion(event.target.value)}
                  />
                  <span className={partnerRecruitmentStyles.fieldHint}>
                    공고 지원대상 원문: {selectedProgram.targetRaw}
                  </span>
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
                    max={maximumRecruitmentDeadline}
                    required
                    aria-invalid={error?.field === 'recruitmentDeadline'}
                    aria-describedby={error?.field === 'recruitmentDeadline' ? 'recruitment-error' : undefined}
                    value={recruitmentDeadline}
                    onChange={(event) => updateRecruitmentDeadline(event.target.value)}
                  />
                  <span className={partnerRecruitmentStyles.fieldHint}>
                    공고 마감 {selectedProgram.deadlineDate} 이전이어야 하며, 공고가 먼저 마감되면
                    모집도 자동 종료됩니다.
                  </span>
                </div>

                <label className={partnerRecruitmentStyles.field}>
                  <span className={partnerRecruitmentStyles.fieldLabelRow}>
                    희망 업력 <span className={partnerRecruitmentStyles.optionalMark}>선택</span>
                  </span>
                  <input
                    className={partnerRecruitmentStyles.fieldControl}
                    type="text"
                    name="seekingCompanyAge"
                    placeholder="무관"
                    value={seekingCompanyAge}
                    onChange={(event) => updateSeekingCompanyAge(event.target.value)}
                  />
                </label>
              </div>
            </section>

            <span className={partnerRecruitmentStyles.formDivider} aria-hidden="true" />

            <section className={partnerRecruitmentStyles.formSection}>
              <div className={partnerRecruitmentStyles.formSectionHeader}>
                <div className={partnerRecruitmentStyles.formSectionTitleGroup}>
                  <span className={partnerRecruitmentStyles.formStepBadge} aria-hidden="true">3</span>
                  <h2 className={partnerRecruitmentStyles.formSectionTitle}>소개</h2>
                </div>
                <button className={workspacePageStyles.secondaryButton} type="button" disabled>
                  참여 요건 초안 가져오기 · 준비 중
                </button>
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
                  aria-describedby={error?.field === 'title' ? 'recruitment-error' : undefined}
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
                  required
                  aria-invalid={error?.field === 'body'}
                  aria-describedby={error?.field === 'body' ? 'recruitment-error' : undefined}
                  placeholder="우리 기업 소개, 맡을 역할, 상대에게 바라는 역량과 일정을 적어 주세요."
                  value={body}
                  onChange={(event) => updateBody(event.target.value)}
                />
                <span className={partnerRecruitmentStyles.fieldHint}>
                  연락처, 이메일, 금액 확약은 본문에 적지 마세요. 담당자 정보는 제안 수락 후 자동으로
                  공개됩니다.
                </span>
              </div>
            </section>

            <span className={partnerRecruitmentStyles.formDivider} aria-hidden="true" />

            <section className={partnerRecruitmentStyles.formSection}>
              <div className={partnerRecruitmentStyles.formSectionTitleGroup}>
                <span className={partnerRecruitmentStyles.formStepBadge} aria-hidden="true">4</span>
                <h2 className={partnerRecruitmentStyles.formSectionTitle}>제안 받기 설정</h2>
              </div>

              <div className="flex flex-col gap-2">
                <div className={partnerRecruitmentStyles.toggleRow}>
                  <span className="min-w-0">
                    <strong className={partnerRecruitmentStyles.toggleTitle}>
                      이메일 인증을 마친 기업만 제안 가능
                    </strong>
                    <span className={partnerRecruitmentStyles.toggleDescription}>
                      스팸 제안을 줄입니다. 끄면 인증 전 기업의 제안도 받습니다.
                    </span>
                  </span>
                  <WorkspaceToggle
                    label="이메일 인증을 마친 기업만 제안 가능"
                    isOn={proposalSettings.verifiedOnly}
                    onToggle={() => toggleProposalSetting('verifiedOnly')}
                  />
                </div>

                <div className={partnerRecruitmentStyles.toggleRow}>
                  <span className="min-w-0">
                    <strong className={partnerRecruitmentStyles.toggleTitle}>
                      새 제안이 오면 이메일 알림
                    </strong>
                    <span className={partnerRecruitmentStyles.toggleDescription}>
                      하루 한 번 묶어서 보냅니다.
                    </span>
                  </span>
                  <WorkspaceToggle
                    label="새 제안이 오면 이메일 알림"
                    isOn={proposalSettings.emailNotice}
                    onToggle={() => toggleProposalSetting('emailNotice')}
                  />
                </div>

                <div className={partnerRecruitmentStyles.toggleRow}>
                  <span className="min-w-0">
                    <strong className={partnerRecruitmentStyles.toggleTitle}>
                      우대·인증 서류 상태를 모집글에 표시
                    </strong>
                    <span className={partnerRecruitmentStyles.toggleDescription}>
                      벤처기업 확인 보유 · 중소기업 확인서 확인 필요
                    </span>
                  </span>
                  <WorkspaceToggle
                    label="우대·인증 서류 상태를 모집글에 표시"
                    isOn={proposalSettings.showQualifications}
                    onToggle={() => toggleProposalSetting('showQualifications')}
                  />
                </div>
              </div>
            </section>

            {error ? <p id="recruitment-error" className={workspacePageStyles.emptyNote} role="alert">{error.message}</p> : null}
            <div className={partnerRecruitmentStyles.formActions}>
              <p className={partnerRecruitmentStyles.formActionsNote}>
                입력 형식을 확인한 뒤 예시 목록으로 이동합니다. 실제 모집글은 등록되지 않습니다.
              </p>
              <div className={partnerRecruitmentStyles.formActionButtons}>
                <Link className={partnerRecruitmentStyles.formCancelButton} to={appPaths.partners}>
                  취소
                </Link>
                <button className={partnerRecruitmentStyles.formSubmitButton} type="submit">
                  입력 확인 후 목록으로
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
                  aria-hidden="true"
                >
                  {ownCompany.initial}
                </span>
                <span className="min-w-0">
                  <span className={partnerRecruitmentStyles.authorName}>{ownCompany.name}</span>
                  <span className={partnerRecruitmentStyles.authorSummary}>
                    {ownCompany.profileSummary}
                  </span>
                </span>
              </div>
              <div className={partnerRecruitmentStyles.tagRow}>
                <span className={workspaceTagClassName(ownCompany.isEmailVerified ? 'ok' : 'warn')}>
                  {ownCompany.isEmailVerified ? '이메일 인증' : '이메일 미인증'}
                </span>
                {ownCompany.isBusinessNumberChecked ? (
                  <span className={workspaceTagClassName('ok')}>사업자번호 형식 확인</span>
                ) : null}
                <span className={workspaceTagClassName('muted')}>
                  프로필 {ownCompany.profileCompletionPercent}%
                </span>
              </div>
              <p className={workspacePageStyles.emptyNote}>
                보유 역량·실적 문구와 관심 분야가 함께 보입니다. 담당자 이름과 이메일은 보이지
                않습니다.
              </p>
            </section>

            <section className={workspacePageStyles.card}>
              <p className={workspacePageStyles.sectionEyebrow}>공고에서 확인한 컨소시엄 요건</p>
              <div className="flex flex-col gap-[0.4rem]">
                {programRequirements.map((requirement) => (
                  <span className={partnerRecruitmentStyles.requirementRow} key={requirement.text}>
                    <span className={workspaceTagClassName(requirement.needsCheck ? 'warn' : 'ok')}>
                      {requirement.source}
                    </span>
                    {requirement.text}
                  </span>
                ))}
              </div>
              <p className={partnerRecruitmentStyles.disclaimer}>
                공고 원문에서 발췌한 문장만 표시합니다. 원문에 없는 조건은 추정하지 않습니다.
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
