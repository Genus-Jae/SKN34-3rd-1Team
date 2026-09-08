import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router'

/**
 * 회원가입 화면의 대표 ViewModel입니다. 이메일과 비밀번호만 받고 기업 정보는 가입 뒤 프로필이 맡습니다.
 * 계정 생성 API는 아직 없으므로 지금은 제출 뒤 작업 화면으로만 이동합니다.
 */
export function useSignupViewModel() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<{ field: 'email' | 'password' | 'passwordConfirmation'; message: string } | null>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const emailInput = event.currentTarget.elements.namedItem('email') as HTMLInputElement
    if (!email.trim() || emailInput.validity.typeMismatch) {
      setError({ field: 'email', message: '확인용 이메일 형식으로 입력해 주세요.' })
      emailInput.focus()
      return
    }
    if (password.length < 8 || !/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
      setError({ field: 'password', message: '비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.' })
      const passwordInput = event.currentTarget.elements.namedItem('password') as HTMLInputElement
      passwordInput.focus()
      return
    }
    if (password !== passwordConfirmation) {
      setError({ field: 'passwordConfirmation', message: '비밀번호 확인이 일치하지 않습니다.' })
      const confirmationInput = event.currentTarget.elements.namedItem('passwordConfirmation') as HTMLInputElement
      confirmationInput.focus()
      return
    }
    navigate('/chat')
  }

  return {
    email,
    password,
    passwordConfirmation,
    error,
    updateEmail: (value: string) => { setEmail(value); setError(null) },
    updatePassword: (value: string) => { setPassword(value); setError(null) },
    updatePasswordConfirmation: (value: string) => { setPasswordConfirmation(value); setError(null) },
    submit,
  }
}
