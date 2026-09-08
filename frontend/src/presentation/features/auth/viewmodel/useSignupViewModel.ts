import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { appContainer } from '../../../../app/appContainer'
import { useAppDispatch } from '../../../../app/hooks'
import { isValidSignUpPassword, type SignUpUseCase, signUpPasswordLength } from '../../../../domain/usecases/SignUpUseCase'
import { signedIn } from '../../../shared/auth/state/authSlice'
import { appPaths } from '../../../shared/routes/appPaths'

type AccountSignUpUseCase = Pick<SignUpUseCase, 'execute'>

export const signupMessages = {
  emailRequired: '이메일 형식으로 입력해 주세요.',
  passwordLength: `비밀번호는 ${signUpPasswordLength.min}자 이상 ${signUpPasswordLength.max}자 이하로 입력해 주세요.`,
  passwordMismatch: '비밀번호 확인이 일치하지 않습니다.',
  emailTaken: '이미 가입된 이메일입니다. 로그인하거나 다른 이메일을 사용해 주세요.',
  rateLimited: (retryAfterSeconds: number | null) =>
    retryAfterSeconds === null
      ? '가입 시도가 많아 잠시 막혔습니다. 잠시 후 다시 시도해 주세요.'
      : `가입 시도가 많아 잠시 막혔습니다. ${retryAfterSeconds}초 뒤에 다시 시도해 주세요.`,
  requestFailed: '가입 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
} as const

type SignupError = { field: 'email' | 'password' | 'passwordConfirmation' | null; message: string }

/**
 * 회원가입 화면의 대표 ViewModel입니다. 이메일과 비밀번호만 받고 기업 정보는 가입 뒤 프로필이 맡습니다.
 * 가입에 성공하면 서버가 세션 쿠키를 발급하므로 계정을 Store에 올리고 바로 작업 채팅으로 이동합니다.
 */
export function useSignupViewModel(
  signUpUseCase: AccountSignUpUseCase = appContainer.resolve('signUpUseCase'),
) {
  const dispatchToStore = useAppDispatch()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<SignupError | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    const elements = event.currentTarget.elements
    const emailInput = elements.namedItem('email') as HTMLInputElement
    if (!email.trim() || emailInput.validity.typeMismatch) {
      setError({ field: 'email', message: signupMessages.emailRequired })
      emailInput.focus()
      return
    }
    if (!isValidSignUpPassword(password)) {
      setError({ field: 'password', message: signupMessages.passwordLength })
      ;(elements.namedItem('password') as HTMLInputElement).focus()
      return
    }
    if (password !== passwordConfirmation) {
      setError({ field: 'passwordConfirmation', message: signupMessages.passwordMismatch })
      ;(elements.namedItem('passwordConfirmation') as HTMLInputElement).focus()
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const result = await signUpUseCase.execute({ email, password })
      if (!isMounted.current) return
      if (result.outcome === 'email-taken') {
        setError({ field: 'email', message: signupMessages.emailTaken })
        return
      }
      if (result.outcome === 'rate-limited') {
        setError({ field: null, message: signupMessages.rateLimited(result.retryAfterSeconds) })
        return
      }
      dispatchToStore(signedIn(result.session.account))
      navigate(appPaths.chat, { replace: true })
    } catch {
      if (!isMounted.current) return
      setError({ field: null, message: signupMessages.requestFailed })
    } finally {
      if (isMounted.current) setIsSubmitting(false)
    }
  }

  return {
    email,
    password,
    passwordConfirmation,
    error,
    isSubmitting,
    updateEmail: (value: string) => { setEmail(value); setError(null) },
    updatePassword: (value: string) => { setPassword(value); setError(null) },
    updatePasswordConfirmation: (value: string) => { setPasswordConfirmation(value); setError(null) },
    submit,
  }
}
