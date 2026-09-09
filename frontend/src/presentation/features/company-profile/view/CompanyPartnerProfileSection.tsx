import { workspacePageStyles, workspaceTagClassName } from '../../../shared/workspace/WorkspacePage.styles'
import type { useCompanyPartnerProfileViewModel } from '../viewmodel/useCompanyPartnerProfileViewModel'
import { companyProfileChoiceClassName, companyProfileStyles } from './CompanyProfilePage.styles'

type PartnerProfileViewModel = ReturnType<typeof useCompanyPartnerProfileViewModel>

/** 협업·파트너 설정 카드입니다. 기업을 등록한 뒤에만 편집할 수 있고, 저장한 값은 모집글 상세와 기업 프로필 보기에 나갑니다. */
export function CompanyPartnerProfileSection({ vm }: { vm: PartnerProfileViewModel }) {
  const errorId = (field: string) => (vm.error?.field === field ? `partner-profile-${field}-error` : undefined)
  const errorOf = (field: string) =>
    vm.error?.field === field ? <p id={`partner-profile-${field}-error`} className={companyProfileStyles.formError} role="alert">{vm.error.message}</p> : null

  return (
    <section className={workspacePageStyles.card} aria-label="협업·파트너 설정">
      <div className={workspacePageStyles.cardHeader}>
        <div>
          <h2 className={workspacePageStyles.cardTitle}>협업·파트너 설정</h2>
          <p className={workspacePageStyles.cardDescription}>
            모집글 상세와 기업 프로필 보기에서 다른 기업에게 보입니다.
          </p>
        </div>
        {vm.isSet ? <span className={workspaceTagClassName('ok')}>저장됨</span> : <span className={workspaceTagClassName('muted')}>미설정</span>}
      </div>

      {!vm.hasCompany ? (
        <p className={workspacePageStyles.emptyNote}>기업을 등록하면 협업 조건을 설정할 수 있습니다.</p>
      ) : vm.loadFailedMessage ? (
        <p className={companyProfileStyles.formError} role="alert">{vm.loadFailedMessage}</p>
      ) : (
        <form className={companyProfileStyles.form} aria-label="협업·파트너 설정" onSubmit={vm.submit} noValidate>
          <div className={companyProfileStyles.choiceGroup}>
            <span className={companyProfileStyles.choiceLabel} id="partner-roles-label">참여 가능 역할</span>
            <div className={companyProfileStyles.choices} role="group" aria-labelledby="partner-roles-label" aria-describedby={errorId('roles')}>
              {vm.roleOptions.map((option) => (
                <button
                  className={companyProfileChoiceClassName(vm.form.roles.includes(option.value))}
                  key={option.value}
                  type="button"
                  aria-pressed={vm.form.roles.includes(option.value)}
                  onClick={() => vm.toggleRole(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <span className={companyProfileStyles.formHint}>모집글의 "찾는 역할"과 같은 구분입니다. 하나 이상 고릅니다.</span>
            {errorOf('roles')}
          </div>

          <div className={companyProfileStyles.choiceGroup}>
            <span className={companyProfileStyles.choiceLabel} id="partner-interest-label">관심 분야 <span className={companyProfileStyles.optionalMark}>최대 {vm.limits.interestAreaMaxCount}개</span></span>
            <div className={companyProfileStyles.choices} role="group" aria-labelledby="partner-interest-label" aria-describedby={errorId('interestAreas')}>
              {vm.interestAreaOptions.map((area) => (
                <button
                  className={companyProfileChoiceClassName(vm.form.interestAreas.includes(area))}
                  key={area}
                  type="button"
                  aria-pressed={vm.form.interestAreas.includes(area)}
                  onClick={() => vm.toggleInterestArea(area)}
                >
                  {area}
                </button>
              ))}
            </div>
            <span className={companyProfileStyles.formHint}>지원사업 검색의 분야 목록을 그대로 씁니다.</span>
            {errorOf('interestAreas')}
          </div>

          <div className={companyProfileStyles.capabilityGroup}>
            <label className={companyProfileStyles.choiceLabel} htmlFor="partner-introduction">한 줄 소개 <span className={companyProfileStyles.optionalMark}>선택 · {vm.limits.introductionMaxLength}자</span></label>
            <textarea
              className={companyProfileStyles.capabilityTextarea}
              id="partner-introduction"
              maxLength={vm.limits.introductionMaxLength}
              placeholder="어떤 일을 하는 팀인지, 어떤 협업을 찾는지 한두 문장으로"
              aria-describedby={errorId('introduction') ?? 'partner-introduction-count'}
              value={vm.form.introduction}
              onChange={(event) => vm.updateIntroduction(event.target.value)}
            />
            <span id="partner-introduction-count" className={companyProfileStyles.counter}>{vm.form.introduction.length} / {vm.limits.introductionMaxLength}</span>
            {errorOf('introduction')}
          </div>

          <div className={companyProfileStyles.capabilityGroup}>
            <label className={companyProfileStyles.choiceLabel} htmlFor="partner-capability-input">보유 역량 태그 <span className={companyProfileStyles.optionalMark}>최대 {vm.limits.capabilityMaxCount}개 · 각 {vm.limits.capabilityMaxLength}자</span></label>
            <div className={companyProfileStyles.capabilityBox}>
              {vm.form.capabilities.map((capability) => (
                <span className={companyProfileStyles.capabilityChip} key={capability}>
                  {capability}
                  <button className={companyProfileStyles.capabilityRemove} type="button" aria-label={`${capability} 삭제`} onClick={() => vm.removeCapability(capability)}>×</button>
                </span>
              ))}
              <input
                className={companyProfileStyles.capabilityInput}
                id="partner-capability-input"
                type="text"
                placeholder="입력 후 Enter"
                aria-describedby={errorId('capabilities')}
                value={vm.capabilityDraft}
                onChange={(event) => vm.updateCapabilityDraft(event.target.value)}
                onKeyDown={vm.addCapabilityOnEnter}
                onBlur={vm.addCapability}
              />
            </div>
            <span className={companyProfileStyles.formHint}>모집글 작성의 역량 칩과 같은 형식입니다. 수치와 실적은 스스로 적은 값이며 GovBiz가 검증하지 않습니다.</span>
            {errorOf('capabilities')}
          </div>

          {vm.error?.field === 'form' ? <p className={companyProfileStyles.formError} role="alert">{vm.error.message}</p> : null}
          {vm.notice ? <p className={companyProfileStyles.notice} role="status">{vm.notice}</p> : null}
          <div className={companyProfileStyles.formActions}>
            <button className={workspacePageStyles.secondaryButton} type="button" onClick={vm.reset} disabled={!vm.isDirty || vm.isSaving}>되돌리기</button>
            <button className={workspacePageStyles.primaryButton} type="submit" disabled={vm.isSaving || vm.loadStatus !== 'ready'}>
              {vm.isSaving ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
