import { Link } from 'react-router'

import { workspacePageStyles, workspaceTagClassName } from '../../../shared/workspace/WorkspacePage.styles'
import { publicPaths } from '../../../shared/routes/appPaths'
import { usePublicPartnerRecruitmentDetailViewModel } from '../viewmodel/usePublicPartnerRecruitmentDetailViewModel'
import { publicPartnerRecruitmentStyles as styles } from './PublicPartnerRecruitment.styles'

/**
 * 로그인 전 공개 모집글 상세입니다. 공고 원문과 모집 조건은 그대로 보여 주지만 프로필 매칭과 참여 제안 폼은
 * 두지 않고, 로그인하면 같은 모집글의 내부 상세로 돌아오도록 안내합니다.
 */
export function PublicPartnerRecruitmentDetailPage() {
  const { recruitment, loginPath, signupPath, proposalFlowSteps } = usePublicPartnerRecruitmentDetailViewModel()

  if (!recruitment) {
    return (
      <main className={styles.page}>
        <Link className={styles.backLink} to={publicPaths.partners}>← 파트너 모집 목록</Link>
        <h1 className={styles.detailTitle}>준비되지 않은 모집글 상세입니다</h1>
        <p className={styles.description}>요청한 모집글의 상세 예시가 없습니다. 다른 모집글로 대신 표시하지 않습니다.</p>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <Link className={styles.backLink} to={publicPaths.partners}>← 파트너 모집 목록</Link>
        <div className={styles.tagRow}>
          <span className={workspaceTagClassName('ok')}>기업마당 공고</span>
          <span className={workspaceTagClassName('muted')}>{recruitment.recruitmentStatusLabel}</span>
          <span className={styles.cardDeadline}>{recruitment.recruitmentDeadline} · {recruitment.recruitmentDeadlineDate}</span>
        </div>
        <h1 className={styles.detailTitle}>{recruitment.title}</h1>
      </div>

      <div className={styles.columns}>
        <div className={styles.column}>
          <section className={styles.card} aria-label="모집 조건">
            <div className={styles.authorRow}>
              <span className={styles.authorAvatar} aria-hidden="true">{recruitment.company.initial}</span>
              <span className="min-w-0">
                <span className={styles.authorName}>{recruitment.company.name}</span>
                <span className={styles.authorSummary}>{recruitment.companyDetailSummary}</span>
              </span>
              <span className={`ml-auto ${workspaceTagClassName(recruitment.company.isEmailVerified ? 'ok' : 'muted')}`}>
                {recruitment.company.isEmailVerified ? '이메일 인증' : '인증 전'}
              </span>
            </div>
            <div className={styles.conditionGrid}>
              {recruitment.conditions.map((condition) => (
                <div className={styles.conditionCell} key={condition.label}>
                  <span className={styles.conditionLabel}>{condition.label}</span>
                  <span className={styles.conditionValue}>{condition.value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.card} aria-label="연결된 공고">
            <p className={workspacePageStyles.sectionEyebrow}>연결된 공고</p>
            <div className={styles.cardTop}>
              <span className={workspaceTagClassName('ok')}>{recruitment.programStatusLabel}</span>
              <span className={styles.cardDeadline}>{recruitment.programDeadline} · {recruitment.programDeadlineBadge}</span>
            </div>
            <div className="flex flex-col gap-[0.15rem]">
              <strong className={workspacePageStyles.cardTitle}>{recruitment.programTitle}</strong>
              <span className={styles.cardProgram}>{recruitment.programOrganization}</span>
            </div>
            <p className={styles.bodyParagraph}>{recruitment.programSummary}</p>
            <div className={styles.rawBox}>
              <span><strong className={styles.rawBoxLabel}>신청기간 원문</strong> · {recruitment.programApplicationPeriodRaw}</span>
              <span><strong className={styles.rawBoxLabel}>지원대상 원문</strong> · {recruitment.programTargetRaw}</span>
            </div>
            <a className={workspacePageStyles.quietLink} href={recruitment.programSourceUrl} rel="noreferrer" target="_blank">
              공식 원문 보기
            </a>
          </section>

          <section className={styles.card} aria-label="모집 소개">
            <h2 className={workspacePageStyles.cardTitle}>모집 소개</h2>
            {recruitment.introductionParagraphs.map((paragraph, index) => (
              <p className={styles.bodyParagraph} key={index}>{paragraph}</p>
            ))}
            <div className="flex flex-col gap-2">
              <span className={styles.conditionLabel}>함께 준비할 일</span>
              {recruitment.preparationItems.map((item) => (
                <span className={styles.preparationItem} key={item}>
                  <span className={styles.preparationDot} aria-hidden="true" />
                  {item}
                </span>
              ))}
            </div>
            <p className={styles.disclaimer}>
              모집글의 내용은 작성 기업이 직접 입력한 것이며 GovBiz가 검증하지 않습니다. 공고 요건은 위 공식 원문에서 확인하세요.
            </p>
          </section>
        </div>

        <aside className={styles.column} aria-label="참여 제안 안내">
          <section className={styles.ctaCard} aria-labelledby="public-partner-proposal-title">
            <h2 className={styles.ctaTitle} id="public-partner-proposal-title">제안하려면 로그인이 필요합니다</h2>
            <ul className={styles.ctaList}>
              <li>로그인하면 이 모집글로 바로 돌아와 참여 제안을 보낼 수 있습니다.</li>
              <li>기업 프로필을 등록하면 모집 조건과의 일치 항목을 함께 확인합니다.</li>
            </ul>
            <div className={styles.ctaButtons}>
              <Link className={workspacePageStyles.primaryButton} to={loginPath}>로그인하고 제안하기</Link>
              <Link className={workspacePageStyles.secondaryButton} to={signupPath}>기업 계정 만들기</Link>
            </div>
            <p className={styles.ctaNote}>담당자 이름과 연락처는 제안이 수락된 뒤에만 서로에게 공개됩니다.</p>
          </section>

          <section className={styles.noticeCard} aria-label="제안 상태 흐름">
            <p className={workspacePageStyles.sectionEyebrow}>제안 상태 흐름</p>
            <div className={styles.flowRow}>
              {proposalFlowSteps.map((step, index) => (
                <span className="flex items-center gap-[0.35rem]" key={step}>
                  {index > 0 ? <span aria-hidden="true">›</span> : null}
                  <span className={styles.flowStep}>{step}</span>
                </span>
              ))}
            </div>
            <p className={styles.noticeText}>거절되거나 7일간 응답이 없으면 제안은 자동 종료됩니다.</p>
          </section>
        </aside>
      </div>
    </main>
  )
}
