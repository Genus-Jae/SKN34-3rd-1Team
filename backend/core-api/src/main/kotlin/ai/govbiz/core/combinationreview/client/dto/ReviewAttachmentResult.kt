package ai.govbiz.core.combinationreview.client.dto

/** 수집과 디코딩이 함께 준수하는 첨부 전송 계약의 바이트 상한. */
const val MAX_REVIEW_ATTACHMENT_BYTES = 16 * 1024 * 1024
const val MAX_REVIEW_ATTACHMENTS_TOTAL_BYTES = 32 * 1024 * 1024

data class ReviewAttachmentResult(val sourceUrl: String, val fileName: String, val format: String, val bytes: ByteArray)
data class ReviewAttachmentsResult(val title: String, val files: List<ReviewAttachmentResult>, val warnings: List<String>)
