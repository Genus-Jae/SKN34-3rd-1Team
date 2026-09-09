package ai.govbiz.core.combinationreview.client

import ai.govbiz.core._common.exception.AiServiceCallException
import ai.govbiz.core._common.helper.executeAiServiceCall
import ai.govbiz.core.combinationreview.client.dto.AiCombinationReviewPayload
import ai.govbiz.core.combinationreview.client.dto.AiCombinationReviewRequest
import ai.govbiz.core.combinationreview.client.dto.AiReviewConfigurationPayload
import ai.govbiz.core.combinationreview.client.exception.AiCombinationReviewClientException
import ai.govbiz.core.combinationreview.client.exception.AiCombinationReviewClientException.Reason
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import tools.jackson.databind.ObjectMapper

@Component
class AiCombinationReviewClient(@param:Qualifier("aiServiceRestClient") private val client: RestClient, private val json: ObjectMapper) {
    fun configuration(): AiReviewConfigurationPayload = executeAiServiceCall {
        client.get().uri("/internal/v1/combination-reviews/configuration").retrieve()
            .onStatus({ it.value() != 200 }, { _, _ -> throw AiServiceCallException.unavailable(null) })
            .body(AiReviewConfigurationPayload::class.java)
            ?: throw AiCombinationReviewClientException(Reason.INVALID_RESPONSE)
    }

    fun analyze(request: AiCombinationReviewRequest): AiCombinationReviewPayload = executeAiServiceCall {
        client.post().uri("/internal/v1/combination-reviews/analyze").contentType(MediaType.APPLICATION_JSON)
            .body(request).retrieve()
            .onStatus({ it.value() == 422 }, { _, response ->
                val bytes = response.body.readNBytes(8193)
                val tooLarge = bytes.size <= 8192 && runCatching {
                    json.readTree(bytes).path("detail").path("code").toString() == "\"CONTEXT_TOO_LARGE\""
                }.getOrDefault(false)
                throw AiCombinationReviewClientException(if (tooLarge) Reason.CONTEXT_TOO_LARGE else Reason.INVALID_RESPONSE)
            })
            .onStatus({ it.value() != 200 }, { _, _ -> throw AiServiceCallException.unavailable(null) })
            .body(AiCombinationReviewPayload::class.java)
            ?: throw AiCombinationReviewClientException(Reason.INVALID_RESPONSE)
    }
}
