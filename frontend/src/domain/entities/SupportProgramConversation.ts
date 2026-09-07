export type SupportProgramConversationContext = {
  query: string | null
  acceptingOnly: boolean
  companyConditions: {
    region: string | null
    industry: string | null
    establishedOn: string | null
    supportPurpose: string | null
  }
}

export type SupportProgramPendingClarification = {
  question: string
  draftContext: SupportProgramConversationContext
}

export type SupportProgramInterpretRequest = {
  message: string
  context: SupportProgramConversationContext
  pendingClarification?: SupportProgramPendingClarification | null
}

export const conversationChangedFields = ['QUERY', 'REGION', 'INDUSTRY', 'ESTABLISHED_ON', 'SUPPORT_PURPOSE', 'ACCEPTING_ONLY'] as const
export type SupportProgramConversationField = typeof conversationChangedFields[number]

export type SupportProgramInterpretation = {
  status: 'READY' | 'CLARIFICATION_REQUIRED'
  proposedContext: SupportProgramConversationContext
  clarificationQuestion: string | null
  changedFields: SupportProgramConversationField[]
}
