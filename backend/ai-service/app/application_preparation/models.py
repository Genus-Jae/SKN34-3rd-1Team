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
    blockId: str = Field(pattern=r"^D[0-3]-B[0-9]{1,3}$")
    locator: str = Field(min_length=1, max_length=200)
    text: str = Field(min_length=1, max_length=3000)


class DiscoveryDocument(Contract):
    documentIndex: int = Field(ge=0, le=3)
    fileName: str = Field(min_length=1, max_length=300)
    format: Literal["PDF", "HWPX"]
    blocks: list[DiscoveryBlock] = Field(min_length=1, max_length=256)


class DiscoverFormsRequest(Contract):
    contractVersion: Literal["application-form-discovery-v1"]
    sourceCode: Literal["BIZINFO"]
    sourceProgramId: str = Field(pattern=r"^PBLN_[0-9]{1,32}$")
    programTitle: str = Field(min_length=1, max_length=300)
    documents: list[DiscoveryDocument] = Field(min_length=1, max_length=4)

    @model_validator(mode="after")
    def unique_documents_and_blocks(self) -> Self:
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
    evidenceBlockId: str = Field(pattern=r"^D[0-3]-B[0-9]{1,3}$")
    evidenceQuote: str = Field(min_length=1, max_length=300)


class DiscoveredFormSection(Contract):
    sectionKey: str = Field(pattern=r"^[a-z][a-z0-9-]{0,63}$")
    title: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=1000)
    fields: list[DiscoveredFormField] = Field(min_length=1, max_length=20)


class DiscoveredForm(Contract):
    documentIndex: int = Field(ge=0, le=3)
    sections: list[DiscoveredFormSection] = Field(min_length=1, max_length=12)


class FormDiscoverySelection(Contract):
    forms: list[DiscoveredForm] = Field(max_length=4)


def validate_discovery(request: DiscoverFormsRequest, output: FormDiscoverySelection) -> None:
    documents = {item.documentIndex: item for item in request.documents}
    indexes = [item.documentIndex for item in output.forms]
    if len(indexes) != len(set(indexes)) or not set(indexes).issubset(documents):
        raise ValueError("invalid discovered document index")
    for form in output.forms:
        section_keys = [section.sectionKey for section in form.sections]
        if len(section_keys) != len(set(section_keys)):
            raise ValueError("duplicate discovered section")
        blocks = {block.blockId: block for block in documents[form.documentIndex].blocks}
        for section in form.sections:
            field_keys = [field.fieldKey for field in section.fields]
            if len(field_keys) != len(set(field_keys)):
                raise ValueError("duplicate discovered field")
            for field in section.fields:
                block = blocks.get(field.evidenceBlockId)
                if block is None or field.evidenceQuote not in block.text:
                    raise ValueError("discovered field evidence is not an exact source quote")


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
