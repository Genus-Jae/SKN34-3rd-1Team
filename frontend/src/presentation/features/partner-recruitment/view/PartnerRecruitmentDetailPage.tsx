import { Link } from 'react-router'

import {
  workspacePageStyles,
  workspaceTagClassName,
} from '../../../shared/workspace/WorkspacePage.styles'
import { usePartnerRecruitmentDetailViewModel } from '../viewmodel/usePartnerRecruitmentDetailViewModel'
import { partnerRecruitmentStyles } from './PartnerRecruitment.styles'

/** 모집글 상세와 참여 제안 화면입니다. 공고 원문은 그대로 보여주고 매칭은 일치·확인 필요로만 나눕니다. */
export function PartnerRecruitmentDetailPage() {
  const {
    recruitment,
    proposalMessage,
    proposalMessageMaxLength,
    updateProposalMessage,
    proposalOptions,
    toggleProposalOption,
    submitProposal,
    proposalFlowSteps,
  } = usePartnerRecruitmentDetailViewModel()

  return (
    <>
      <header className={workspacePageStyles.header}>
        <div className={workspacePageStyles.headerTitleGroup}>
          <Link className={workspacePageStyles.headerBackLink} to="/partners">
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
          <h1 className={workspacePageStyles.title}>모집글 상세</h1>
        </div>
        <div className={workspacePageStyles.headerActions}>
          <button className={workspacePageStyles.secondaryButton} type="button">
            모집글 저장
          </button>
          <button className={workspacePageStyles.secondaryButton} type="button">
            링크 복사
          </button>
        </div>
      </header>

      <div className={workspacePageStyles.content}>
        <div className={workspacePageStyles.columns}>
          <div className={workspacePageStyles.column}>
            <section className={workspacePageStyles.card} aria-label="모집 조건">
              <div className={partnerRecruitmentStyles.cardTop}>
                <span className={partnerRecruitmentStyles.tagRow}>
                  <span className={workspaceTagClassName('ok')}>기업마당 공고</span>
                  <span className={workspaceTagClassName('muted')}>
                    {recruitment.recruitmentStatusLabel}
                  </span>
                </span>
                <span className={partnerRecruitmentStyles.cardDeadline}>
                  {recruitment.recruitmentDeadline} · {recruitment.recruitmentDeadlineDate}
                </span>
              </div>

              <h2 className={partnerRecruitmentStyles.detailTitle}>{recruitment.title}</h2>

              <div className={partnerRecruitmentStyles.detailAuthorCard}>
                <span className="flex min-w-0 items-center gap-[0.65rem]">
                  <span className={partnerRecruitmentStyles.detailAuthorAvatar} aria-hidden="true">
                    {recruitment.company.initial}
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-[0.4rem]">
                      <span className={partnerRecruitmentStyles.detailAuthorName}>
                        {recruitment.company.name}
                      </span>
                      <span
                        className={workspaceTagClassName(
                          recruitment.company.isEmailVerified ? 'ok' : 'muted',
                        )}
                      >
                        {recruitment.company.isEmailVerified ? '이메일 인증' : '인증 전'}
                      </span>
                      {recruitment.company.isBusinessNumberChecked ? (
                        <span className={workspaceTagClassName('ok')}>사업자번호 형식 확인</span>
                      ) : null}
                    </span>
                    <span className={partnerRecruitmentStyles.detailAuthorSummary}>
                      {recruitment.companyDetailSummary}
                    </span>
                  </span>
                </span>
                {/* 다른 기업의 프로필 화면은 아직 없으므로 링크로 만들지 않습니다. */}
                <span className={workspacePageStyles.pendingLink} aria-disabled="true">
                  기업 프로필 보기 · 준비 중
                </span>
              </div>

              <div className={partnerRecruitmentStyles.conditionGrid}>
                {recruitment.conditions.map((condition) => (
                  <div className={partnerRecruitmentStyles.conditionCell} key={condition.label}>
                    <span className={partnerRecruitmentStyles.conditionLabel}>{condition.label}</span>
                    <span className={partnerRecruitmentStyles.conditionValue}>{condition.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className={workspacePageStyles.card} aria-label="연결된 공고">
              <p className={workspacePageStyles.sectionEyebrow}>연결된 공고</p>
              <div className={partnerRecruitmentStyles.cardTop}>
                <span className={workspaceTagClassName('ok')}>{recruitment.programStatusLabel}</span>
                <span className={partnerRecruitmentStyles.cardDeadline}>
                  {recruitment.programDeadline} · {recruitment.programDeadlineBadge}
                </span>
              </div>
              <div className="flex flex-col gap-[0.15rem]">
                <strong className={workspacePageStyles.cardTitle}>{recruitment.programTitle}</strong>
                <span className={partnerRecruitmentStyles.cardProgram}>
                  {recruitment.programOrganization}
                </span>
              </div>
              <p className="m-0 text-[0.82rem] leading-[1.55] text-[#5c6785]">
                {recruitment.programSummary}
              </p>
              <div className={partnerRecruitmentStyles.rawBox}>
                <span>
                  <strong className={partnerRecruitmentStyles.rawBoxLabel}>신청기간 원문</strong> ·{' '}
                  {recruitment.programApplicationPeriodRaw}
                </span>
                <span>
                  <strong className={partnerRecruitmentStyles.rawBoxLabel}>지원대상 원문</strong> ·{' '}
                  {recruitment.programTargetRaw}
                </span>
              </div>
              <div className={partnerRecruitmentStyles.linkRow}>
                <a
                  className={partnerRecruitmentStyles.pillLink}
                  href={recruitment.programSourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  공식 원문 보기
                </a>
                <button className={partnerRecruitmentStyles.pillLink} type="button">
                  관심 공고에 추가
                </button>
              </div>
            </section>

            <section className={workspacePageStyles.card} aria-label="모집 소개">
              <h2 className={workspacePageStyles.cardTitle}>모집 소개</h2>
              {recruitment.introductionParagraphs.map((paragraph) => (
                <p className={partnerRecruitmentStyles.bodyParagraph} key={paragraph.slice(0, 20)}>
                  {paragraph}
                </p>
              ))}

              <div className={partnerRecruitmentStyles.preparationBox}>
                <span className={partnerRecruitmentStyles.preparationTitle}>함께 준비할 일</span>
                {recruitment.preparationItems.map((item) => (
                  <span className={partnerRecruitmentStyles.preparationItem} key={item}>
                    <span className={partnerRecruitmentStyles.preparationDot} aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>

              <p className={partnerRecruitmentStyles.disclaimer}>
                모집글의 내용은 작성 기업이 직접 입력한 것이며 GovBiz가 검증하지 않습니다. 공고
                요건은 위 공식 원문에서 확인하세요.
              </p>

              <div className={partnerRecruitmentStyles.linkRow}>
                <button className={workspacePageStyles.mutedLink} type="button">
                  이 모집글 숨기기
                </button>
                <button className={workspacePageStyles.dangerLink} type="button">
                  신고
                </button>
              </div>
            </section>
          </div>

          <aside className={workspacePageStyles.column} aria-label="매칭과 참여 제안">
            <section className={workspacePageStyles.card}>
              <p className={workspacePageStyles.sectionEyebrow}>우리 기업과의 매칭</p>
              <p className={workspacePageStyles.emptyNote}>
                모집 조건과 내 프로필을 항목별로 비교했습니다. 확인 필요 항목은 상대에게 직접
                물어보세요.
              </p>
              <div className={partnerRecruitmentStyles.sideList}>
                {recruitment.matches.map((match) => (
                  <div className={partnerRecruitmentStyles.matchRow} key={match.label}>
                    <span>{match.label}</span>
                    <span className={workspaceTagClassName(match.isMatched ? 'ok' : 'warn')}>
                      {match.isMatched ? '일치' : '확인 필요'}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <form
              className={partnerRecruitmentStyles.proposalCard}
              onSubmit={submitProposal}
              aria-label="참여 제안"
            >
              <div className="flex flex-col gap-1">
                <p className={workspacePageStyles.sectionEyebrow}>참여 제안</p>
                <strong className={workspacePageStyles.cardTitle}>
                  {recruitment.company.name}에 제안 보내기
                </strong>
              </div>

              <div className={partnerRecruitmentStyles.field}>
                <label htmlFor="proposal-message">제안 메시지</label>
                <textarea
                  className={partnerRecruitmentStyles.proposalTextarea}
                  id="proposal-message"
                  maxLength={proposalMessageMaxLength}
                  placeholder="우리 기업이 맡을 역할과 확인하고 싶은 점을 적어 주세요."
                  value={proposalMessage}
                  onChange={(event) => updateProposalMessage(event.target.value)}
                />
                <span className={partnerRecruitmentStyles.proposalCounter}>
                  {proposalMessage.length} / {proposalMessageMaxLength}
                </span>
              </div>

              <div className="flex flex-col gap-[0.45rem]">
                <label className={partnerRecruitmentStyles.checkboxLabel}>
                  <input
                    className={partnerRecruitmentStyles.checkbox}
                    type="checkbox"
                    name="shareProfile"
                    checked={proposalOptions.shareProfile}
                    onChange={() => toggleProposalOption('shareProfile')}
                  />
                  기업 프로필 함께 보내기 (기본정보·역량·관심 분야)
                </label>
                <label className={partnerRecruitmentStyles.checkboxLabel}>
                  <input
                    className={partnerRecruitmentStyles.checkbox}
                    type="checkbox"
                    name="shareQualifications"
                    checked={proposalOptions.shareQualifications}
                    onChange={() => toggleProposalOption('shareQualifications')}
                  />
                  우대·인증 서류 상태도 공개
                </label>
              </div>

              <button className={partnerRecruitmentStyles.proposalSubmit} type="submit">
                참여 제안 보내기
              </button>

              <p className={partnerRecruitmentStyles.disclaimer}>
                상대가 수락하기 전에는 담당자 이름과 연락처가 공개되지 않습니다. 수락되면 메시지함이
                열리고 양쪽 담당자 정보가 서로에게 표시됩니다.
              </p>
            </form>

            <section className={partnerRecruitmentStyles.noticeCard}>
              <p className={workspacePageStyles.sectionEyebrow}>제안 상태 흐름</p>
              <div className={partnerRecruitmentStyles.flowRow}>
                {proposalFlowSteps.map((step, index) => (
                  <span className="flex items-center gap-[0.35rem]" key={step}>
                    {index > 0 ? <span aria-hidden="true">›</span> : null}
                    <span className={partnerRecruitmentStyles.flowStep}>{step}</span>
                  </span>
                ))}
              </div>
              <p className={partnerRecruitmentStyles.noticeText}>
                거절되거나 7일간 응답이 없으면 제안은 자동 종료되고 보낸 프로필은 상대에게 더 이상
                보이지 않습니다.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </>
  )
}
