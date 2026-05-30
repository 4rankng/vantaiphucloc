export type PriceField =
  | 'f20Price'
  | 'f40Price'
  | 'e20Price'
  | 'e40Price'
  | 'f20DriverSalary'
  | 'f40DriverSalary'
  | 'e20DriverSalary'
  | 'e40DriverSalary'

export const SALARY_TINT = 'color-mix(in srgb, var(--theme-status-warning) 5%, transparent)'
export const SALARY_BORDER = '1px solid color-mix(in srgb, var(--theme-status-warning) 22%, transparent)'
export const SALARY_FIELDS: PriceField[] = [
  'f20DriverSalary',
  'f40DriverSalary',
  'e20DriverSalary',
  'e40DriverSalary',
]

export const COL = {
  index: 40,
  client: 240,
  pickup: 140,
  dropoff: 140,
  price: 130,
  salary: 130,
  workType: 120,
} as const

export const FARE_GROUP_WIDTH = COL.price * 4
export const SALARY_GROUP_WIDTH = COL.salary * 4
export const LEFT_GROUP_WIDTH = COL.index + COL.client + COL.pickup + COL.dropoff
export const RIGHT_GROUP_WIDTH = COL.workType
export const TABLE_MIN_WIDTH = LEFT_GROUP_WIDTH + FARE_GROUP_WIDTH + SALARY_GROUP_WIDTH + RIGHT_GROUP_WIDTH
