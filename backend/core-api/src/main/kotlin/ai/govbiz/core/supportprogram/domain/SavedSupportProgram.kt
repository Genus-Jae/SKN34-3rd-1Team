package ai.govbiz.core.supportprogram.domain

import java.time.LocalDateTime

/** 회원이 관심 공고함에 담은 공고 하나입니다. [program]은 담을 때가 아니라 조회 시점의 현재 공고 내용입니다. */
data class SavedSupportProgram(
    val savedAt: LocalDateTime,
    val program: SupportProgram,
)
