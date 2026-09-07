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
  const [rememberMe, setRememberMe] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    navigate('/chat')
  }

  return {
    email,
    password,
    rememberMe,
    updateEmail: setEmail,
    updatePassword: setPassword,
    toggleRememberMe: () => setRememberMe(!rememberMe),
    submit,
  }
}
