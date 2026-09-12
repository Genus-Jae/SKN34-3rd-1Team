package ai.govbiz.core.chathistory.repository.mapper

import org.apache.ibatis.annotations.Mapper
import org.apache.ibatis.annotations.Param

@Mapper
interface ChatConversationMapper {
    fun lockActiveAccount(@Param("accountId") accountId: Long): Long?
    fun findPage(@Param("accountId") accountId: Long, @Param("before") before: Long?): List<ChatConversationDbRow>
    fun find(@Param("accountId") accountId: Long, @Param("conversationId") conversationId: String): ChatConversationDbRow?
    fun insert(row: ChatConversationDbRow): Int
    fun update(row: ChatConversationDbRow): Int
    fun deleteByAccountId(@Param("accountId") accountId: Long): Int
}
