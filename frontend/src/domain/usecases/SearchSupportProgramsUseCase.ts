import type { SupportProgram } from '../entities/SupportProgram'
import type { SupportProgramRepository, SupportProgramSearch } from '../repositories/SupportProgramRepository'

type SupportProgramSearchRepository = Pick<SupportProgramRepository, 'search'>

export type SearchSupportProgramsResult = {
  programs: SupportProgram[]
  query: string
}

export class SearchSupportProgramsUseCase {
  private readonly repository: SupportProgramSearchRepository

  constructor(repository: SupportProgramSearchRepository) {
    this.repository = repository
  }

  async execute(command: SupportProgramSearch, signal?: AbortSignal): Promise<SearchSupportProgramsResult> {
    const normalizedQuery = command.query.trim()
    return {
      query: normalizedQuery,
      programs: await this.repository.search(
        { ...command, query: normalizedQuery, acceptingOnly: command.acceptingOnly ?? true },
        signal,
      ),
    }
  }
}
