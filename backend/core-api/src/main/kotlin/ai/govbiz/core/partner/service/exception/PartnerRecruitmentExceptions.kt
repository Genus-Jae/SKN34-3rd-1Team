package ai.govbiz.core.partner.service.exception

import java.time.LocalDate

/** 기업을 등록하지 않은 회원이 모집글을 쓰려 할 때 발생합니다. */
class CompanyRequiredException : RuntimeException()

/** 모집글에 묶을 공고가 없거나 제공처에서 사라졌을 때 발생합니다. */
class RecruitmentProgramNotFoundException : RuntimeException()

/** 접수가 끝난 공고에는 모집글을 쓸 수 없습니다. */
class RecruitmentProgramClosedException : RuntimeException()

/** 모집 마감일이 오늘보다 앞서거나 공고 접수 마감 전날을 넘겼을 때 발생합니다. [latestAllowedDeadline]은 접수 마감일이 없으면 null입니다. */
class RecruitmentDeadlineNotAllowedException(val latestAllowedDeadline: LocalDate?) : RuntimeException()

/** 같은 계정이 같은 공고에 이미 모집글을 썼을 때 발생합니다. */
class RecruitmentAlreadyExistsException : RuntimeException()

/** 요청한 모집글이 없을 때 발생합니다. */
class RecruitmentNotFoundException : RuntimeException()
