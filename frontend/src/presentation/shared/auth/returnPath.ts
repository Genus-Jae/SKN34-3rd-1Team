import { appPaths } from '../routes/appPaths'

/** 로그인 뒤 돌아갈 경로를 `?next=`에 담습니다. 외부 주소로 새지 않도록 앱 안의 절대 경로만 허용합니다. */
export function loginPathFor(returnTo: string): string {
  return returnTo && returnTo !== '/' ? `/login?next=${encodeURIComponent(returnTo)}` : '/login'
}

export function readReturnPath(search: string, fallback: string = appPaths.chat): string {
  const next = new URLSearchParams(search).get('next')
  return next && next.startsWith('/') && !next.startsWith('//') ? next : fallback
}
