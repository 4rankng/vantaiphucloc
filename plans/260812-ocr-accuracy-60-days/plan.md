# OCR accuracy — 60-day dashboard window

## Status

Completed

## Scope

Change only the superadmin OCR accuracy card's default query window from 30 to 60 trailing days. The API's existing `days` parameter, other OCR analytics, response contracts, and data-classification rules remain unchanged.

## Acceptance criteria

- The card requests OCR statistics for 60 days when no `days` prop is supplied.
- Its subtitle says `60 ngày gần nhất`.
- A matched OCR record created 31–60 days ago is included in the accuracy response used by the card.

## Validation

- Run the focused frontend lint/build check.
- Run the focused backend OCR statistics test that proves the 60-day parameter includes the historical match.

## Results

- Frontend lint and production build passed.
- Focused OCR accuracy tests passed, including a matched trip created 40 days ago.
