package ai.govbiz.core.applicationpreparation.client.ai

import ai.govbiz.core._common.exception.AiServiceCallException
import ai.govbiz.core._common.helper.executeAiServiceCall
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiApplicationPreparationConfigurationPayload
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiApplicationPreparationInterpretPayload
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiApplicationPreparationInterpretRequest
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiApplicationFormDiscoveryPayload
import ai.govbiz.core.applicationpreparation.client.ai.dto.AiApplicationFormDiscoveryRequest
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.http.MediaType
import org.springframework.http.client.ClientHttpResponse
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import tools.jackson.databind.ObjectMapper

@Component
class AiApplicationPreparationClient(
    @param:Qualifier("aiServiceRestClient") private val client: RestClient,
    private val json: ObjectMapper,
) {
    fun configuration(): AiApplicationPreparationConfigurationPayload = executeAiServiceCall {
        client.get().uri("/internal/v1/application-preparations/configuration").retrieve()
            .onStatus({ it.value() != 200 }, { _, _ -> throw AiServiceCallException.unavailable(null) })
            .body(AiApplicationPreparationConfigurationPayload::class.java)
            ?: throw AiServiceCallException.invalidResponse("Application preparation configuration was empty", null)
    }

    fun interpret(request: AiApplicationPreparationInterpretRequest): AiApplicationPreparationInterpretPayload = executeAiServiceCall {
        client.post().uri("/internal/v1/application-preparations/interpret")
            .contentType(MediaType.APPLICATION_JSON).body(request).retrieve()
            .onStatus({ it.value() == 503 }, { _, response ->
                if (readErrorCode(response) == "APPLICATION_PREPARATION_FAILED") {
                    throw AiServiceCallException.invalidResponse("Application preparation response failed validation", null)
                }
                throw AiServiceCallException.unavailable(null)
            })
            .onStatus({ it.value() == 504 }, { _, _ -> throw AiServiceCallException.timeout(null) })
            .onStatus({ it.value() != 200 }, { _, _ -> throw AiServiceCallException.unavailable(null) })
            .body(AiApplicationPreparationInterpretPayload::class.java)
            ?: throw AiServiceCallException.invalidResponse("Application preparation response was empty", null)
    }

    fun discoveryConfiguration(): AiApplicationPreparationConfigurationPayload = executeAiServiceCall {
        client.get().uri("/internal/v1/application-preparations/discovery/configuration").retrieve()
            .onStatus({ it.value() != 200 }, { _, _ -> throw AiServiceCallException.unavailable(null) })
            .body(AiApplicationPreparationConfigurationPayload::class.java)
            ?: throw AiServiceCallException.invalidResponse("Application form discovery configuration was empty", null)
    }

    fun discover(request: AiApplicationFormDiscoveryRequest): AiApplicationFormDiscoveryPayload = executeAiServiceCall {
        client.post().uri("/internal/v1/application-preparations/discovery")
            .contentType(MediaType.APPLICATION_JSON).body(request).retrieve()
            .onStatus({ it.value() == 503 }, { _, response ->
                if (readErrorCode(response) == "APPLICATION_PREPARATION_FAILED") {
                    throw AiServiceCallException.invalidResponse("Application form discovery response failed validation", null)
                }
                throw AiServiceCallException.unavailable(null)
            })
            .onStatus({ it.value() == 504 }, { _, _ -> throw AiServiceCallException.timeout(null) })
            .onStatus({ it.value() != 200 }, { _, _ -> throw AiServiceCallException.unavailable(null) })
            .body(AiApplicationFormDiscoveryPayload::class.java)
            ?: throw AiServiceCallException.invalidResponse("Application form discovery response was empty", null)
    }

    private fun readErrorCode(response: ClientHttpResponse): String? {
        val bytes = response.body.readNBytes(8193)
        if (bytes.size > 8192) return null
        return runCatching { json.readTree(bytes).path("detail").path("code").asString() }.getOrNull()
    }
}
