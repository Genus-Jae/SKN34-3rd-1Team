import { Link } from 'react-router'

import { useSignupViewModel } from '../viewmodel/useSignupViewModel'
import { AuthBrandPanel } from './AuthBrandPanel'
import { authPageStyles } from './AuthPage.styles'

/**
 * 회원가입 화면입니다. 로그인 화면과 같은 껍데기를 쓰고 이메일과 비밀번호만 받습니다.
 * 기업 정보와 약관 동의는 가입 뒤 프로필 단계에서 받습니다.
 */
export function SignupPage() {
  const {
    email,
    password,
    passwordConfirmation,
    error,
    updateEmail,
    updatePassword,
    updatePasswordConfirmation,
    submit,
  } = useSignupViewModel()

  return (
    <main className={authPageStyles.page}>
      <AuthBrandPanel />

      <section className={authPageStyles.formPanel}>
        <form className={authPageStyles.card} onSubmit={submit} aria-label="회원가입" noValidate>
          <div className={authPageStyles.cardHeader}>
            <p className={authPageStyles.cardEyebrow}>회원가입</p>
            <h1 className={authPageStyles.cardTitle}>기업 계정 만들기</h1>
            <p className={authPageStyles.cardDescription}>
              회원가입 화면 데모입니다. 입력을 확인해도 실제 계정은 생성되지 않습니다.
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
                aria-describedby={error?.field === 'email' ? 'signup-error' : undefined}
                placeholder="manager@company.co.kr"
                value={email}
                onChange={(event) => updateEmail(event.target.value)}
              />
            </label>

            <div className={authPageStyles.field}>
              <label htmlFor="signup-password">비밀번호</label>
              <input
                className={authPageStyles.fieldControl}
                id="signup-password"
                type="password"
                name="password"
                autoComplete="off"
                required
                minLength={8}
                aria-invalid={error?.field === 'password'}
                aria-describedby={error?.field === 'password' ? 'signup-password-hint signup-error' : 'signup-password-hint'}
                placeholder="비밀번호 입력"
                value={password}
                onChange={(event) => updatePassword(event.target.value)}
              />
              <span id="signup-password-hint" className={authPageStyles.fieldHint}>8자 이상, 영문과 숫자를 포함합니다.</span>
            </div>

            <label className={authPageStyles.field}>
              <span>비밀번호 확인</span>
              <input
                className={authPageStyles.fieldControl}
                type="password"
                name="passwordConfirmation"
                autoComplete="off"
                required
                aria-invalid={error?.field === 'passwordConfirmation'}
                aria-describedby={error?.field === 'passwordConfirmation' ? 'signup-error' : undefined}
                placeholder="비밀번호 다시 입력"
                value={passwordConfirmation}
                onChange={(event) => updatePasswordConfirmation(event.target.value)}
              />
            </label>
          </div>

          {error ? <p id="signup-error" className={authPageStyles.fieldError} role="alert">{error.message}</p> : null}
          <button className={authPageStyles.submitButton} type="submit">
            가입 입력 확인 · 데모
          </button>

          <div className={authPageStyles.divider}>
            <span className={authPageStyles.dividerLine} aria-hidden="true" />
            <span className={authPageStyles.dividerText}>이미 계정이 있나요?</span>
            <span className={authPageStyles.dividerLine} aria-hidden="true" />
          </div>

          <Link className={authPageStyles.secondaryButton} to="/login">
            로그인
          </Link>

          <p className={authPageStyles.cardFooter}>
            <Link className={authPageStyles.helperLink} to="/">가입 없이 지원사업 검색</Link>
          </p>
        </form>
      </section>
    </main>
  )
}
