package ai.govbiz.core.combinationreview.client

import ai.govbiz.core._common.exception.AiServiceCallException
import ai.govbiz.core.combinationreview.client.dto.AiCombinationReviewRequest
import ai.govbiz.core.combinationreview.client.exception.AiCombinationReviewClientException
import ai.govbiz.core.combinationreview.client.exception.AiCombinationReviewClientException.Reason
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.restclient.test.autoconfigure.RestClientTest
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.*
import org.springframework.test.web.client.response.MockRestResponseCreators.*
import org.springframework.web.client.RestClient
import tools.jackson.databind.ObjectMapper

/** Reads the exact fixtures also validated by AI Service's producer tests. */
@RestClientTest(AiCombinationReviewClient::class)
@Import(AiCombinationReviewClientTest.Config::class)
class AiCombinationReviewClientTest {
    @Autowired private lateinit var client: AiCombinationReviewClient
    @Autowired private lateinit var server: MockRestServiceServer
    @Autowired private lateinit var json: ObjectMapper

    @Test
    fun sendsAndReadsTheSharedInternalHttpContract() {
        val body = resource("contract-request.json")
        val response = resource("contract-response.json")
        server.expect(requestTo("http://ai.test/internal/v1/combination-reviews/analyze")).andExpect(method(HttpMethod.POST))
            .andExpect(content().json(body)).andRespond(withSuccess(response, MediaType.APPLICATION_JSON))
        val result = client.analyze(json.readValue(body, AiCombinationReviewRequest::class.java))
        assertEquals("test-model", result.model)
        assertEquals("E0", result.pairs.first().stages.first().citations.first().evidenceId)
        server.verify()
    }

    @Test
    fun retrievesModelAndPromptMetadataWithoutCallingAnalyze() {
        server.expect(requestTo("http://ai.test/internal/v1/combination-reviews/configuration")).andExpect(method(HttpMethod.GET))
            .andRespond(withSuccess("""{"contractVersion":"combination-review-v1","model":"test-model","promptVersion":"sha256:test"}""", MediaType.APPLICATION_JSON))
        assertEquals("test-model", client.configuration().model)
        server.verify()
    }

    @Test
    fun rejectsUnavailableOrOversizedResponses() {
        val request = json.readValue(resource("contract-request.json"), AiCombinationReviewRequest::class.java)
        server.expect(requestTo("http://ai.test/internal/v1/combination-reviews/analyze")).andRespond(withStatus(HttpStatus.UNPROCESSABLE_CONTENT)
            .body("""{"detail":{"code":"CONTEXT_TOO_LARGE"}}""").contentType(MediaType.APPLICATION_JSON))
        assertEquals(Reason.CONTEXT_TOO_LARGE, assertThrows(AiCombinationReviewClientException::class.java) { client.analyze(request) }.reason)
        server.verify()
    }

    @Test
    fun schemaValidationFailureIsNotMisreportedAsSourceSizeOverflow() {
        val request = json.readValue(resource("contract-request.json"), AiCombinationReviewRequest::class.java)
        server.expect(requestTo("http://ai.test/internal/v1/combination-reviews/analyze")).andRespond(withStatus(HttpStatus.UNPROCESSABLE_CONTENT)
            .body("""{"detail":[{"type":"missing","loc":["body","programs"]}]}""").contentType(MediaType.APPLICATION_JSON))
        assertEquals(Reason.INVALID_RESPONSE, assertThrows(AiCombinationReviewClientException::class.java) { client.analyze(request) }.reason)
    }

    @Test
    fun rejectsRedirectInsteadOfTreatingItsBodyAsSuccess() {
        server.expect(requestTo("http://ai.test/internal/v1/combination-reviews/configuration")).andRespond(withStatus(HttpStatus.FOUND))
        assertThrows(AiServiceCallException::class.java) { client.configuration() }
    }

    private fun resource(name: String) = requireNotNull(javaClass.getResourceAsStream("/combinationreview/$name")).bufferedReader().use { it.readText() }
    @TestConfiguration(proxyBeanMethods = false)
    class Config {
        @Bean("aiServiceRestClient")
        fun restClient(builder: RestClient.Builder): RestClient = builder.baseUrl("http://ai.test").build()
    }
}
