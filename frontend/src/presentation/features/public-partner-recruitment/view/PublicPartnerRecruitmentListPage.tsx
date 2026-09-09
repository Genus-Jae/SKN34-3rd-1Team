import { Link } from 'react-router'

import type { PartnerRecruitmentSummary } from '../../../../domain/entities/PartnerRecruitment'
import { workspacePageStyles, workspaceTagClassName } from '../../../shared/workspace/WorkspacePage.styles'
import {
  companyInitial,
  companySummaryLine,
  programDeadlineLabel,
  recruitmentConditionTags,
  recruitmentDeadlineLabel,
} from '../../../shared/partner-recruitment/partnerRecruitmentLabels'
import { publicPaths } from '../../../shared/routes/appPaths'
import { usePublicPartnerRecruitmentListViewModel } from '../viewmodel/usePublicPartnerRecruitmentListViewModel'
import { publicPartnerRecruitmentStyles as styles } from './PublicPartnerRecruitment.styles'

function RecruitmentCard({ recruitment }: { recruitment: PartnerRecruitmentSummary }) {
  return (
    <article className={styles.card} aria-label={recruitment.title}>
      <div className={styles.cardTop}>
        <span className={workspaceTagClassName('ok')}>기업마당 공고</span>
        <span className={styles.cardDeadline}>
          {recruitment.status === 'CLOSED' ? '모집 마감' : recruitmentDeadlineLabel(recruitment.recruitmentDeadline)}
        </span>
      </div>

      <div className="flex flex-col gap-[0.2rem]">
        <h3 className={styles.cardTitle}>{recruitment.title}</h3>
        <p className={styles.cardProgram}>
          {recruitment.program.title} · {recruitment.program.organization} · {programDeadlineLabel(recruitment.program.applicationEndDate)}
        </p>
      </div>

      <div className={styles.authorRow}>
        <span className={styles.authorAvatar} aria-hidden="true">{companyInitial(recruitment.company.companyName)}</span>
        <span className="min-w-0">
          <span className={styles.authorName}>{recruitment.company.companyName}</span>
          <span className={styles.authorSummary}>{companySummaryLine(recruitment.company)}</span>
        </span>
        <span className={`ml-auto ${workspaceTagClassName(recruitment.company.isEmailVerified ? 'ok' : 'muted')}`}>
          {recruitment.company.isEmailVerified ? '이메일 인증' : '인증 전'}
        </span>
      </div>

      <div className={styles.tagRow}>
        {recruitmentConditionTags(recruitment).map((tag) => (
          <span className={workspaceTagClassName('muted')} key={tag}>{tag}</span>
        ))}
      </div>

      <div className={styles.cardFooter}>
        <span className={styles.cardFooterNote}>제안 {recruitment.proposalCount}건</span>
        <Link
          className={workspacePageStyles.primaryButton}
          to={`${publicPaths.partnerDetail}?${new URLSearchParams({ recruitmentId: String(recruitment.id) })}`}
        >
          자세히 보기
        </Link>
      </div>
    </article>
  )
}

/**
 * 로그인 전 공개 파트너 모집 목록입니다. 누구나 모집글을 읽을 수 있고, 제안·작성·프로필 일치는 로그인 뒤
 * 사이드바 안의 파트너 모집 화면이 맡습니다.
 */
export function PublicPartnerRecruitmentListPage() {
  const {
    phase,
    recruitments,
    totalPages,
    currentPage,
    goToPage,
    retry,
    resultSummary,
    loginPath,
    signupPath,
    memberBenefits,
  } = usePublicPartnerRecruitmentListViewModel()

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="public-partners-title">
        <p className={styles.eyebrow}>파트너 모집</p>
        <h1 className={styles.title} id="public-partners-title">함께 신청할 기업 찾기</h1>
        <p className={styles.description}>
          공식 공고 하나에 묶인 컨소시엄 모집글입니다. 모집글은 로그인 없이 읽을 수 있고,
          참여 제안과 모집글 작성은 로그인한 기업 회원만 할 수 있습니다.
        </p>
      </section>

      <div className={styles.columns}>
        <div className={styles.column}>
          <div className={styles.toolbar}>
            <span className={styles.resultCount} aria-live="polite">{resultSummary}</span>
          </div>
          {phase === 'failed' ? (
            <section className={styles.card} aria-label="모집글 불러오기 실패">
              <p className={styles.description}>모집글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
              <button className={workspacePageStyles.quietLink} type="button" onClick={retry}>다시 시도</button>
            </section>
          ) : phase === 'loading' && recruitments.length === 0 ? (
            <section className={styles.card} aria-label="모집글 불러오는 중">
              <p className={styles.description}>모집글을 불러오는 중입니다.</p>
            </section>
          ) : recruitments.length === 0 ? (
            <section className={styles.card} aria-label="모집글 없음">
              <p className={styles.description}>아직 모집 중인 글이 없습니다. 로그인해 첫 모집글을 올려 보세요.</p>
            </section>
          ) : (
            <>
              <div className={styles.cardGrid}>
                {recruitments.map((recruitment) => (
                  <RecruitmentCard key={recruitment.id} recruitment={recruitment} />
                ))}
              </div>
              {totalPages > 1 ? (
                <nav className={styles.moreRow} aria-label="모집글 페이지">
                  <button className={workspacePageStyles.secondaryButton} type="button" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
                    이전
                  </button>
                  <span className={styles.resultCount}>{currentPage} / {totalPages}</span>
                  <button className={workspacePageStyles.secondaryButton} type="button" disabled={currentPage >= totalPages} onClick={() => goToPage(currentPage + 1)}>
                    다음
                  </button>
                </nav>
              ) : null}
            </>
          )}
        </div>

        <aside className={styles.column} aria-label="로그인 안내">
          <section className={styles.ctaCard} aria-labelledby="public-partners-cta-title">
            <h2 className={styles.ctaTitle} id="public-partners-cta-title">로그인하면 할 수 있는 일</h2>
            <ul className={styles.ctaList}>
              {memberBenefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
            </ul>
            <div className={styles.ctaButtons}>
              <Link className={workspacePageStyles.primaryButton} to={loginPath}>로그인하고 제안하기</Link>
              <Link className={workspacePageStyles.secondaryButton} to={signupPath}>기업 계정 만들기</Link>
            </div>
            <p className={styles.ctaNote}>담당자 이름과 연락처는 제안이 수락된 뒤에만 서로에게 공개됩니다.</p>
          </section>

          <section className={styles.noticeCard} aria-label="모집 원칙">
            <p className={workspacePageStyles.sectionEyebrow}>모집 원칙</p>
            <p className={styles.noticeText}>
              모든 모집글은 공식 공고 하나에 묶입니다. 공고가 마감되면 모집도 자동 종료됩니다.
              컨소시엄 자격은 GovBiz가 보증하지 않으며 공고 원문과 기관에서 확인하세요.
            </p>
          </section>
        </aside>
      </div>
    </main>
  )
}
