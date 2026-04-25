# Expense Amount Calculator Design

## Summary

Add lightweight inline calculation to the expense amount field in the create/edit expense form.
The user can compose an expression directly in the amount input and use helper operator buttons under the field.
The form shows a computed result as a clickable hint, which can replace the expression with the final amount.

## Goal

Reduce context switching when creating an expense that is composed from several values.
The user should be able to add and subtract amounts without leaving the form.

## Non-Goals

- No separate calculator modal or expanded keypad
- No support for `*`, `/`, brackets, or spaces
- No changes to expense data model or backend API
- No support for storing expressions; only the final numeric amount is saved

## Scope

The change applies to the expense amount field in [src/features/miniapps/expense/expenses/components/ExpenseFormModal.tsx](/Users/ashpak/Pet/family-app-react/src/features/miniapps/expense/expenses/components/ExpenseFormModal.tsx).

First version supports:

- typing expressions such as `1200+350-99`
- helper buttons `+` and `-` under the input
- computed result shown as a hint under the input
- click on the result hint to replace the expression with the final amount

## UX

### Default State

The amount field keeps its current role as the primary input.
Under the field, show a compact row with two operator buttons: `+` and `-`.
The controls are always visible to make the feature discoverable without adding another entry point.

### Expression Input

The user can type a plain number or an expression that combines positive numbers with `+` and `-`.
Pressing `+` or `-` under the input appends that operator to the current expression.
If the current value already ends with an operator, pressing another operator does nothing.

### Computed Hint

When the input contains a valid expression with at least one operator, show a hint under the field:

`Итог: 1451`

The hint is interactive.
Pressing it replaces the current expression with the computed final amount, after which the field behaves as a normal numeric field again.

### Trailing Operator

If the user ends the expression with `+` or `-`, the trailing operator is trimmed before computing the result.

Examples:

- `1200+350+` resolves to `1550`
- `1200-50-` resolves to `1150`

This normalization applies to both preview and save behavior.

### Invalid Manual Input

Only digits, one decimal separator inside a number, and operators `+` and `-` are supported.
Decimal separator behavior should stay aligned with the current field behavior.
If the user manually enters an unsupported pattern and the expression cannot be resolved, the computed hint is hidden and saving is blocked until the input becomes valid again.

## Validation Rules

- spaces are not supported
- expression must start with a digit
- two operators in a row are not valid
- button input must never create two operators in a row
- decimal separator handling stays compatible with the current amount input
- trailing `+` or `-` is trimmed before calculation
- the resolved final amount must be a finite positive number
- a plain number without operators is valid input, but does not show the computed hint

## Technical Design

### Amount Parsing

Keep the form state as a string for the amount field.
Introduce a parser/resolver that can handle both plain numeric input and expression input.

The resolver should return enough metadata for UI and save logic, for example:

- raw input
- normalized input
- resolved amount
- whether the input contains an expression
- whether the input is valid for save

The existing numeric parsing logic should remain the base path for plain values.
Expression support should be added as a thin layer around that logic rather than replacing unrelated form behavior.

### Form Integration

The amount input remains the source of truth.
The form uses the resolved numeric amount for:

- save payload
- exchange-rate preview
- save button enablement

The raw string remains visible in the input until the user explicitly clicks the computed hint.

### Operator Buttons

Add a compact action row below the amount field.

- `+` appends `+` when the current value allows it
- `-` appends `-` when the current value allows it

The buttons do not attempt aggressive auto-correction beyond preventing an immediate duplicate operator.

### Result Hint Interaction

Show the hint only when:

- the input contains at least one operator
- the normalized expression resolves successfully

Clicking the hint replaces the input value with the resolved amount string.

## Error Handling

- Invalid expressions do not crash parsing or form rendering
- Invalid expressions hide the computed hint
- Save is blocked when no valid positive amount can be resolved
- Exchange preview uses the resolved numeric amount and stays hidden when no valid amount exists

## Testing

Add coverage for:

- plain numeric amount parsing
- expression parsing with `+`
- expression parsing with `-`
- trimming a trailing operator before calculation
- preventing duplicate operator insertion from helper buttons
- showing the result hint only for valid expressions
- clicking the result hint to replace the input value
- saving an expense with the resolved final amount
- keeping exchange preview tied to the resolved numeric amount

## Rollout Notes

This is a UI-only enhancement on top of the existing amount field behavior.
The persisted expense continues to store only the final numeric amount.
