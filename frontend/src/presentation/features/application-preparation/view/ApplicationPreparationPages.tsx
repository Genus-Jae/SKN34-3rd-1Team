import { useLayoutEffect, useRef } from 'react'
import { Link, useParams } from 'react-router'
import { useAppSelector } from '../../../../app/hooks'
import {
  applicationServiceFieldLabels,
  type ApplicationForm,
  type ApplicationFormSection,
} from '../../../../domain/entities/ApplicationPreparation'
import { selectCurrentAccount } from '../../../shared/auth/state/authSlice'
import { appPaths } from '../../../shared/routes/appPaths'
import { WorkspacePageHeader } from '../../../shared/workspace/WorkspacePageHeader'
import { workspacePageStyles } from '../../../shared/workspace/WorkspacePage.styles'
import { useApplicationPreparationEditorViewModel } from '../viewmodel/useApplicationPreparationEditorViewModel'
import { useApplicationPreparationListViewModel } from '../viewmodel/useApplicationPreparationListViewModel'
import { applicationPreparationStyles as s } from './ApplicationPreparation.styles'

const listTitle = '신청 문서 작성 도우미'
const sectionStatus = {
  NOT_STARTED: { label: '작성 전', className: s.notStarted },
  IN_PROGRESS: { label: '입력 중', className: s.inProgress },
  INPUT_CONFIRMED: { label: '사실 확인됨', className: s.confirmed },
} as const

function readableTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function ErrorNotice({ message, retryLabel, onRetry }: { message: string; retryLabel?: string; onRetry?: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => { ref.current?.focus() }, [message])
  return <div className={s.warning} ref={ref} role="alert" tabIndex={-1}>
    <p>{message}</p>
    {onRetry && <button className={`${s.button} mt-3`} type="button" onClick={onRetry}>{retryLabel ?? '다시 시도'}</button>}
  </div>
}

function OfficialFormSummary({ form }: { form: ApplicationForm }) {
  return <section className={s.card} aria-labelledby="official-form-summary-title">
    <h2 className={s.cardTitle} id="official-form-summary-title">공고 및 공식 양식</h2>
    <dl className={s.details}>
      <div><dt>공고명</dt><dd>{form.programTitle}</dd></div>
      <div><dt>양식명</dt><dd>{form.formTitle}</dd></div>
    </dl>
    <p className={s.muted}>공식 파일 해시와 문항 위치를 확인한 양식입니다. 기관 검수 완료나 선정 가능성을 뜻하지 않습니다.</p>
    <a className={s.officialLink} href={form.sourceUrl} target="_blank" rel="noreferrer">
      공식 공고 열기<span className="sr-only">: {form.programTitle} (새 창)</span>
    </a>
  </section>
}

function SectionInputEditor({ section, vm }: {
  section: ApplicationFormSection
  vm: ReturnType<typeof useApplicationPreparationEditorViewModel>
}) {
  const state = vm.interpretations[section.key]
  const busy = vm.busySection?.key === section.key
  const status = sectionStatus[section.status]
  const labels = new Map(section.fields.map((field) => [field.key, field.label]))
  return <li className={s.sectionItem}>
    <div className={s.sectionHeading}>
      <strong>{section.title}</strong>
      <span className={status.className} aria-label={`작성 상태: ${status.label}`}>{status.label}</span>
    </div>
    <p className={s.muted}>{section.description}</p>
    <ul className={s.fieldList} aria-label={`${section.title} 필수 입력`}>
      {section.fields.map((field) => <li className={s.notice} key={field.key}>
        <strong>{field.label}{field.required ? ' · 필수' : ''}</strong>
        <p className={s.muted}>{field.guidance}</p>
      </li>)}
    </ul>
    {section.facts.length > 0 && <div>
      <h3 className={s.label}>사용자가 확인한 사실</h3>
      <ul className={s.fieldList}>
        {section.facts.map((fact) => <li className={s.factItem} key={fact.id}>
          <strong>{labels.get(fact.fieldKey) ?? fact.fieldKey}</strong>
          <p>{fact.status === 'UNKNOWN' ? '미정으로 확인함' : fact.value}</p>
        </li>)}
      </ul>
    </div>}
    <label className={s.label} htmlFor={`section-answer-${section.key}`}>AI가 사실 항목을 구분할 수 있도록 답변하기</label>
    <textarea
      className={s.textarea}
      disabled={vm.busySection !== null}
      id={`section-answer-${section.key}`}
      maxLength={4000}
      value={vm.sectionMessages[section.key] ?? ''}
      onChange={(event) => vm.setSectionMessage(section.key, event.target.value)}
      placeholder="확인된 사실만 적어 주세요. 모르는 값은 미정이라고 밝혀 주세요."
    />
    <div className={s.moreActions}>
      <button className={s.button} disabled={vm.busySection !== null || !(vm.sectionMessages[section.key] ?? '').trim()} type="button" onClick={() => { void vm.interpretSection(section) }}>
        {busy && vm.busySection?.action === 'interpret' ? 'AI가 답변 확인 중…' : 'AI로 답변 확인'}
      </button>
      {busy && <p className={s.status} role="status" aria-live="polite">답변에서 사실과 미정 항목을 구분하고 있습니다.</p>}
    </div>
    {state && <section className={s.notice} aria-label={`${section.title} AI 제안`}>
      <h3 className={s.label}>확인 전 AI 제안</h3>
      <p className={s.muted}>자동 저장되지 않습니다. 값과 근거를 확인하고 필요한 항목만 선택해 저장하세요.</p>
      {state.result.suggestions.length === 0 && <p className={s.muted}>이번 답변에서 저장할 사실을 찾지 못했습니다.</p>}
      <div className="flex flex-col gap-3">
        {state.result.suggestions.map((suggestion) => <div className={s.suggestion} key={suggestion.fieldKey}>
          <label className={s.checkboxLabel}>
            <input checked={state.selected[suggestion.fieldKey] ?? false} type="checkbox" onChange={() => vm.toggleSuggestion(section.key, suggestion.fieldKey)} />
            <span>{labels.get(suggestion.fieldKey) ?? suggestion.fieldKey}</span>
          </label>
          {suggestion.status === 'UNKNOWN'
            ? <p className={s.muted}>미정으로 저장할 제안입니다.</p>
            : <input
              aria-label={`${labels.get(suggestion.fieldKey) ?? suggestion.fieldKey} 확인 값`}
              className={s.input}
              maxLength={2000}
              value={state.values[suggestion.fieldKey] ?? ''}
              onChange={(event) => vm.setSuggestionValue(section.key, suggestion.fieldKey, event.target.value)}
            />}
          <blockquote className={s.quote}>사용자 답변 근거: “{suggestion.evidenceQuote}”</blockquote>
        </div>)}
      </div>
      {state.result.nextQuestion && <p className={s.warning}><strong>다음 질문:</strong> {state.result.nextQuestion}</p>}
      {state.result.suggestions.length > 0 && <button className={s.primary} disabled={vm.busySection !== null} type="button" onClick={() => { void vm.saveSuggestions(section) }}>
        {busy && vm.busySection?.action === 'save' ? '확인 사실 저장 중…' : '선택한 사실 확인하고 저장'}
      </button>}
    </section>}
    <p className={s.locator}>공식 양식 위치: {section.locator}</p>
  </li>
}

export function ApplicationPreparationListPage() {
  const account = useAppSelector(selectCurrentAccount)
  return account ? <ApplicationPreparationList key={account.email} /> : null
}

function ApplicationPreparationList() {
  const vm = useApplicationPreparationListViewModel()
  return <>
    <WorkspacePageHeader
      title={listTitle}
      actions={<Link className={workspacePageStyles.primaryButton} to={appPaths.applicationPreparationNew}>새 작성</Link>}
    />
    <main className={workspacePageStyles.content}>
      <p className={s.muted}>검수된 공식 양식과 지원 분야를 선택해 신청 준비를 시작하고, 저장한 작업을 다시 열 수 있습니다.</p>
      {vm.error && <ErrorNotice message={vm.error.message} retryLabel="목록 다시 불러오기" onRetry={vm.retry} />}
      {vm.isInitialLoading && <p className={s.status} role="status" aria-live="polite">신청 준비 목록을 불러오는 중입니다.</p>}
      {vm.page?.items.length === 0 && !vm.isInitialLoading && <section className={s.card} aria-labelledby="empty-preparations-title">
        <h2 className={s.cardTitle} id="empty-preparations-title">아직 시작한 신청 문서가 없습니다.</h2>
        <p className={s.muted}>새 작성에서 공식 양식과 지원 분야를 확인한 뒤 시작해 주세요.</p>
      </section>}
      {vm.page && vm.page.items.length > 0 && <ul className={s.list} aria-label="신청 준비 목록">
        {vm.page.items.map((item) => <li className={s.card} key={item.id}>
          <Link className={s.listLink} to={`${appPaths.applicationPreparations}/${item.id}`}>
            <strong>{item.programTitle}</strong>
            <span className={s.muted}>{item.formTitle} · {applicationServiceFieldLabels[item.serviceField]}</span>
            <span className={s.muted}>입력 버전 {item.inputRevision} · {readableTime(item.updatedAt)} 수정</span>
          </Link>
        </li>)}
      </ul>}
      {vm.page && vm.page.nextBeforeId !== null && !vm.error && <div className={s.moreActions}>
        <button className={s.button} disabled={vm.isLoadingMore} type="button" onClick={() => { vm.loadMore() }}>
          {vm.isLoadingMore ? '이전 작업 불러오는 중…' : '이전 작업 더 보기'}
        </button>
        {vm.isLoadingMore && <p className={s.status} role="status" aria-live="polite">이전 신청 준비를 불러오는 중입니다.</p>}
      </div>}
    </main>
  </>
}

export function ApplicationPreparationEditorPage({ create = false }: { create?: boolean }) {
  const account = useAppSelector(selectCurrentAccount)
  const { preparationId } = useParams()
  const id = create ? null : Number(preparationId)
  if (!account) return null
  if (!create && (id === null || !Number.isSafeInteger(id) || id <= 0)) {
    return <>
      <WorkspacePageHeader parent={{ to: appPaths.applicationPreparations, label: listTitle }} title="신청 문서" />
      <main className={workspacePageStyles.content}><ErrorNotice message="올바른 신청 준비 주소가 아닙니다." /></main>
    </>
  }
  return <ApplicationPreparationEditor key={`${account.email}:${id ?? 'new'}`} id={id} />
}

function ApplicationPreparationEditor({ id }: { id: number | null }) {
  const vm = useApplicationPreparationEditorViewModel(id)
  const detail = id === null ? null : vm.preparation
  return <>
    <WorkspacePageHeader
      parent={{ to: appPaths.applicationPreparations, label: listTitle }}
      title={id === null ? '새 신청 문서' : '신청 문서'}
    />
    <main className={workspacePageStyles.content}>
      {vm.loading && <p className={s.status} role="status" aria-live="polite">
        {id === null ? '지원 가능한 공식 양식을 불러오는 중입니다.' : '신청 문서 정보를 불러오는 중입니다.'}
      </p>}
      {vm.error && <ErrorNotice message={vm.error.message} onRetry={vm.submitting ? undefined : vm.load} />}

      {id === null && vm.selectedForm && <form className={s.form} aria-labelledby="create-preparation-title" onSubmit={(event) => {
        event.preventDefault()
        void vm.create()
      }}>
        <section className={s.card}>
          <h2 className={s.cardTitle} id="create-preparation-title">공식 양식 선택</h2>
          <label className={s.label} htmlFor="application-form">작성할 공식 양식</label>
          <select
            aria-describedby="application-form-hint"
            className={s.input}
            disabled={vm.submitting}
            id="application-form"
            value={vm.selectedFormVersionId}
            onChange={(event) => vm.selectForm(event.target.value)}
          >
            {vm.forms.map((form) => <option value={form.formVersionId} key={form.formVersionId}>
              {form.programTitle} — {form.formTitle}
            </option>)}
          </select>
          <p className={s.muted} id="application-form-hint">Core API가 제공하는 검증된 공식 양식만 선택할 수 있습니다.</p>
        </section>

        <OfficialFormSummary form={vm.selectedForm} />

        <section className={s.card} aria-labelledby="service-field-title">
          <h2 className={s.cardTitle} id="service-field-title">지원 분야 선택</h2>
          <label className={s.label} htmlFor="application-service-field">작성할 지원 분야</label>
          <select
            className={s.input}
            disabled={vm.submitting}
            id="application-service-field"
            value={vm.serviceField}
            onChange={(event) => vm.setServiceField(event.target.value as typeof vm.serviceField)}
          >
            {vm.selectedForm.supportedServiceFields.map((field) => <option value={field} key={field}>
              {applicationServiceFieldLabels[field]}
            </option>)}
          </select>
          <p className={s.muted}>선택한 공식 양식이 지원하는 분야만 표시합니다. 생성만 수행하며 이 단계에서는 AI를 호출하지 않습니다.</p>
          <button className={s.primary} disabled={vm.submitting} type="submit">
            {vm.submitting ? '신청 준비 생성 중…' : '신청 문서 작성 시작'}
          </button>
          {vm.submitting && <p className={s.status} role="status" aria-live="polite">신청 준비를 생성하고 있습니다. 잠시만 기다려 주세요.</p>}
        </section>
      </form>}

      {detail && <>
        <OfficialFormSummary form={detail.form} />
        <section className={s.card} aria-labelledby="preparation-info-title">
          <h2 className={s.cardTitle} id="preparation-info-title">신청 준비 정보</h2>
          <dl className={s.details}>
            <div><dt>선택 분야</dt><dd>{applicationServiceFieldLabels[detail.serviceField]}</dd></div>
            <div><dt>입력 버전</dt><dd>{detail.inputRevision}</dd></div>
            <div><dt>신청 준비 번호</dt><dd>{detail.id}</dd></div>
          </dl>
        </section>
        <section className={s.card} aria-labelledby="official-sections-title">
          <h2 className={s.cardTitle} id="official-sections-title">공식 작성 항목</h2>
          <ol className={s.sectionList}>
            {detail.form.sections.map((section, index) => <SectionInputEditor
              key={section.key}
              section={{ ...section, title: `${index + 1}. ${section.title}` }}
              vm={vm}
            />)}
          </ol>
          <p className={s.notice}>AI 제안은 사용자가 확인해 저장하기 전까지 입력 사실이 아닙니다. 초안 생성·직접 편집·최종 확인은 다음 단계에서 제공합니다.</p>
        </section>
      </>}
    </main>
  </>
}
