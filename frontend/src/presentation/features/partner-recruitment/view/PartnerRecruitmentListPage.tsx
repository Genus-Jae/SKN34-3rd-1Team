import { Link } from 'react-router'

import type { PartnerRecruitment } from '../../../../domain/entities/PartnerRecruitment'
import {
  workspaceChipClassName,
  workspacePageStyles,
  workspaceTagClassName,
} from '../../../shared/workspace/WorkspacePage.styles'
import { appPaths } from '../../../shared/routes/appPaths'
import { usePartnerRecruitmentListViewModel } from '../viewmodel/usePartnerRecruitmentListViewModel'
import {
  partnerRecruitmentStyles,
  partnerTabClassName,
} from './PartnerRecruitment.styles'

function RecruitmentCard({ recruitment, availableDetailId }: { recruitment: PartnerRecruitment; availableDetailId: string }) {
  const cardClassName = recruitment.isMine
    ? workspacePageStyles.outlinedCard
    : workspacePageStyles.card

  return (
    <article className={cardClassName} aria-label={recruitment.title}>
      <div className={partnerRecruitmentStyles.cardTop}>
        <span className={workspaceTagClassName(recruitment.isMine ? 'warn' : 'ok')}>
          {recruitment.isMine ? '내가 쓴 모집글' : '기업마당 공고'}
        </span>
        <span
          className={
            recruitment.isMine
              ? partnerRecruitmentStyles.mineDeadline
              : partnerRecruitmentStyles.cardDeadline
          }
        >
          {recruitment.recruitmentDeadline}
        </span>
      </div>

      <div className="flex flex-col gap-[0.2rem]">
        <h3 className={partnerRecruitmentStyles.cardTitle}>{recruitment.title}</h3>
        <p className={partnerRecruitmentStyles.cardProgram}>
          {recruitment.programTitle} · {recruitment.programOrganization} ·{' '}
          {recruitment.programDeadline}
        </p>
      </div>

      <div className={partnerRecruitmentStyles.authorRow}>
        <span
          className={`${partnerRecruitmentStyles.authorAvatar} ${
            recruitment.isMine
              ? partnerRecruitmentStyles.authorAvatarMine
              : partnerRecruitmentStyles.authorAvatarOther
          }`}
          aria-hidden="true"
        >
          {recruitment.company.initial}
        </span>
        <span className="min-w-0">
          <span className={partnerRecruitmentStyles.authorName}>{recruitment.company.name}</span>
          <span className={partnerRecruitmentStyles.authorSummary}>
            {recruitment.company.profileSummary}
          </span>
        </span>
        {recruitment.isMine ? null : (
          <span
            className={`ml-auto ${workspaceTagClassName(
              recruitment.company.isEmailVerified ? 'ok' : 'muted',
            )}`}
          >
            {recruitment.company.isEmailVerified ? '이메일 인증' : '인증 전'}
          </span>
        )}
      </div>

      <div className={partnerRecruitmentStyles.tagRow}>
        {recruitment.conditionTags.map((tag) => (
          <span className={workspaceTagClassName('muted')} key={tag}>
            {tag}
          </span>
        ))}
      </div>

      <div className={partnerRecruitmentStyles.cardFooter}>
        {recruitment.isMine ? (
          <span className={partnerRecruitmentStyles.cardFooterNote}>
            받은 제안 {recruitment.proposalCount}건 · 미확인 {recruitment.unreadProposalCount}
          </span>
        ) : (
          <span className={partnerRecruitmentStyles.cardFooterNote}>
            <span
              className={workspaceTagClassName(
                recruitment.matchedConditionCount > 0 ? 'info' : 'muted',
              )}
            >
              내 프로필 일치 {recruitment.matchedConditionCount}
            </span>
            · 제안 {recruitment.proposalCount}건
          </span>
        )}
        {recruitment.id === availableDetailId ? <Link
          className={
            recruitment.isMine
              ? workspacePageStyles.secondaryButton
              : workspacePageStyles.primaryButton
          }
          to={`${appPaths.partnerDetail}?${new URLSearchParams({ recruitmentId: recruitment.id })}`}
        >
          {recruitment.isMine ? '제안 관리' : '자세히 보기'}
        </Link> : <span className={workspacePageStyles.pendingLink} aria-disabled="true">
          {recruitment.isMine ? '제안 관리 · 준비 중' : '상세 · 준비 중'}
        </span>}
      </div>
    </article>
  )
}

/** 파트너 모집 목록입니다. 모집글은 모두 공식 공고 하나에 묶이며 공고가 마감되면 모집도 종료됩니다. */
export function PartnerRecruitmentListPage() {
  const {
    recruitments,
    availableDetailId,
    remainingRecruitmentCount,
    tabs,
    filters,
    resultSummary,
    profileSummary,
    recommendedRecruitments,
    activityStats,
  } = usePartnerRecruitmentListViewModel()

  return (
    <>
      <header className={partnerRecruitmentStyles.listHeader}>
        <div className={partnerRecruitmentStyles.listTitleGroup}>
          <p className={partnerRecruitmentStyles.listBadge}>파트너 모집</p>
          <h1 className={partnerRecruitmentStyles.listTitle}>함께 신청할 기업 찾기</h1>
          <p className={partnerRecruitmentStyles.listDescription}>
            공고와 기업의 역량을 한눈에 살펴보세요.
          </p>
        </div>
        <div className={workspacePageStyles.headerActions}>
          <Link className={workspacePageStyles.primaryButton} to={appPaths.partnerNew}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            모집글 작성
          </Link>
        </div>
      </header>

      <div className={workspacePageStyles.content}>
        <p className={workspacePageStyles.emptyNote}>파트너 모집 데모입니다. 기업·모집글·매칭은 예시이며 검색·필터·제안 기능은 준비 중입니다.</p>
        <div className={workspacePageStyles.columns}>
          <div className={workspacePageStyles.column}>
            <div className={partnerRecruitmentStyles.toolbar}>
              <div className={partnerRecruitmentStyles.tabs} role="group" aria-label="모집 화면 예시">
                {tabs.map((tab) => (
                  <span
                    className={partnerTabClassName(tab.isActive)}
                    key={tab.label}
                    aria-disabled={!tab.isActive || undefined}
                  >
                    {tab.label}
                    {tab.count ? (
                      <span className={partnerRecruitmentStyles.tabCount}>{tab.count}</span>
                    ) : null}
                  </span>
                ))}
              </div>
              <span className={partnerRecruitmentStyles.search}>
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
                공고명, 역량, 기업명 검색
              </span>
            </div>

            <div className={partnerRecruitmentStyles.filters}>
              <span className={partnerRecruitmentStyles.filterLabel}>필터</span>
              {filters.map((filter) => (
                <span className={workspaceChipClassName(filter.isActive)} key={filter.label}>
                  {filter.label}
                </span>
              ))}
              <span className={partnerRecruitmentStyles.resultCount}>{resultSummary}</span>
            </div>

            <div className={partnerRecruitmentStyles.cardGrid}>
              {recruitments.map((recruitment) => (
                <RecruitmentCard key={recruitment.id} recruitment={recruitment} availableDetailId={availableDetailId} />
              ))}
            </div>

            <div className={partnerRecruitmentStyles.moreRow}>
              <button className={workspacePageStyles.secondaryButton} type="button" disabled>
                모집글 {remainingRecruitmentCount}건 더 보기 · 준비 중
              </button>
            </div>
          </div>

          <aside className={workspacePageStyles.column} aria-label="모집 요약">
            <section className={workspacePageStyles.card}>
              <p className={workspacePageStyles.sectionEyebrow}>내 프로필로 추천된 모집</p>
              <p className={workspacePageStyles.emptyNote}>{profileSummary}</p>
              <div className={partnerRecruitmentStyles.sideList}>
                {recommendedRecruitments.map((item) => (
                  <div className={partnerRecruitmentStyles.sideItem} key={item.title}>
                    <span className={partnerRecruitmentStyles.sideItemTitle}>{item.title}</span>
                    <span className={partnerRecruitmentStyles.tagRow}>
                      {item.reasons.map((reason) => (
                        <span
                          className={workspaceTagClassName(reason.isMatched ? 'ok' : 'warn')}
                          key={reason.label}
                        >
                          {reason.label}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className={workspacePageStyles.card}>
              <p className={workspacePageStyles.sectionEyebrow}>내 활동</p>
              <div className={partnerRecruitmentStyles.statGrid}>
                {activityStats.map((stat) => (
                  <div className={partnerRecruitmentStyles.statCell} key={stat.label}>
                    <strong className={partnerRecruitmentStyles.statValue}>{stat.value}</strong>
                    <span className={partnerRecruitmentStyles.statLabel}>{stat.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className={partnerRecruitmentStyles.noticeCard}>
              <p className={workspacePageStyles.sectionEyebrow}>모집 원칙</p>
              <p className={partnerRecruitmentStyles.noticeText}>
                모든 모집글은 공식 공고 하나에 묶입니다. 공고가 마감되면 모집도 자동 종료됩니다.
                컨소시엄 자격은 GovBiz가 보증하지 않으며 공고 원문과 기관에서 확인하세요.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </>
  )
}
