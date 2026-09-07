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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    navigate('/chat')
  }

  return {
    email,
    password,
    passwordConfirmation,
    updateEmail: setEmail,
    updatePassword: setPassword,
    updatePasswordConfirmation: setPasswordConfirmation,
    submit,
  }
}
