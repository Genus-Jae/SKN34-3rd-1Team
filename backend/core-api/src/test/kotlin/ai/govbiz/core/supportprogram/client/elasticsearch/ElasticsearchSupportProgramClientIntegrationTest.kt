package ai.govbiz.core.supportprogram.client.elasticsearch

import ai.govbiz.core.supportprogram.client.ai.mapper.SupportProgramIndexDocumentMapper
import ai.govbiz.core.supportprogram.client.elasticsearch.config.ElasticsearchClientProperties
import ai.govbiz.core.supportprogram.client.elasticsearch.dto.ElasticsearchSupportProgramDocumentRequest
import ai.govbiz.core.supportprogram.client.elasticsearch.exception.ElasticsearchClientException
import ai.govbiz.core.supportprogram.client.elasticsearch.mapper.ElasticsearchSupportProgramDocumentMapper
import ai.govbiz.core.supportprogram.helper.SupportProgramTestHelper.catalogProgram
import java.net.URI
import java.nio.file.Path
import java.text.Normalizer
import java.time.Duration
import java.util.UUID
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.testcontainers.containers.GenericContainer
import org.testcontainers.containers.wait.strategy.Wait
import org.testcontainers.images.builder.ImageFromDockerfile
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.springframework.http.MediaType
import org.springframework.web.client.RestClient
import tools.jackson.databind.json.JsonMapper

/** 스텁이 아닌 production Dockerfile의 ES + Nori로 검증합니다. 개발 색인은 접근하지 않습니다. */
@Testcontainers
class ElasticsearchSupportProgramClientIntegrationTest {
    private val json = JsonMapper.builder().build()
    private val rest = RestClient.builder().baseUrl("http://${elasticsearch.host}:${elasticsearch.getMappedPort(9200)}").build()
    private val index = "test-${UUID.randomUUID()}"
    private val client = ElasticsearchSupportProgramClient(rest,
        ElasticsearchClientProperties(URI.create("http://${elasticsearch.host}:${elasticsearch.getMappedPort(9200)}"), index, null, null, null), json)

    @Test
    fun koreanSentencesNormalizeAndRespectCurrentSourceVersionsWithRepeatableIndexing() {
        val old = document("same", "서울의 창업기업을 위한 기술개발 지원사업")
        val updated = document("same", "울산 제조업 공장설비 지원")
        val other = old.copy(id = "OTHER:same", versionId = "b".repeat(64))
        val decomposed = document("nfd", Normalizer.normalize("서울 창업기업 기술개발", Normalizer.Form.NFD))
        client.indexSnapshot(listOf(old, other, decomposed))
        client.indexSnapshot(listOf(old, other, decomposed))
        // 새 버전을 준비해도 이전 공개 버전과 다른 제공처는 덮어쓰지 않습니다.
        client.indexSnapshot(listOf(updated))
        val stored = json.readTree(rest.get().uri("/$index/_doc/${old.versionId}").retrieve().body(String::class.java)!!)
        assertEquals(Normalizer.normalize(old.text, Normalizer.Form.NFC), stored.path("_source").path("text").asString())
        assertEquals(listOf(old.id), client.search("서울에서 창업 지원사업을 찾습니다", listOf(old.reference()), 20))
        assertEquals(emptyList<String>(), client.search("울산", listOf(old.reference()), 20))
        assertEquals(listOf(updated.id), client.search("울산", listOf(updated.reference()), 20))
        assertEquals(setOf(old.id, other.id, decomposed.id),
            client.search("창업기업의 기술개발", listOf(old.reference(), other.reference(), decomposed.reference()), 20).toSet())
        assertEquals(emptyList<String>(), client.search("!!!🙂", listOf(old.reference()), 20))
        val count = rest.get().uri("/$index/_count").retrieve().body(String::class.java)!!
        assertEquals(4, json.readTree(count)["count"].asInt())
    }

    @Test
    fun aMissingVersionIsAnErrorEvenWhenTheQueryHasNoMatches() {
        val stored = document("stored", "서울 창업")
        val missing = document("missing", "울산")
        client.indexSnapshot(listOf(stored))
        assertThrows(ElasticsearchClientException::class.java) {
            client.search("없는단어", listOf(stored.reference(), missing.reference()), 20)
        }
        // 정기 복구가 누락만 추가하면 같은 조회가 정상 완료됩니다.
        client.indexSnapshot(listOf(stored, missing))
        assertEquals(emptyList<String>(), client.search("없는단어", listOf(stored.reference(), missing.reference()), 20))
    }

    @Test
    fun sameTextWithDifferentSortTimestampDoesNotOverwriteThePublishedTieBreak() {
        val original = catalogProgram("same", "동일 본문").copy(sortTimestamp = "2020")
        val old = ElasticsearchSupportProgramDocumentMapper.fromCatalog(original)
        val newer = ElasticsearchSupportProgramDocumentMapper.fromCatalog(original.copy(sortTimestamp = "2026"))
        assertEquals(old.contentHash, newer.contentHash)
        assertNotEquals(old.versionId, newer.versionId)
        assertEquals(SupportProgramIndexDocumentMapper.fromCatalog(original).contentHash, old.contentHash)
        client.indexSnapshot(listOf(old))
        client.indexSnapshot(listOf(newer))
        assertEquals(listOf(old.id), client.search("동일", listOf(old.reference()), 20))
    }

    @Test
    fun rejectsAnExistingIndexWithTheWrongAnalyzerAndHandlesAnEmptySnapshot() {
        rest.put().uri("/$index").contentType(MediaType.APPLICATION_JSON).body("""{"mappings":{"properties":{"text":{"type":"text"}}}}""")
            .retrieve().toBodilessEntity()
        assertThrows(ElasticsearchClientException::class.java) { client.indexSnapshot(listOf(document("one", "지원"))) }
        val emptyIndex = "test-${UUID.randomUUID()}"
        val emptyClient = ElasticsearchSupportProgramClient(rest, ElasticsearchClientProperties(null, emptyIndex, null, null, null), json)
        emptyClient.indexSnapshot(emptyList())
    }

    private fun document(id: String, title: String): ElasticsearchSupportProgramDocumentRequest =
        ElasticsearchSupportProgramDocumentMapper.fromCatalog(catalogProgram(id).let { it.copy(program = it.program.copy(title = title, summary = "", targetDescription = "", categories = emptyList(), regions = emptyList())) })

    companion object {
        @Container
        @JvmField
        val elasticsearch = GenericContainer(ImageFromDockerfile().withDockerfile(Path.of("../../infrastructure/elasticsearch/Dockerfile")))
            .withEnv("discovery.type", "single-node")
            .withEnv("xpack.security.enabled", "false")
            .withEnv("xpack.ml.enabled", "false")
            .withEnv("ingest.geoip.downloader.enabled", "false")
            .withEnv("action.auto_create_index", "false")
            .withEnv("ES_JAVA_OPTS", "-Xms512m -Xmx512m")
            .withExposedPorts(9200)
            .waitingFor(Wait.forHttp("/_cluster/health").forStatusCode(200).withStartupTimeout(Duration.ofMinutes(3)))
    }
}
