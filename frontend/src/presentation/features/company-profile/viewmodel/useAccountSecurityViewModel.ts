import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { appContainer } from '../../../../app/appContainer'
import { useAppDispatch } from '../../../../app/hooks'
import type { AccountDeletionPreview } from '../../../../domain/entities/AccountDeletionPreview'
import type {
  ChangePasswordUseCase,
  DeleteAccountUseCase,
  GetAccountDeletionPreviewUseCase,
} from '../../../../domain/usecases/AccountProfileUseCases'
import { isValidSignUpPassword, signUpPasswordLength } from '../../../../domain/usecases/SignUpUseCase'
import { signedOut } from '../../../shared/auth/state/authSlice'
import { publicPaths } from '../../../shared/routes/appPaths'

export const accountSecurityMessages = {
  currentPasswordRequired: '현재 비밀번호를 입력해 주세요.',
  newPasswordLength: `${signUpPasswordLength.min}자 이상 ${signUpPasswordLength.max}자 이하로 입력합니다.`,
  newPasswordInvalid: `새 비밀번호는 ${signUpPasswordLength.min}자 이상 ${signUpPasswordLength.max}자 이하여야 합니다.`,
  newPasswordSame: '현재 비밀번호와 다른 비밀번호를 입력해 주세요.',
  confirmationMismatch: '새 비밀번호와 다릅니다.',
  currentPasswordMismatch: '현재 비밀번호가 맞지 않습니다.',
  rateLimited: (retryAfterSeconds: number | null) =>
    retryAfterSeconds === null ? '시도가 많아 잠시 막혔습니다. 잠시 후 다시 시도해 주세요.' : `시도가 많아 잠시 막혔습니다. ${retryAfterSeconds}초 뒤에 다시 시도해 주세요.`,
  requestFailed: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  passwordChanged: '비밀번호를 변경했습니다. 다른 기기의 로그인은 모두 끝났습니다.',
  deletePasswordRequired: '확인을 위해 현재 비밀번호를 입력해 주세요.',
} as const

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmation'
type PasswordFormErrors = Partial<Record<PasswordField | 'form', string>>

type DeletionPreviewState =
  | { status: 'loading' }
  | { status: 'ready'; preview: AccountDeletionPreview }
  | { status: 'failed' }

type SecurityUseCases = {
  changePassword: Pick<ChangePasswordUseCase, 'execute'>
  getDeletionPreview: Pick<GetAccountDeletionPreviewUseCase, 'execute'>
  deleteAccount: Pick<DeleteAccountUseCase, 'execute'>
}

/** 길이만 보는 비밀번호 정책에 맞춰 8·12·16자 기준으로 막대를 채웁니다. 문자 종류는 보지 않습니다. */
export function passwordStrengthPercent(password: string): number {
  if (password.length >= 16) return 100
  if (password.length >= 12) return 66
  if (password.length >= signUpPasswordLength.min) return 33
  return 0
}

/**
 * 프로필 계정 카드의 비밀번호 변경 모달과 계정 삭제 모달 ViewModel입니다. 두 모달의 열림·입력·확인·결과 안내를 소유하고,
 * 삭제에 성공하면 Store를 비운 뒤 랜딩으로 보냅니다. 기업 정보 폼과는 다른 관심사라 ViewModel을 나눕니다.
 */
export function useAccountSecurityViewModel(useCases: Partial<SecurityUseCases> = {}) {
  const resolved: SecurityUseCases = {
    changePassword: useCases.changePassword ?? appContainer.resolve('changePasswordUseCase'),
    getDeletionPreview: useCases.getDeletionPreview ?? appContainer.resolve('getAccountDeletionPreviewUseCase'),
    deleteAccount: useCases.deleteAccount ?? appContainer.resolve('deleteAccountUseCase'),
  }
  const dispatchToStore = useAppDispatch()
  const navigate = useNavigate()
  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmation: '' })
  const [passwordErrors, setPasswordErrors] = useState<PasswordFormErrors>({})
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null)

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletionPreview, setDeletionPreview] = useState<DeletionPreviewState>({ status: 'loading' })
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!isDeleteModalOpen) return
    const controller = new AbortController()
    setDeletionPreview({ status: 'loading' })
    void Promise.resolve()
      .then(() => resolved.getDeletionPreview.execute(controller.signal))
      .then((preview) => { if (!controller.signal.aborted) setDeletionPreview({ status: 'ready', preview }) })
      .catch(() => { if (!controller.signal.aborted) setDeletionPreview({ status: 'failed' }) })
    return () => controller.abort()
    // 모달을 열 때 한 번만 읽습니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDeleteModalOpen])

  function openPasswordModal() {
    setPasswordForm({ currentPassword: '', newPassword: '', confirmation: '' })
    setPasswordErrors({})
    setPasswordNotice(null)
    setIsPasswordModalOpen(true)
  }

  function closePasswordModal() {
    if (isChangingPassword) return
    setIsPasswordModalOpen(false)
  }

  function updatePasswordField(field: PasswordField, value: string) {
    setPasswordForm((current) => ({ ...current, [field]: value }))
    setPasswordErrors((current) => {
      const { [field]: _removed, form: _form, ...rest } = current
      return rest
    })
  }

  const canSubmitPassword =
    passwordForm.currentPassword !== '' &&
    isValidSignUpPassword(passwordForm.newPassword) &&
    passwordForm.newPassword === passwordForm.confirmation &&
    !isChangingPassword

  async function submitPasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isChangingPassword) return
    const errors: PasswordFormErrors = {}
    if (passwordForm.currentPassword === '') errors.currentPassword = accountSecurityMessages.currentPasswordRequired
    if (!isValidSignUpPassword(passwordForm.newPassword)) errors.newPassword = accountSecurityMessages.newPasswordInvalid
    else if (passwordForm.newPassword === passwordForm.currentPassword) errors.newPassword = accountSecurityMessages.newPasswordSame
    if (passwordForm.confirmation !== passwordForm.newPassword) errors.confirmation = accountSecurityMessages.confirmationMismatch
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      return
    }

    setIsChangingPassword(true)
    try {
      const result = await resolved.changePassword.execute(passwordForm.currentPassword, passwordForm.newPassword)
      if (!isMounted.current) return
      if (result.outcome === 'current-password-mismatch') {
        setPasswordErrors({ currentPassword: accountSecurityMessages.currentPasswordMismatch })
        return
      }
      if (result.outcome === 'rate-limited') {
        setPasswordErrors({ form: accountSecurityMessages.rateLimited(result.retryAfterSeconds) })
        return
      }
      setIsPasswordModalOpen(false)
      setPasswordNotice(accountSecurityMessages.passwordChanged)
    } catch {
      if (isMounted.current) setPasswordErrors({ form: accountSecurityMessages.requestFailed })
    } finally {
      if (isMounted.current) setIsChangingPassword(false)
    }
  }

  function openDeleteModal() {
    setDeletePassword('')
    setDeleteError(null)
    setIsDeleteModalOpen(true)
  }

  function closeDeleteModal() {
    if (isDeleting) return
    setIsDeleteModalOpen(false)
  }

  async function submitDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDeleting) return
    if (deletePassword === '') {
      setDeleteError(accountSecurityMessages.deletePasswordRequired)
      return
    }
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const result = await resolved.deleteAccount.execute(deletePassword)
      if (!isMounted.current) return
      if (result.outcome === 'current-password-mismatch') {
        setDeleteError(accountSecurityMessages.currentPasswordMismatch)
        return
      }
      if (result.outcome === 'rate-limited') {
        setDeleteError(accountSecurityMessages.rateLimited(result.retryAfterSeconds))
        return
      }
      setIsDeleteModalOpen(false)
      dispatchToStore(signedOut())
      // RequireAuth가 로그인 화면으로 먼저 보내는 것을 피하려고 Store 갱신이 반영된 뒤 랜딩으로 이동합니다.
      window.setTimeout(() => navigate(publicPaths.landing, { replace: true }), 0)
    } catch {
      if (isMounted.current) setDeleteError(accountSecurityMessages.requestFailed)
    } finally {
      if (isMounted.current) setIsDeleting(false)
    }
  }

  return {
    password: {
      isOpen: isPasswordModalOpen,
      open: openPasswordModal,
      close: closePasswordModal,
      form: passwordForm,
      update: updatePasswordField,
      errors: passwordErrors,
      strengthPercent: passwordStrengthPercent(passwordForm.newPassword),
      lengthHint: accountSecurityMessages.newPasswordLength,
      canSubmit: canSubmitPassword,
      isSubmitting: isChangingPassword,
      submit: submitPasswordChange,
      notice: passwordNotice,
      dismissNotice: () => setPasswordNotice(null),
    },
    deletion: {
      isOpen: isDeleteModalOpen,
      open: openDeleteModal,
      close: closeDeleteModal,
      preview: deletionPreview,
      password: deletePassword,
      updatePassword: (value: string) => { setDeletePassword(value); setDeleteError(null) },
      error: deleteError,
      canSubmit: deletePassword !== '' && !isDeleting,
      isSubmitting: isDeleting,
      submit: submitDeletion,
    },
  }
}
