from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

CONTRACT_VERSION = "application-preparation-interpret-v1"


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
    serviceField: Literal["CONSULTING", "TECHNICAL_SUPPORT", "MARKETING"]
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
