import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { authPageStyles } from './AuthPage.styles'

/** 계정이 있어야 쓸 수 있는 기능만 소개합니다. 지원사업 검색 자체는 로그인 없이 그대로 쓸 수 있습니다. */
const features: Array<{ title: string; description: string; icon: ReactNode }> = [
  {
    title: '관심 공고함',
    description: '마감 D-day와 공고 내용 변경을 다시 확인합니다.',
    icon: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  },
  {
    title: '기업 프로필',
    description: '지역·업종·업력을 한 번 입력하면 모든 검색에 맞춤 추천이 붙습니다.',
    icon: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
      </>
    ),
  },
  {
    title: '파트너 모집',
    description: '공고에 묶인 컨소시엄 모집글을 올리고 참여 제안을 주고받습니다.',
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
]

/** 로그인과 회원가입 화면이 함께 쓰는 왼쪽 소개 패널입니다. 좁은 화면에서는 숨깁니다. */
export function AuthBrandPanel() {
  return (
    <aside className={authPageStyles.brandPanel} aria-label="GovBiz 계정 소개">
      <Link className={authPageStyles.brand} to="/">
        <span className={authPageStyles.brandMark} aria-hidden="true">G</span>
        <span>
          <strong className={authPageStyles.brandTitle}>GovBiz</strong>
          <span className={authPageStyles.brandSubtitle}>지원사업 탐색 도우미</span>
        </span>
      </Link>

      <div className={authPageStyles.brandHeadline}>
        <p className={authPageStyles.brandEyebrow}>GovBiz 계정</p>
        <h2 className={authPageStyles.brandTagline}>
          계정 하나로 관심 공고 저장부터 파트너 모집까지
        </h2>
        <p className={authPageStyles.brandDescription}>
          지원사업 검색은 로그인 없이 그대로 쓸 수 있습니다. 계정은 저장하고, 알림을 받고,
          함께할 기업을 찾을 때만 필요합니다.
        </p>
      </div>

      <div className={authPageStyles.brandFeatures}>
        {features.map((feature) => (
          <div className={authPageStyles.brandFeature} key={feature.title}>
            <span className={authPageStyles.brandFeatureIcon}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {feature.icon}
              </svg>
            </span>
            <span>
              <strong className={authPageStyles.brandFeatureTitle}>{feature.title}</strong>
              <span className={authPageStyles.brandFeatureDescription}>{feature.description}</span>
            </span>
          </div>
        ))}
      </div>

      <p className={authPageStyles.brandFooter}>
        검색 결과는 기업마당 공식 공고와 원문 링크를 기반으로 합니다. 계정 정보는 추천 근거와
        파트너 매칭에만 사용합니다.
      </p>
    </aside>
  )
}
