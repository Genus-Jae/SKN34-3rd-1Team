import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { appContainer } from '../../../../app/appContainer'
import type {
  ApplicationForm,
  ApplicationPreparation,
  ApplicationServiceField,
} from '../../../../domain/entities/ApplicationPreparation'
import { appPaths } from '../../../shared/routes/appPaths'

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error('신청 문서 정보를 처리하지 못했습니다.')
}

export function useApplicationPreparationEditorViewModel(id: number | null) {
  const useCase = appContainer.resolve('applicationPreparationUseCase')
  const navigate = useNavigate()
  const [forms, setForms] = useState<ApplicationForm[]>([])
  const [selectedFormVersionId, setSelectedFormVersionId] = useState('')
  const [preparation, setPreparation] = useState<ApplicationPreparation | null>(null)
  const [serviceField, setServiceField] = useState<ApplicationServiceField>('TECHNICAL_SUPPORT')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const loadController = useRef<AbortController | null>(null)
  const createController = useRef<AbortController | null>(null)
  const loadSequence = useRef(0)
  const submittingGuard = useRef(false)

  const selectedForm = useMemo(
    () => forms.find(({ formVersionId }) => formVersionId === selectedFormVersionId) ?? null,
    [forms, selectedFormVersionId],
  )

  const load = useCallback(() => {
    loadController.current?.abort()
    const controller = new AbortController()
    const sequence = ++loadSequence.current
    loadController.current = controller
    setLoading(true)
    setError(null)

    const request = id === null ? useCase.forms(controller.signal) : useCase.get(id, controller.signal)
    void request.then((result) => {
      if (controller.signal.aborted || sequence !== loadSequence.current) return
      if (id === null) {
        const loadedForms = result as ApplicationForm[]
        const firstForm = loadedForms[0]
        setForms(loadedForms)
        setSelectedFormVersionId(firstForm?.formVersionId ?? '')
        if (firstForm?.supportedServiceFields[0]) setServiceField(firstForm.supportedServiceFields[0])
      } else {
        setPreparation(result as ApplicationPreparation)
      }
    }).catch((caught: unknown) => {
      if (controller.signal.aborted || sequence !== loadSequence.current) return
      setError(asError(caught))
    }).finally(() => {
      if (controller.signal.aborted || sequence !== loadSequence.current) return
      loadController.current = null
      setLoading(false)
    })

    return controller
  }, [id, useCase])

  useEffect(() => {
    const controller = load()
    return () => {
      controller.abort()
      if (loadController.current === controller) loadController.current = null
      loadSequence.current += 1
    }
  }, [load])

  useEffect(() => () => {
    createController.current?.abort()
    submittingGuard.current = false
  }, [])

  const selectForm = useCallback((formVersionId: string) => {
    const form = forms.find((candidate) => candidate.formVersionId === formVersionId)
    if (!form) return
    setSelectedFormVersionId(formVersionId)
    setServiceField((current) => form.supportedServiceFields.includes(current)
      ? current
      : form.supportedServiceFields[0])
  }, [forms])

  const create = useCallback(async () => {
    if (submittingGuard.current) return
    if (!selectedForm || !selectedForm.supportedServiceFields.includes(serviceField)) {
      setError(new Error('지원 공고와 공식 양식, 작성 분야를 다시 선택해 주세요.'))
      return
    }

    submittingGuard.current = true
    const controller = new AbortController()
    createController.current = controller
    setSubmitting(true)
    setError(null)
    try {
      const created = await useCase.create({
        sourceCode: selectedForm.sourceCode,
        sourceProgramId: selectedForm.sourceProgramId,
        formVersionId: selectedForm.formVersionId,
        serviceField,
      }, controller.signal)
      if (!controller.signal.aborted && createController.current === controller) {
        navigate(`${appPaths.applicationPreparations}/${created.id}`, { replace: true })
      }
    } catch (caught) {
      if (!controller.signal.aborted && createController.current === controller) setError(asError(caught))
    } finally {
      if (!controller.signal.aborted && createController.current === controller) {
        createController.current = null
        submittingGuard.current = false
        setSubmitting(false)
      }
    }
  }, [navigate, selectedForm, serviceField, useCase])

  return {
    forms,
    selectedForm,
    selectedFormVersionId,
    preparation,
    serviceField,
    loading,
    submitting,
    error,
    setServiceField,
    selectForm,
    load,
    create,
  }
}
