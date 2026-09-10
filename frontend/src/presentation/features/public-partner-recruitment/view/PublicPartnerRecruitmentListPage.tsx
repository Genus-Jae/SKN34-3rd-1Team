import type { PartnerRecruitmentSummary } from '../../../../domain/entities/PartnerRecruitment'
import { workspacePageStyles, workspaceTagClassName } from '../../../shared/workspace/WorkspacePage.styles'
import {
  programDeadlineLabel,
  recruitmentConditionTags,
  recruitmentDeadlineLabel,
} from '../../../shared/partner-recruitment/partnerRecruitmentLabels'
import { usePublicPartnerRecruitmentListViewModel } from '../viewmodel/usePublicPartnerRecruitmentListViewModel'
import { MaskedCompanyRow } from './MaskedCompanyRow'
import { PublicLoginPromptDialog } from './PublicLoginPromptDialog'
import { publicPartnerRecruitmentStyles as styles } from './PublicPartnerRecruitment.styles'

function RecruitmentCard({
  recruitment,
  onOpenLoginPrompt,
}: {
  recruitment: PartnerRecruitmentSummary
  onOpenLoginPrompt: (recruitment: PartnerRecruitmentSummary) => void
}) {
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

      {/* 작성 기업 정보는 로그인 뒤에만 보여 주므로 자리만 흐리게 가립니다. */}
      <MaskedCompanyRow />

      <div className={styles.tagRow}>
        {recruitmentConditionTags(recruitment).map((tag) => (
          <span className={workspaceTagClassName('muted')} key={tag} title={tag}>{tag}</span>
        ))}
      </div>

      <div className={styles.cardFooter}>
        <span className={styles.cardFooterNote}>제안 {recruitment.proposalCount}건</span>
        <button className={workspacePageStyles.primaryButton} type="button" onClick={() => onOpenLoginPrompt(recruitment)}>
          자세히 보기
        </button>
      </div>
    </article>
  )
}

/**
 * 로그인 전 공개 파트너 모집 목록입니다. 모집글 제목·공고·조건은 누구나 읽지만 작성 기업 정보는 가리고,
 * 자세히 보기를 누르면 로그인하면 할 수 있는 일을 다이얼로그로 안내합니다. 제안·작성은 로그인 뒤 사이드바 안의
 * 파트너 모집 화면이 맡습니다.
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
    loginPrompt,
    openLoginPrompt,
    closeLoginPrompt,
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
                <RecruitmentCard key={recruitment.id} recruitment={recruitment} onOpenLoginPrompt={openLoginPrompt} />
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

      <PublicLoginPromptDialog
        isOpen={loginPrompt !== null}
        loginPath={loginPrompt?.loginPath ?? ''}
        onClose={closeLoginPrompt}
      />
    </main>
  )
}
