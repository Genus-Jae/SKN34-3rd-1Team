import re
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

CONTRACT_VERSION = "application-preparation-interpret-v1"
DISCOVERY_CONTRACT_VERSION = "application-form-discovery-v1"


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class FieldOption(Contract):
    fieldKey: str = Field(pattern=r"^[a-z][a-z0-9-]{0,63}$")
    label: str = Field(min_length=1, max_length=100)
    guidance: str = Field(min_length=1, max_length=500)
    required: bool


class ConfirmedFact(Contract):
    fieldKey: str = Field(pattern=r"^[a-z][a-z0-9-]{0,63}$")
    status: Literal["PROVIDED", "UNKNOWN"]
    value: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def status_matches_value(self) -> Self:
        if self.status == "PROVIDED" and (self.value is None or not self.value.strip()):
            raise ValueError("provided fact requires a value")
        if self.status == "UNKNOWN" and self.value is not None:
            raise ValueError("unknown fact cannot have a value")
        return self


class InterpretRequest(Contract):
    contractVersion: Literal["application-preparation-interpret-v1"]
    preparationId: int = Field(gt=0)
    inputRevision: int = Field(gt=0)
    formVersionId: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{0,159}$")
    sectionKey: str = Field(pattern=r"^[a-z][a-z0-9-]{0,63}$")
    serviceField: Literal["GENERAL", "CONSULTING", "TECHNICAL_SUPPORT", "MARKETING"]
    userMessage: str = Field(min_length=1, max_length=4000)
    currentFacts: list[ConfirmedFact] = Field(max_length=20)
    fieldOptions: list[FieldOption] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def unique_allowed_fields(self) -> Self:
        keys = [item.fieldKey for item in self.fieldOptions]
        fact_keys = [item.fieldKey for item in self.currentFacts]
        if len(keys) != len(set(keys)) or len(fact_keys) != len(set(fact_keys)):
            raise ValueError("duplicate field key")
        if not set(fact_keys).issubset(keys):
            raise ValueError("current fact uses an unsupported field")
        return self


class FactSuggestion(Contract):
    fieldKey: str = Field(pattern=r"^[a-z][a-z0-9-]{0,63}$")
    status: Literal["PROVIDED", "UNKNOWN"]
    value: str | None = Field(default=None, max_length=2000)
    evidenceQuote: str = Field(min_length=1, max_length=1000)

    @model_validator(mode="after")
    def status_matches_value(self) -> Self:
        if self.status == "PROVIDED" and (self.value is None or not self.value.strip()):
            raise ValueError("provided suggestion requires a value")
        if self.status == "UNKNOWN" and self.value is not None:
            raise ValueError("unknown suggestion cannot have a value")
        return self


class InterpretationSelection(Contract):
    suggestions: list[FactSuggestion] = Field(max_length=20)
    missingFields: list[str] = Field(max_length=20)
    nextQuestion: str | None = Field(default=None, max_length=300)


class DiscoveryBlock(Contract):
    blockId: str = Field(pattern=r"^D[0-7]-B[0-9]{1,3}$")
    locator: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=1, max_length=3000)


class DiscoveryDocument(Contract):
    documentIndex: int = Field(ge=0, le=7)
    fileName: str = Field(min_length=1, max_length=300)
    format: Literal["PDF", "HWP", "HWPX"]
    blocks: list[DiscoveryBlock] = Field(min_length=1, max_length=256)


class DiscoverFormsRequest(Contract):
    contractVersion: Literal["application-form-discovery-v1"]
    sourceCode: Literal["BIZINFO", "KSTARTUP", "MSIT", "CNTRADE_NOTICE"]
    sourceProgramId: str = Field(min_length=1, max_length=255)
    programTitle: str = Field(min_length=1, max_length=300)
    documents: list[DiscoveryDocument] = Field(min_length=1, max_length=8)

    @model_validator(mode="after")
    def unique_documents_and_blocks(self) -> Self:
        if self.sourceCode == "BIZINFO":
            if re.fullmatch(r"PBLN_[0-9]{1,32}", self.sourceProgramId) is None:
                raise ValueError("invalid BIZINFO source program id")
        elif re.fullmatch(r"[1-9][0-9]{0,254}", self.sourceProgramId) is None:
            raise ValueError("invalid numeric source program id")
        indexes = [item.documentIndex for item in self.documents]
        if len(indexes) != len(set(indexes)):
            raise ValueError("duplicate document index")
        for document in self.documents:
            ids = [block.blockId for block in document.blocks]
            if len(ids) != len(set(ids)):
                raise ValueError("duplicate discovery block")
        return self


class DiscoveredFormField(Contract):
    fieldKey: str = Field(pattern=r"^[a-z][a-z0-9-]{0,63}$")
    label: str = Field(min_length=1, max_length=100)
    guidance: str = Field(min_length=1, max_length=500)
    required: bool
    evidenceBlockId: str = Field(pattern=r"^D[0-7]-B[0-9]{1,3}$")
    evidenceQuote: str = Field(min_length=1, max_length=300)


class DiscoveredFormSection(Contract):
    sectionKey: str = Field(pattern=r"^[a-z][a-z0-9-]{0,63}$")
    title: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=1000)
    fields: list[DiscoveredFormField] = Field(min_length=1, max_length=20)


class DiscoveredForm(Contract):
    documentIndex: int = Field(ge=0, le=7)
    sections: list[DiscoveredFormSection] = Field(min_length=1, max_length=12)


class FormDiscoverySelection(Contract):
    forms: list[DiscoveredForm] = Field(max_length=4)


class FormDiscoveryValidationError(ValueError):
    def __init__(self, reason: str):
        super().__init__(reason)
        self.reason = reason


def _canonical_source_quote(source: str, proposed: str) -> str | None:
    trimmed = proposed.strip()
    if not trimmed:
        return None
    if trimmed in source:
        return trimmed
    parts = re.split(r"\s+", trimmed)
    match = re.search(r"\s+".join(re.escape(part) for part in parts), source)
    if match is None or len(match.group(0)) > 300:
        return None
    return match.group(0)


def _unique_key(key: str, used: set[str]) -> str:
    if key not in used:
        used.add(key)
        return key
    suffix = 2
    while True:
        candidate = f"{key[: 63 - len(str(suffix))]}-{suffix}"
        if candidate not in used:
            used.add(candidate)
            return candidate
        suffix += 1


def validate_discovery(request: DiscoverFormsRequest, output: FormDiscoverySelection) -> None:
    documents = {item.documentIndex: item for item in request.documents}
    merged_forms: dict[int, DiscoveredForm] = {}
    for form in output.forms:
        if form.documentIndex not in documents:
            raise FormDiscoveryValidationError("INVALID_DOCUMENT_INDEX")
        existing = merged_forms.get(form.documentIndex)
        if existing is None:
            merged_forms[form.documentIndex] = form
        else:
            existing.sections.extend(form.sections)
            if len(existing.sections) > 12:
                raise FormDiscoveryValidationError("TOO_MANY_MERGED_SECTIONS")
    output.forms = list(merged_forms.values())
    for form in output.forms:
        section_keys: set[str] = set()
        blocks = {block.blockId: block for block in documents[form.documentIndex].blocks}
        for section in form.sections:
            section.sectionKey = _unique_key(section.sectionKey, section_keys)
            section.title = section.title.strip()
            section.description = section.description.strip()
            if not section.title or not section.description:
                raise FormDiscoveryValidationError("EMPTY_SECTION_TEXT")
            field_keys: set[str] = set()
            for field in section.fields:
                field.fieldKey = _unique_key(field.fieldKey, field_keys)
                block = blocks.get(field.evidenceBlockId)
                if block is None:
                    raise FormDiscoveryValidationError("UNKNOWN_EVIDENCE_BLOCK")
                field.label = field.label.strip()
                field.guidance = field.guidance.strip()
                if not field.label or not field.guidance:
                    raise FormDiscoveryValidationError("EMPTY_FIELD_TEXT")
                canonical_quote = _canonical_source_quote(block.text, field.evidenceQuote)
                if canonical_quote is None:
                    raise FormDiscoveryValidationError("EVIDENCE_QUOTE_MISMATCH")
                field.evidenceQuote = canonical_quote


def validate_selection(request: InterpretRequest, output: InterpretationSelection) -> None:
    allowed = {item.fieldKey for item in request.fieldOptions}
    suggestion_keys = [item.fieldKey for item in output.suggestions]
    if len(suggestion_keys) != len(set(suggestion_keys)) or not set(suggestion_keys).issubset(allowed):
        raise ValueError("invalid suggestion fields")
    if len(output.missingFields) != len(set(output.missingFields)) or not set(output.missingFields).issubset(allowed):
        raise ValueError("invalid missing fields")
    for suggestion in output.suggestions:
        if suggestion.evidenceQuote not in request.userMessage:
            raise ValueError("suggestion evidence is not an exact user quote")
    answered = {item.fieldKey for item in request.currentFacts} | set(suggestion_keys)
    expected_missing = [item.fieldKey for item in request.fieldOptions if item.required and item.fieldKey not in answered]
    if output.missingFields != expected_missing:
        raise ValueError("missing fields do not match the confirmed and proposed facts")
    if bool(expected_missing) != bool(output.nextQuestion and output.nextQuestion.strip()):
        raise ValueError("next question does not match missing fields")
