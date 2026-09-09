export type FilterChoiceOption = { value: string; label: string }

/** 값과 표시가 같은 목록(지역·분야)을 FilterChoices 선택지로 바꿉니다. */
export function toFilterChoiceOptions(values: readonly string[]): FilterChoiceOption[] {
  return values.map((value) => ({ value, label: value }))
}
