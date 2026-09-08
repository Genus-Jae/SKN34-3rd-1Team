/* Node 24 + 외부에 설치된 Playwright로 실행하는 선택적 실제 브라우저 회귀 검사.
 * 앱 서버만 미리 실행합니다. 모든 API는 가로채며 외부 네트워크는 차단합니다.
 * PLAYWRIGHT_MODULE_PATH / BROWSER_EXECUTABLE_PATH / UI_TEST_BASE_URL은 README 참조.
 */
const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')
const { supportPrograms } = require('../src/data/fixtures/supportPrograms.ts')

const origin = new URL(process.env.UI_TEST_BASE_URL || 'http://127.0.0.1:5173').origin
assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname), '로컬 개발 서버만 허용합니다.')
const source = { sourceCode: 'BIZINFO', sourceName: '기업마당', searchState: 'SEARCHABLE',
  programCount: supportPrograms.length, indexReady: true, lastSuccessfulSyncAt: null, lastFailedSyncAt: null }
const longProgram = { ...supportPrograms[0], title: `레이아웃검증-${'A'.repeat(260)}`,
  summary: 'B'.repeat(700), targetDescription: 'C'.repeat(500), matchedReasons: [] }
const detailQuery = new URLSearchParams({ sourceCode: longProgram.sourceCode, sourceProgramId: longProgram.id })
const detailPath = `/support-programs/detail?${detailQuery}`
const questionPath = `/support-programs/detail/question?${detailQuery}`
const paths = ['/', '/pricing', '/chat', '/login', '/signup', '/partners', '/partners/new',
  '/partners/detail?recruitmentId=ai-labeling', '/profile', '/admin/members', detailPath, questionPath,
  '/examples/sample-item/hook', '/examples/sample-item/redux']
const sizes = [[320, 568], [375, 667], [768, 800], [844, 390], [1024, 800], [1280, 800], [1440, 900]]

async function checkBounds(page, label) {
  const failures = await page.evaluate(() => {
    const problems = []
    // 이번에 정리한 활성 안내 토큰의 실제 렌더 색상만 검사합니다. 전체 WCAG 감사는 아닙니다.
    const luminance = rgb => rgb.slice(0, 3).map(v => v / 255)
      .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      .reduce((sum, v, index) => sum + v * [0.2126, 0.7152, 0.0722][index], 0)
    const rgb = color => color.match(/[\d.]+/g)?.map(Number)
    for (const node of document.querySelectorAll('.text-sample-muted, .placeholder\\:text-sample-muted')) {
      if (node.matches(':disabled') || !node.getClientRects().length) continue
      let background
      for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor)
        if (style.backgroundImage !== 'none' || Number(style.opacity) < 1) break
        const candidate = rgb(style.backgroundColor)
        if (candidate && (candidate.length === 3 || candidate[3] === 1)) { background = candidate; break }
      }
      if (!background) continue
      const pseudo = node.classList.contains('placeholder:text-sample-muted') ? '::placeholder' : null
      const foreground = rgb(getComputedStyle(node, pseudo).color)
      if (!foreground) continue
      const lights = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
      if ((lights[0] + 0.05) / (lights[1] + 0.05) < 4.5) problems.push(`활성 안내 대비 부족: ${node.id || node.textContent.slice(0, 20)}`)
    }
    if (document.documentElement.scrollWidth > innerWidth + 1) problems.push(`문서 가로 넘침 ${document.documentElement.scrollWidth}/${innerWidth}`)
    // 표는 의도적으로 자체 가로 스크롤합니다. 일반 폼 입력이 0~49px로 붕괴하는 경우는 허용하지 않습니다.
    for (const input of document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea, select')) {
      const rect = input.getBoundingClientRect()
      if (rect.width > 0 && rect.width < 100) problems.push(`입력 폭 부족 ${input.id || input.name}: ${rect.width}`)
      const form = input.closest('form')?.getBoundingClientRect()
      if (form && (rect.left < form.left - 1 || rect.right > form.right + 1)) problems.push(`폼 밖 입력 ${input.id || input.name}`)
    }
    const workspace = document.querySelector('[aria-label="작업 사이드바"]')?.parentElement
    if (workspace && innerWidth >= 760 && document.documentElement.scrollHeight > innerHeight + 1) {
      problems.push(`작업 화면 외부 세로 넘침 ${document.documentElement.scrollHeight}/${innerHeight}`)
    }
    return problems
  })
  assert.deepEqual(failures, [], label)
}

async function main() {
  const browser = await chromium.launch({ headless: true,
    ...(process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH } : {}) })
  let pagesChecked = 0
  let flowsChecked = 0
  const calls = { interpret: 0, search: 0, answers: 0 }
  const errors = []
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' })
    await context.route('**/*', async route => {
      const request = route.request()
      const url = new URL(request.url())
      if (!url.pathname.startsWith('/api/')) return url.origin === origin ? route.continue() : route.abort()
      let json
      if (url.pathname.endsWith('/readiness')) json = { ...source, sources: [source] }
      else if (url.pathname.endsWith('/interpret')) {
        calls.interpret++
        const command = request.postDataJSON()
        json = { status: 'READY', proposedContext: { ...command.context, query: command.message.trim() },
          changedFields: ['QUERY'], clarificationQuestion: null }
      } else if (url.pathname.endsWith('/search')) {
        calls.search++
        json = { query: request.postDataJSON().query, programs: [longProgram, ...supportPrograms.slice(1)] }
      } else if (url.pathname.endsWith('/detail')) json = longProgram
      else if (url.pathname.endsWith('/answers')) {
        calls.answers++
        json = { answerStatus: 'ANSWERED', answer: 'D'.repeat(1000),
          citations: [{ excerpt: 'E'.repeat(1200), sourceUrl: longProgram.sourceUrl, chunkOrder: 0 }] }
      } else return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })
      return route.fulfill({ json })
    })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    page.setDefaultTimeout(8000)
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height })
      for (const path of paths) {
        const label = `${width}x${height} ${path}`
        await page.goto(origin + path)
        await page.locator('h1').first().waitFor({ state: 'attached' })
        if (path === detailPath) await page.getByRole('heading', { name: longProgram.title, exact: true }).waitFor()
        await checkBounds(page, label)
        pagesChecked++
        if (path === '/' || path === '/chat') {
          const input = page.getByRole('textbox', { name: '지원사업 검색어' })
          await input.fill('A'.repeat(400) + '\n서울 AI 사업')
          const before = { ...calls }
          await page.getByRole('button', { name: '검색 전송', exact: true }).click()
          const confirm = page.getByRole('button', { name: '이 조건으로 검색', exact: true })
          await confirm.waitFor()
          assert.equal(calls.search, before.search, `${label}: 확인 전 검색 금지`)
          const box = await confirm.boundingBox()
          assert(box && box.y >= 0 && box.y + box.height <= height + 1, `${label}: 확인 버튼이 자동 스크롤로 보여야 함`)
          await confirm.click()
          await page.getByRole('heading', { name: longProgram.title, exact: true }).waitFor()
          await checkBounds(page, `${label} 검색 결과`)
          const timeline = page.getByRole('region', { name: '대화 내역', exact: true })
          assert(await timeline.evaluate(n => n.scrollWidth <= n.clientWidth + 1), `${label}: 긴 대화 가로 넘침`)
          const bubble = timeline.locator('article.justify-end > div > div').first()
          assert.equal(await bubble.evaluate(n => getComputedStyle(n).whiteSpace), 'pre-wrap', `${label}: 줄바꿈 보존`)
          if (path === '/chat' && width >= 760) {
            const inputBox = await input.boundingBox()
            assert(inputBox && inputBox.y >= 0 && inputBox.y + inputBox.height <= height, `${label}: 데스크톱 입력창 고정`)
          }
          assert.equal(calls.interpret, before.interpret + 1)
          assert.equal(calls.search, before.search + 1)
          await page.getByRole('button', { name: '새 검색', exact: true }).click()
          assert.equal(await input.inputValue(), '')
          assert(await input.evaluate(n => n === document.activeElement), `${label}: 새 검색 포커스`)
          assert.equal(await page.getByRole('heading', { name: longProgram.title, exact: true }).count(), 0)
          assert.equal(calls.search, before.search + 1, `${label}: 초기화 자동 검색 금지`)
          flowsChecked++
        } else if (path === '/pricing') {
          const main = page.getByRole('main')
          for (const name of ['무료', '프로', '팀']) {
            assert.equal(await main.getByRole('heading', { name, exact: true }).count(), 1)
          }
          const pending = main.getByRole('button', { name: '출시 준비 중', exact: true })
          assert.equal(await pending.count(), 2)
          for (const button of await pending.all()) assert(await button.isDisabled())
          const faq = main.locator('details').first()
          await faq.locator('summary').focus()
          await faq.locator('summary').press('Enter')
          assert(await faq.evaluate(node => node.open), `${label}: 키보드로 FAQ 열기`)
          await checkBounds(page, `${label} FAQ 펼침`)
          await faq.locator('summary').press('Enter')
          assert(!(await faq.evaluate(node => node.open)), `${label}: 키보드로 FAQ 닫기`)
          await main.getByRole('link', { name: '무료로 지원사업 찾기', exact: true }).click()
          await page.getByRole('textbox', { name: '지원사업 검색어' }).waitFor()
          flowsChecked++
        } else if (path === questionPath) {
          const input = page.getByRole('textbox', { name: '공고 원문에 질문하기' })
          await input.fill('가'.repeat(501))
          assert.equal(await input.getAttribute('aria-invalid'), 'true')
          assert(await page.getByRole('button', { name: '질문하고 근거 받기' }).isDisabled())
          await input.fill('신청 대상을 알려주세요')
          await page.getByRole('button', { name: '질문하고 근거 받기' }).click()
          await page.getByText('D'.repeat(1000), { exact: true }).waitFor()
          await checkBounds(page, `${label} 긴 답변·근거`)
          flowsChecked++
        } else if (path === '/partners/new') {
          const input = page.getByRole('textbox', { name: '필요 역량', exact: true })
          await input.fill('F'.repeat(200))
          await input.press('Enter')
          await checkBounds(page, `${label} 긴 역량 칩`)
          flowsChecked++
        }
      }
      console.log(`PASS ${width}x${height}: ${paths.length}개 경로 및 검색·초기화·긴 답변·역량 칩`)
    }
    assert.deepEqual(errors, [], '브라우저 미처리 오류')
    console.log(JSON.stringify({ pagesChecked, flowsChecked, mockedCalls: calls, unhandledErrors: errors.length, realApiCalls: 0 }))
  } finally {
    await browser.close()
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
