package ai.govbiz.core.partner.repository.mapper

import java.time.LocalDate
import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param

/** 파트너 모집글 MySQL SQL을 실행하는 MyBatis Mapper입니다. */
@Mapper
interface PartnerRecruitmentMapper {

    fun findPresentProgram(
        @Param("sourceCode") sourceCode: String,
        @Param("sourceProgramId") sourceProgramId: String,
    ): PartnerProgramDbRow?

    fun insertRecruitment(row: PartnerRecruitmentDbRow): Int

    fun findRecruitmentById(@Param("id") id: Long): PartnerRecruitmentDbRow?

    /** [keywordPattern]은 LIKE 패턴으로 이미 이스케이프된 값이며 비어 있으면 검색어 조건을 두지 않습니다. */
    fun findRecruitments(
        @Param("keywordPattern") keywordPattern: String?,
        @Param("seekingRole") seekingRole: String?,
        @Param("region") region: String?,
        @Param("nationwideRegion") nationwideRegion: String,
        @Param("mineAccountId") mineAccountId: Long?,
        @Param("today") today: LocalDate,
        @Param("sortByRecent") sortByRecent: Boolean,
        @Param("limit") limit: Int,
        @Param("offset") offset: Int,
    ): List<PartnerRecruitmentDbRow>

    fun countRecruitments(
        @Param("keywordPattern") keywordPattern: String?,
        @Param("seekingRole") seekingRole: String?,
        @Param("region") region: String?,
        @Param("nationwideRegion") nationwideRegion: String,
        @Param("mineAccountId") mineAccountId: Long?,
        @Param("today") today: LocalDate,
    ): Long
}
