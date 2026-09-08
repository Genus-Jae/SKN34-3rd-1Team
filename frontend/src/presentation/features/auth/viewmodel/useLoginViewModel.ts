import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router'

/**
 * 로그인 화면의 대표 ViewModel입니다. 입력 상태와 제출 뒤 이동을 소유합니다.
 * 세션 발급은 아직 없으므로 지금은 인증 없이 로그인 뒤 작업 화면으로만 이동합니다.
 */
export function useLoginViewModel() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<{ field: 'email' | 'password'; message: string } | null>(null)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const emailInput = event.currentTarget.elements.namedItem('email') as HTMLInputElement
    if (!email.trim() || emailInput.validity.typeMismatch) {
      setError({ field: 'email', message: '확인용 이메일 형식으로 입력해 주세요.' })
      emailInput.focus()
      return
    }
    if (!password.trim()) {
      setError({ field: 'password', message: '데모 확인용 비밀번호를 입력해 주세요.' })
      const passwordInput = event.currentTarget.elements.namedItem('password') as HTMLInputElement
      passwordInput.focus()
      return
    }
    navigate('/chat')
  }

  return {
    email,
    password,
    error,
    updateEmail: (value: string) => { setEmail(value); setError(null) },
    updatePassword: (value: string) => { setPassword(value); setError(null) },
    submit,
  }
}
