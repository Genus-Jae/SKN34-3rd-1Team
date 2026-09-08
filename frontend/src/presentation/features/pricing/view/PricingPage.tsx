import { Link } from 'react-router'

import { pricingPageStyles } from './PricingPage.styles'

// 현재 제공 기능과 출시 준비 방향을 구분합니다. 유료 가격·결제 정책은 아직 확정하지 않습니다.
const plans = [
  {
    id: 'free',
    label: 'FREE',
    name: '무료',
    status: '지금 이용 가능',
    description: '우리 기업에 맞는 지원사업을 찾고, 공고의 조건부터 확인하고 싶다면.',
    price: '0원',
    priceNote: '현재 공개 검색 이용 요금',
    featureHeading: '지금 제공하는 기능',
    features: ['지원사업 검색', '입력한 기업 조건으로 자격 조건 확인', '기업마당 공고 원문 질문과 답변'],
    footerNote: '현재 공개 검색은 로그인 없이 이용할 수 있습니다.',
    isAvailable: true,
    isFeatured: false,
  },
  {
    id: 'pro',
    label: 'PRO',
    name: '프로',
    status: '출시 예정',
    description: '관심 공고와 기업 정보를 모아, 지원사업 검토를 이어가고 싶다면.',
    price: '가격 공개 예정',
    priceNote: '유료 요금제 · 출시 준비 중',
    featureHeading: '출시 준비 방향',
    features: ['관심 공고 관리', '기업 프로필을 활용한 탐색', '검토한 공고의 이력 관리'],
    footerNote: '가격과 제공 범위는 출시 시 안내합니다.',
    isAvailable: false,
    isFeatured: true,
  },
  {
    id: 'team',
    label: 'TEAM',
    name: '팀',
    status: '출시 예정',
    description: '함께할 기업을 살펴보고, 지원사업을 중심으로 협업을 준비하고 싶다면.',
    price: '가격 공개 예정',
    priceNote: '유료 요금제 · 출시 준비 중',
    featureHeading: '출시 준비 방향',
    features: ['기업 프로필 기반 파트너 탐색', '공고별 파트너 모집', '협업을 위한 기업 간 제안'],
    footerNote: '가격과 제공 범위는 출시 시 안내합니다.',
    isAvailable: false,
    isFeatured: false,
  },
] as const

const searchSteps = [
  {
    number: '01',
    title: '필요한 지원사업 찾기',
    description: '지역, 업종, 지원 목적을 자연스럽게 입력하고 관련 공고를 찾아보세요.',
  },
  {
    number: '02',
    title: '기업 조건과 비교하기',
    description: '입력한 조건을 바탕으로 공고의 자격 조건과 추가 확인이 필요한 부분을 살펴보세요.',
  },
  {
    number: '03',
    title: '원문을 근거로 질문하기',
    description: '기업마당 공고 상세에서 궁금한 내용을 질문하고, 답변의 근거를 원문과 함께 확인하세요.',
  },
] as const

const frequentlyAskedQuestions = [
  {
    question: '무료 요금제에서는 무엇을 할 수 있나요?',
    answer: '지원사업 검색, 입력한 기업 조건을 바탕으로 한 조건 확인, 기업마당 공고 상세에서의 원문 근거 질문을 이용할 수 있습니다. 현재 공개 검색은 로그인 없이 시작할 수 있습니다.',
  },
  {
    question: '프로와 팀은 지금 신청할 수 있나요?',
    answer: '아직 출시 준비 중입니다. 가격, 제공 기능과 이용 정책은 출시 시 안내하며, 현재는 결제나 구독 신청을 받지 않습니다. 카드에 표시한 예정 기능은 개발 방향으로, 최종 제공 범위와 달라질 수 있습니다.',
  },
  {
    question: '로그인·기업 프로필·파트너 모집은 실제로 이용할 수 있나요?',
    answer: '현재 데모 화면으로 제공됩니다. 실제 계정 인증과 기업 정보 저장, 파트너 모집글 등록 및 제안 전송은 연결되지 않았습니다. 데모 화면은 정식 요금제의 제공 기능이 아닙니다.',
  },
  {
    question: 'AI가 지원 자격이나 선정을 보장하나요?',
    answer: '아니요. AI의 조건 확인과 답변은 공고를 살펴보기 위한 참고 정보입니다. 지원 자격, 접수 상태와 신청 방법은 공고 원문 및 담당 기관에서 최종 확인해야 합니다.',
  },
] as const

/** 결제 기능 없이 현재 공개 기능과 출시 예정 요금제를 안내하는 공개 페이지입니다. */
export function PricingPage() {
  return (
    <main className={pricingPageStyles.page}>
      <section className={pricingPageStyles.hero} aria-labelledby="pricing-title">
        <p className={pricingPageStyles.badge}>
          <span className={pricingPageStyles.badgeDot} aria-hidden="true" />
          GovBiz 요금제
        </p>
        <h1 className={pricingPageStyles.title} id="pricing-title">
          기업의 다음 단계에 맞는 요금제
        </h1>
        <p className={pricingPageStyles.description}>
          지원사업 탐색은 지금 무료로 시작하세요.
          <br />
          공고 관리와 파트너 협업은 다음 단계로 준비하고 있습니다.
        </p>
      </section>

      <section className={pricingPageStyles.plansSection} aria-labelledby="pricing-plans-title">
        <h2 className={pricingPageStyles.plansHeading} id="pricing-plans-title">
          지금 시작하고, 필요한 만큼 확장하세요
        </h2>
        <div className={pricingPageStyles.plansGrid}>
          {plans.map((plan) => {
            const cardTone = plan.isFeatured
              ? pricingPageStyles.featuredCard
              : pricingPageStyles.regularCard
            const mutedTone = plan.isFeatured
              ? pricingPageStyles.featuredMuted
              : pricingPageStyles.regularMuted
            const iconTone = plan.isFeatured
              ? pricingPageStyles.featuredIcon
              : pricingPageStyles.regularIcon

            return (
              <article
                className={`${pricingPageStyles.planCard} ${cardTone}`}
                aria-labelledby={`pricing-${plan.id}-title`}
                key={plan.id}
              >
                <div className={pricingPageStyles.planTop}>
                  <p className={`${pricingPageStyles.planEyebrow} ${mutedTone}`}>{plan.label}</p>
                  <span className={`${pricingPageStyles.planStatus} ${plan.isFeatured
                    ? pricingPageStyles.featuredStatus
                    : pricingPageStyles.regularStatus}`}
                  >
                    {plan.status}
                  </span>
                </div>
                <h3 className={pricingPageStyles.planTitle} id={`pricing-${plan.id}-title`}>
                  {plan.name}
                </h3>
                <p className={`${pricingPageStyles.planDescription} ${mutedTone}`}>
                  {plan.description}
                </p>
                <div className={pricingPageStyles.priceBlock}>
                  <p className={plan.isAvailable ? pricingPageStyles.freePrice : pricingPageStyles.pendingPrice}>
                    {plan.price}
                  </p>
                  <p className={`${pricingPageStyles.priceNote} ${mutedTone}`}>{plan.priceNote}</p>
                </div>
                <div className={`${pricingPageStyles.divider} ${plan.isFeatured
                  ? pricingPageStyles.featuredDivider
                  : pricingPageStyles.regularDivider}`}
                  aria-hidden="true"
                />
                <p className={pricingPageStyles.featureHeading}>{plan.featureHeading}</p>
                <ul className={pricingPageStyles.featureList}>
                  {plan.features.map((feature) => (
                    <li className={pricingPageStyles.featureItem} key={feature}>
                      <svg
                        className={`${pricingPageStyles.featureIcon} ${iconTone}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path d={plan.isAvailable ? 'm5 12 4 4L19 6' : 'M12 5v14M5 12h14'} />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className={pricingPageStyles.planFooter}>
                  {plan.isAvailable ? (
                    <Link className={`${pricingPageStyles.planButton} ${pricingPageStyles.availableButton}`} to="/">
                      무료로 지원사업 찾기
                    </Link>
                  ) : (
                    <button
                      className={`${pricingPageStyles.planButton} ${plan.isFeatured
                        ? pricingPageStyles.featuredPendingButton
                        : pricingPageStyles.regularPendingButton}`}
                      type="button"
                      disabled
                    >
                      출시 준비 중
                    </button>
                  )}
                  <p className={`${pricingPageStyles.footerNote} ${mutedTone}`}>{plan.footerNote}</p>
                </div>
              </article>
            )
          })}
        </div>
        <p className={pricingPageStyles.releaseNote}>
          프로·팀은 출시 예정이며, 표시된 기능은 개발 방향입니다. 현재 결제·구독은 제공하지 않습니다.
        </p>
      </section>

      <section className={pricingPageStyles.valueSection} aria-labelledby="pricing-value-title">
        <div>
          <p className={pricingPageStyles.sectionEyebrow}>현재 무료로 이용할 수 있어요</p>
          <h2 className={pricingPageStyles.sectionHeading} id="pricing-value-title">
            찾고, 확인하고, 질문하세요
          </h2>
        </div>
        <div className={pricingPageStyles.valueGrid}>
          {searchSteps.map((step) => (
            <div className={pricingPageStyles.valueItem} key={step.number}>
              <span className={pricingPageStyles.valueNumber} aria-hidden="true">{step.number}</span>
              <h3 className={pricingPageStyles.valueTitle}>{step.title}</h3>
              <p className={pricingPageStyles.valueDescription}>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={pricingPageStyles.faqSection} aria-labelledby="pricing-faq-title">
        <div className={pricingPageStyles.faqHeader}>
          <h2 className={pricingPageStyles.sectionHeading} id="pricing-faq-title">자주 묻는 질문</h2>
          <p className={pricingPageStyles.faqDescription}>이용 전에 궁금한 점을 확인하세요.</p>
        </div>
        <div className={pricingPageStyles.faqList}>
          {frequentlyAskedQuestions.map((faq) => (
            <details className={pricingPageStyles.faqItem} key={faq.question}>
              <summary className={pricingPageStyles.faqQuestion}>
                <span className={pricingPageStyles.faqQuestionText}>{faq.question}</span>
                <svg
                  className={pricingPageStyles.faqIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </summary>
              <p className={pricingPageStyles.faqAnswer}>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={pricingPageStyles.closingSection} aria-labelledby="pricing-start-title">
        <h2 className={pricingPageStyles.sectionHeading} id="pricing-start-title">
          다음 기회가 될 공고를 만나보세요
        </h2>
        <p className={pricingPageStyles.closingDescription}>
          우리 기업의 지역, 업종, 지원 목적부터 이야기해 주세요.
          <br />
          지금 제공하는 검색 기능으로 탐색을 시작할 수 있습니다.
        </p>
        <Link className={pricingPageStyles.closingButton} to="/">
          지원사업 찾기 시작하기
          <svg
            className={pricingPageStyles.arrowIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </Link>
      </section>
    </main>
  )
}
