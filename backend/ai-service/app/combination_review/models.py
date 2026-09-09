from itertools import combinations
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

STAGES = {"APPLICATION", "SELECTION", "COMMITMENT", "AGREEMENT", "EXECUTION", "FUNDING"}
Stage = Literal["APPLICATION", "SELECTION", "COMMITMENT", "AGREEMENT", "EXECUTION", "FUNDING"]
Judgment = Literal["RESTRICTION_APPLIES", "PERMISSION_IN_SCOPE", "NEEDS_FACTS", "INSUFFICIENT_EVIDENCE", "CONFLICTING_EVIDENCE"]
Answer = Literal["YES", "NO", "UNKNOWN"]
CONTRACT_VERSION = "combination-review-v1"


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Participation(Contract):
    applicationSubmitted: Answer
    selected: Answer
    commitmentSubmitted: Answer
    agreementSigned: Answer
    executionStatus: Literal["UNKNOWN", "NOT_STARTED", "IN_PROGRESS", "COMPLETED", "STOPPED"]
    fundingReceived: Answer


class Program(Contract):
    sourceCode: str = Field(pattern=r"^[A-Z][A-Z0-9_]{0,63}$")
    sourceProgramId: str = Field(min_length=1, max_length=255)
    subProgramId: str | None = Field(max_length=255)
    participation: Participation


class EvidenceBlock(Contract):
    id: str = Field(pattern=r"^E[0-9]{1,4}$")
    programIndex: int = Field(ge=0, le=2)
    documentHash: str = Field(pattern=r"^[0-9a-f]{64}$")
    locator: str = Field(min_length=1, max_length=160)
    text: str = Field(min_length=1, max_length=4000)


class AnalyzeRequest(Contract):
    contractVersion: Literal["combination-review-v1"]
    programs: list[Program] = Field(min_length=2, max_length=3)
    asOfDate: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    additionalFacts: str = Field(max_length=8000)
    evidence: list[EvidenceBlock] = Field(min_length=1, max_length=512)
    coverageWarnings: list[str] = Field(max_length=40)

    @model_validator(mode="after")
    def valid_context(self) -> Self:
        identities = [(p.sourceCode, p.sourceProgramId, p.subProgramId) for p in self.programs]
        if len(set(identities)) != len(identities):
            raise ValueError("duplicate programs")
        if len({e.id for e in self.evidence}) != len(self.evidence):
            raise ValueError("duplicate evidence")
        if any(e.programIndex >= len(self.programs) for e in self.evidence):
            raise ValueError("invalid program index")
        if {e.programIndex for e in self.evidence} != set(range(len(self.programs))):
            raise ValueError("missing program evidence")
        if sum(len(e.text) for e in self.evidence) > 120_000 or any(len(w) > 500 for w in self.coverageWarnings):
            raise ValueError("context limit exceeded")
        return self


class CitationSelection(Contract):
    evidenceIndex: int = Field(ge=0, le=511)
    quote: str = Field(min_length=4, max_length=800)


class StageSelection(Contract):
    stage: Stage
    judgment: Judgment
    scope: str = Field(min_length=1, max_length=500)
    explanation: str = Field(min_length=1, max_length=1000)
    questions: list[str] = Field(max_length=5)
    requiresInstitutionConfirmation: bool
    citations: list[CitationSelection] = Field(max_length=8)

    @model_validator(mode="after")
    def bounded_judgment(self) -> Self:
        if any(not q.strip() or len(q) > 300 for q in self.questions):
            raise ValueError("invalid question")
        if self.judgment in {"PERMISSION_IN_SCOPE", "RESTRICTION_APPLIES"}:
            if not self.citations or self.requiresInstitutionConfirmation:
                raise ValueError("definitive judgment requires confirmed evidence")
        if self.judgment == "NEEDS_FACTS" and not self.questions:
            raise ValueError("missing fact questions")
        return self


class PairSelection(Contract):
    firstProgramIndex: int = Field(ge=0, le=1)
    secondProgramIndex: int = Field(ge=1, le=2)
    stages: list[StageSelection] = Field(min_length=6, max_length=6)

    @model_validator(mode="after")
    def all_stages(self) -> Self:
        if self.firstProgramIndex >= self.secondProgramIndex or {s.stage for s in self.stages} != STAGES:
            raise ValueError("invalid pair/stages")
        return self


class AnalysisSelection(Contract):
    summary: str = Field(min_length=1, max_length=1200)
    pairs: list[PairSelection] = Field(min_length=1, max_length=3)
    limitations: list[str] = Field(min_length=1, max_length=12)


def validate_selection(request: AnalyzeRequest, output: AnalysisSelection) -> None:
    expected = set(combinations(range(len(request.programs)), 2))
    actual = [(p.firstProgramIndex, p.secondProgramIndex) for p in output.pairs]
    if len(actual) != len(expected) or set(actual) != expected:
        raise ValueError("missing or duplicate pair")
    if any(not item.strip() or len(item) > 500 for item in output.limitations):
        raise ValueError("invalid limitation")
    for pair in output.pairs:
        for stage in pair.stages:
            for citation in stage.citations:
                if citation.evidenceIndex >= len(request.evidence):
                    raise ValueError("out-of-range citation")
                if citation.quote not in request.evidence[citation.evidenceIndex].text:
                    raise ValueError("citation is not an exact source quote")
