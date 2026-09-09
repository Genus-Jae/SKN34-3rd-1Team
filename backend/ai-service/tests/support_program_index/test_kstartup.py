import pytest
from pydantic import ValidationError

from app.support_program_index.models import (
    IndexedDocumentIdentity,
    SupportProgramIndexBatchRequest,
    SupportProgramIndexPruneRequest,
    SupportProgramIndexSearchRequest,
)
from app.support_program_index.service import SupportProgramIndexError, _point_id
from .conftest import document, identity


@pytest.mark.anyio
async def test_same_original_id_and_text_stay_distinct_across_bizinfo_and_kstartup(index_environment):
    service, stub = index_environment
    documents = [document(f"{source}:174321", "서울 AI 창업기업 사업화 지원")
                 for source in ("BIZINFO", "KSTARTUP")]

    await service.index_batch(SupportProgramIndexBatchRequest(documents=documents))
    assert documents[0].content_hash == documents[1].content_hash
    assert _point_id(documents[0]) != _point_id(documents[1])
    stored, _ = await service.qdrant_client.scroll(service.collection_name, limit=10)
    assert {point.payload["id"]: point.payload["sourceCode"] for point in stored} == {
        "BIZINFO:174321": "BIZINFO", "KSTARTUP:174321": "KSTARTUP",
    }

    result = await service.search(SupportProgramIndexSearchRequest(
        query="서울 AI", eligibleDocuments=[identity(item) for item in documents], limit=20,
    ))
    assert {match.id for match in result.matches} == {item.id for item in documents}

    only_kstartup = await service.search(SupportProgramIndexSearchRequest(
        query="서울 AI", eligibleDocuments=[identity(documents[1])], limit=20,
    ))
    assert [(match.id, match.content_hash) for match in only_kstartup.matches] == [
        (documents[1].id, documents[1].content_hash),
    ]
    # 재사용한 질의 임베딩도 이번 요청의 제공처별 허용 목록을 완화하지 않습니다.
    assert len(stub.requests) == 2


@pytest.mark.anyio
async def test_kstartup_prune_preserves_bizinfo_and_search_uses_only_current_allowed_version(index_environment):
    service, _ = index_environment
    bizinfo = document("BIZINFO:174321", "서울 AI 기업마당 지원")
    old = document("KSTARTUP:174321", "서울 AI 이전 모집 공고")
    current = document("KSTARTUP:174321", "부산 제조업 갱신 모집 공고")
    removed = document("KSTARTUP:174322", "서울 AI 삭제된 모집 공고")
    await service.index_batch(SupportProgramIndexBatchRequest(documents=[bizinfo, old, removed]))
    await service.index_batch(SupportProgramIndexBatchRequest(documents=[current]))

    result = await service.search(SupportProgramIndexSearchRequest(
        query="서울 AI", eligibleDocuments=[identity(current)], limit=20,
    ))
    assert [(match.id, match.content_hash) for match in result.matches] == [(current.id, current.content_hash)]
    assert result.matches[0].score == pytest.approx(0)

    await service.prune(SupportProgramIndexPruneRequest(sourceCode="KSTARTUP", documents=[identity(current)]))
    stored, _ = await service.qdrant_client.scroll(service.collection_name, limit=10)
    assert {str(point.id) for point in stored} == {_point_id(bizinfo), _point_id(current)}

    await service.prune(SupportProgramIndexPruneRequest(sourceCode="KSTARTUP", documents=[]))
    stored, _ = await service.qdrant_client.scroll(service.collection_name, limit=10)
    assert {str(point.id) for point in stored} == {_point_id(bizinfo)}


@pytest.mark.anyio
async def test_unready_kstartup_only_blocks_requests_that_include_its_unindexed_version(index_environment):
    service, stub = index_environment
    bizinfo = document("BIZINFO:174321", "서울 AI 기업마당 지원")
    missing = document("KSTARTUP:174321", "서울 AI 아직 색인되지 않은 창업지원")
    await service.index_batch(SupportProgramIndexBatchRequest(documents=[bizinfo]))
    ready_request = SupportProgramIndexSearchRequest(
        query="서울 AI", eligibleDocuments=[identity(bizinfo)], limit=20,
    )

    assert [match.id for match in (await service.search(ready_request)).matches] == [bizinfo.id]
    calls_before = len(stub.requests)
    with pytest.raises(SupportProgramIndexError, match="INDEX_NOT_READY"):
        await service.search(SupportProgramIndexSearchRequest(
            query="서울 AI", eligibleDocuments=[identity(bizinfo), identity(missing)], limit=20,
        ))
    with pytest.raises(SupportProgramIndexError, match="INDEX_NOT_READY"):
        await service.prune(SupportProgramIndexPruneRequest(sourceCode="KSTARTUP", documents=[identity(missing)]))

    assert [match.id for match in (await service.search(ready_request)).matches] == [bizinfo.id]
    assert len(stub.requests) == calls_before
    assert (await service.qdrant_client.count(service.collection_name, exact=True)).count == 1


@pytest.mark.anyio
async def test_kstartup_result_rejects_payload_from_another_source(index_environment):
    service, _ = index_environment
    item = document("KSTARTUP:174321", "서울 AI 창업지원")
    await service.index_batch(SupportProgramIndexBatchRequest(documents=[item]))
    await service.qdrant_client.set_payload(
        service.collection_name, payload={"sourceCode": "BIZINFO"}, points=[_point_id(item)], wait=True,
    )

    with pytest.raises(SupportProgramIndexError, match="INDEX_UNAVAILABLE"):
        await service.search(SupportProgramIndexSearchRequest(
            query="서울 AI", eligibleDocuments=[identity(item)], limit=20,
        ))


@pytest.mark.parametrize("operation", ["search", "prune"])
def test_twenty_thousand_document_contract_keeps_every_identity_and_rejects_overflow(operation):
    # 계약 상한 검증입니다. 20,000건 Qdrant 성능이나 실제 모델 검색 품질 평가는 아닙니다.
    documents = [IndexedDocumentIdentity(
        id=f"{'BIZINFO' if operation == 'search' and index % 2 == 0 else 'KSTARTUP'}:{index}",
        contentHash="a" * 64,
    ) for index in range(20_000)]

    def request_for(values):
        if operation == "search":
            return SupportProgramIndexSearchRequest(query="창업지원", eligibleDocuments=values, limit=20)
        return SupportProgramIndexPruneRequest(sourceCode="KSTARTUP", documents=values)

    request = request_for(documents)
    accepted = request.eligible_documents if operation == "search" else request.documents
    assert len(accepted) == 20_000
    assert accepted[-1].id == "KSTARTUP:19999"
    with pytest.raises(ValidationError):
        request_for([*documents, IndexedDocumentIdentity(id="KSTARTUP:20000", contentHash="b" * 64)])
