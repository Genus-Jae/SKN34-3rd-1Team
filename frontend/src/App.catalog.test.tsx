// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { createAppStore } from './app/store'
import { supportPrograms } from './data/fixtures/supportPrograms'
import { getSupportProgramSearchReturnTo } from './presentation/features/support-program-detail/view/supportProgramNavigation'

vi.mock('./presentation/shared/core-api-status/CoreApiConnectionStatus', () => ({ CoreApiConnectionStatus: () => null }))
vi.mock('./presentation/features/chat/hooks/useSupportProgramSearchReadiness', () => ({ useSupportProgramSearchReadiness: () => ({
  canSearch: false, isError: false, isInitialLoading: false, isRefreshing: false, refetch: vi.fn(),
  data: { searchState: 'UNAVAILABLE', programCount: 10, indexReady: false, sources: [], lastSuccessfulSyncAt: null, lastFailedSyncAt: null },
}) }))
const program = { ...supportPrograms[0], title: '서울 수출 바우처', categories: ['수출'], regions: ['서울'], recommendationScore: null, matchedReasons: [] }
const catalog = { programs: [program], total: 1, page: 1, pageSize: 12, totalPages: 1, regions: ['서울', '경북', '전국'], categories: ['수출', '기술'] }
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers() })
function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.search}</output> }
function start(path = '/?mode=filter') {
  const store = createAppStore()
  render(<Provider store={store}><MemoryRouter initialEntries={[path]}><App /><Location /></MemoryRouter></Provider>)
  return store
}

describe('지원사업 직접 필터 검색', () => {
  it.each(['/', '/chat'])('%s에서 대화 입력 보존·키보드 탭 전환·AI 없이 조회한다', async (path) => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(catalog))
    vi.stubGlobal('fetch', fetchMock)
    start(path)
    fireEvent.change(screen.getByRole('textbox', { name: '지원사업 검색어' }), { target: { value: '대화 초안' } })
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.keyDown(screen.getByRole('tab', { name: 'AI 대화 검색' }), { key: 'ArrowRight' })
    await screen.findByRole('link', { name: program.title })
    expect(screen.getByRole('tab', { name: '필터 검색' }).getAttribute('aria-selected')).toBe('true')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(String(fetchMock.mock.calls[0][0])).toContain('/catalog?')
    expect(screen.queryByText(/조건 확인 공고/)).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'AI 대화 검색' }))
    expect((screen.getByRole('textbox', { name: '지원사업 검색어' }) as HTMLTextAreaElement).value).toBe('대화 초안')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('지역·분야 전체 선택지를 접근 가능한 라디오 목록으로 바로 보여준다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(catalog))
    vi.stubGlobal('fetch', fetchMock)
    start()
    await screen.findByRole('link', { name: program.title })
    const regionGroup = within(screen.getByRole('group', { name: '지역' }))
    const categoryGroup = within(screen.getByRole('group', { name: '분야' }))
    expect(regionGroup.getAllByRole('radio').map((radio) => (radio as HTMLInputElement).value)).toEqual(['', ...catalog.regions])
    expect(categoryGroup.getAllByRole('radio').map((radio) => (radio as HTMLInputElement).value)).toEqual(['', ...catalog.categories])
    expect(screen.queryByRole('combobox', { name: '지역' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: '분야' })).toBeNull()
    expect((regionGroup.getByRole('radio', { name: '전체 지역' }) as HTMLInputElement).checked).toBe(true)
    expect((categoryGroup.getByRole('radio', { name: '전체 분야' }) as HTMLInputElement).checked).toBe(true)
    const seoul = regionGroup.getByRole('radio', { name: '서울' }) as HTMLInputElement
    seoul.focus()
    expect(document.activeElement).toBe(seoul)
    fireEvent.click(seoul)
    fireEvent.click(regionGroup.getByRole('radio', { name: '경북' }))
    expect(seoul.checked).toBe(false)
    expect((regionGroup.getByRole('radio', { name: '경북' }) as HTMLInputElement).checked).toBe(true)
    expect(regionGroup.getAllByRole('radio').every((radio) => (radio as HTMLInputElement).name === seoul.name)).toBe(true)
    expect(seoul.name).not.toBe((categoryGroup.getByRole('radio', { name: '전체 분야' }) as HTMLInputElement).name)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('첫 응답을 기다릴 때 지역·분야 목록 로딩 상태를 구분해 보여준다', async () => {
    let resolve!: (response: Response) => void
    const fetchMock = vi.fn().mockImplementation(() => new Promise<Response>((done) => { resolve = done }))
    vi.stubGlobal('fetch', fetchMock)
    start()
    expect(screen.getByText('지역·분야 선택지를 불러오고 있어요…')).toBeTruthy()
    expect(screen.queryByRole('radio', { name: '서울' })).toBeNull()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    await act(async () => resolve(Response.json(catalog)))
    expect(screen.queryByText('지역·분야 선택지를 불러오고 있어요…')).toBeNull()
    expect(screen.getByRole('radio', { name: '서울' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: '수출' })).toBeTruthy()
  })

  it('편집만으로 요청하지 않고 검색으로 필터 적용·초기화를 수행한다', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => Response.json(catalog))
    vi.stubGlobal('fetch', fetchMock)
    start()
    await screen.findByRole('link', { name: program.title })
    fireEvent.click(screen.getByRole('radio', { name: '서울' }))
    fireEvent.click(screen.getByRole('radio', { name: '수출' }))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' 바우처 ' } })
    expect(fetchMock).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: '검색' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const request = new URL(fetchMock.mock.calls[1][0])
    expect(request.searchParams.get('keyword')).toBe('바우처')
    expect(request.searchParams.get('region')).toBe('서울')
    expect(request.searchParams.get('category')).toBe('수출')
    await screen.findByRole('link', { name: program.title })
    fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('')
    expect((screen.getByRole('radio', { name: '전체 지역' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('radio', { name: '전체 분야' }) as HTMLInputElement).checked).toBe(true)
    expect(screen.getByTestId('location').textContent).toBe('/?mode=filter')
  })

  it('미적용 초안도 초기화 버튼으로 지운다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json(catalog)))
    start()
    await screen.findByRole('link', { name: program.title })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '적용 전' } })
    fireEvent.click(screen.getByRole('radio', { name: '서울' }))
    fireEvent.click(screen.getByRole('radio', { name: '수출' }))
    fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }))
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('')
    expect((screen.getByRole('radio', { name: '전체 지역' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('radio', { name: '전체 분야' }) as HTMLInputElement).checked).toBe(true)
  })

  it('공고 상세 왕복 시 필터 탭과 조건을 복원한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => Response.json(url.includes('/catalog?') ? catalog : program)))
    start('/?mode=filter&region=%EC%84%9C%EC%9A%B8&category=%EC%88%98%EC%B6%9C')
    fireEvent.click(await screen.findByRole('link', { name: program.title }))
    await screen.findByRole('heading', { name: program.title })
    const back = screen.getByRole('link', { name: '← 검색 결과로 돌아가기' })
    expect(back.getAttribute('href')).toContain('mode=filter')
    fireEvent.click(back)
    await screen.findByRole('link', { name: program.title })
    expect(screen.getByRole('tab', { name: '필터 검색' }).getAttribute('aria-selected')).toBe('true')
    expect((screen.getByRole('radio', { name: '서울' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('radio', { name: '수출' }) as HTMLInputElement).checked).toBe(true)
  })

  it('현재 목록에 없는 URL 조건도 선택 상태를 잃지 않는다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(catalog)))
    start('/?mode=filter&region=%EB%B6%80%EC%82%B0&category=%EA%B2%BD%EC%98%81')
    await screen.findByRole('link', { name: program.title })
    expect((screen.getByRole('radio', { name: '부산' }) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByRole('radio', { name: '경영' }) as HTMLInputElement).checked).toBe(true)
  })

  it('URL 페이지와 정렬을 복원하고 변경 시 첫 페이지로 이동한다', async () => {
    const programs = Array.from({ length: 12 }, (_, index) => ({ ...program, id: `page1-${index}` }))
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const page = Number(new URL(url).searchParams.get('page'))
      return Response.json({ ...catalog, total: 13, totalPages: 2, page, programs: page === 2 ? [program] : programs })
    })
    vi.stubGlobal('fetch', fetchMock)
    start('/?mode=filter&page=2&sort=DEADLINE')
    await screen.findByRole('link', { name: program.title })
    expect(screen.getByRole('button', { name: '2페이지' }).getAttribute('aria-current')).toBe('page')
    fireEvent.change(screen.getByRole('combobox', { name: '공고 정렬' }), { target: { value: 'RECENT' } })
    await waitFor(() => expect(screen.getAllByRole('link', { name: program.title })).toHaveLength(12))
    expect(screen.getByRole('button', { name: '1페이지' }).getAttribute('aria-current')).toBe('page')
    fireEvent.click(screen.getByRole('button', { name: '다음' }))
    await waitFor(() => expect(screen.getAllByRole('link', { name: program.title })).toHaveLength(1))
  })

  it('오류를 0건으로 숨기지 않고 수동 재시도한다', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('', { status: 503 })).mockResolvedValueOnce(Response.json(catalog))
    vi.stubGlobal('fetch', fetchMock)
    start()
    await screen.findByRole('button', { name: '다시 불러오기' })
    expect(screen.getByText('지역·분야 선택지를 불러오지 못했어요. 아래에서 다시 불러오기를 눌러주세요.')).toBeTruthy()
    expect(screen.queryByText('조건에 맞는 공고가 없어요.')).toBeNull()
    expect(fetchMock).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }))
    await screen.findByRole('link', { name: program.title })
    expect(screen.queryByText('지역·분야 선택지를 불러오지 못했어요. 아래에서 다시 불러오기를 눌러주세요.')).toBeNull()
    expect(screen.getByRole('radio', { name: '서울' })).toBeTruthy()
    expect(screen.getByRole('radio', { name: '수출' })).toBeTruthy()
  })

  it('탭을 떠날 때 조회를 취소하고 늦은 응답을 무시한다', async () => {
    let resolve!: (response: Response) => void
    const fetchMock = vi.fn().mockImplementation(() => new Promise<Response>((done) => { resolve = done }))
    vi.stubGlobal('fetch', fetchMock)
    start()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('tab', { name: 'AI 대화 검색' }))
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
    await act(async () => resolve(Response.json(catalog)))
    expect(screen.queryByRole('link', { name: program.title })).toBeNull()
  })

  it('조회가 멈춰도 10초 뒤 오류를 표시한다', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockReturnValue(new Promise(() => {}))
    vi.stubGlobal('fetch', fetchMock)
    start()
    await act(async () => { await vi.advanceTimersByTimeAsync(10_001) })
    expect(screen.getByRole('button', { name: '다시 불러오기' })).toBeTruthy()
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
  })

  it.each(['//evil.example/?mode=filter', 'https://evil.example', '/admin?mode=filter', '/chat/../admin?mode=filter'])('외부·허용되지 않은 복귀 주소를 차단한다 %s', (searchReturnTo) => {
    expect(getSupportProgramSearchReturnTo({ searchReturnTo })).toBe('/')
  })
})
