import { Link } from 'react-router'

import { useLoginViewModel } from '../viewmodel/useLoginViewModel'
import { AuthBrandPanel } from './AuthBrandPanel'
import { authPageStyles } from './AuthPage.styles'

/** 로그인 화면입니다. 공용 헤더의 로그인 버튼이 이 화면으로 옵니다. */
export function LoginPage() {
  const { email, password, error, updateEmail, updatePassword, submit } =
    useLoginViewModel()

  return (
    <main className={authPageStyles.page}>
      <AuthBrandPanel />

      <section className={authPageStyles.formPanel}>
        <form className={authPageStyles.card} onSubmit={submit} aria-label="로그인" noValidate>
          <div className={authPageStyles.cardHeader}>
            <p className={authPageStyles.cardEyebrow}>로그인</p>
            <h1 className={authPageStyles.cardTitle}>다시 오셨군요</h1>
            <p className={authPageStyles.cardDescription}>
              로그인 화면 데모입니다. 계정 인증 없이 작업 화면을 둘러볼 수 있습니다.
            </p>
            <p className={authPageStyles.fieldHint}>입력값은 전송·저장되지 않습니다. 실제 비밀번호를 입력하지 마세요.</p>
          </div>

          <div className={authPageStyles.fields}>
            <label className={authPageStyles.field}>
              <span>이메일</span>
              <input
                className={authPageStyles.fieldControl}
                type="email"
                name="email"
                autoComplete="off"
                required
                aria-invalid={error?.field === 'email'}
                aria-describedby={error?.field === 'email' ? 'login-error' : undefined}
                placeholder="manager@company.co.kr"
                value={email}
                onChange={(event) => updateEmail(event.target.value)}
              />
            </label>

            <label className={authPageStyles.field}>
              <span>비밀번호</span>
              <input
                className={authPageStyles.fieldControl}
                type="password"
                name="password"
                autoComplete="off"
                required
                aria-invalid={error?.field === 'password'}
                aria-describedby={error?.field === 'password' ? 'login-error' : undefined}
                placeholder="비밀번호 입력"
                value={password}
                onChange={(event) => updatePassword(event.target.value)}
              />
            </label>

            <div className={authPageStyles.optionsRow}>
              <label className={authPageStyles.checkboxLabel}>
                <input
                  className={authPageStyles.checkbox}
                  type="checkbox"
                  name="rememberMe"
                  disabled
                />
                로그인 상태 유지 · 준비 중
              </label>
              {/* 비밀번호 재설정 화면은 아직 없으므로 링크로 만들지 않습니다. */}
              <span className={authPageStyles.helperPending} aria-disabled="true">
                비밀번호 재설정 · 준비 중
              </span>
            </div>
          </div>

          {error ? <p id="login-error" className={authPageStyles.fieldError} role="alert">{error.message}</p> : null}
          <button className={authPageStyles.submitButton} type="submit">
            입력 확인 후 데모 보기
          </button>

          <div className={authPageStyles.divider}>
            <span className={authPageStyles.dividerLine} aria-hidden="true" />
            <span className={authPageStyles.dividerText}>아직 계정이 없나요?</span>
            <span className={authPageStyles.dividerLine} aria-hidden="true" />
          </div>

          <Link className={authPageStyles.secondaryButton} to="/signup">
            기업 계정 만들기
          </Link>

          <p className={authPageStyles.cardFooter}>
            <Link to="/">로그인 없이 지원사업 검색</Link>
          </p>
        </form>
      </section>
    </main>
  )
}
