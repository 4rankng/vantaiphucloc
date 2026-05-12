The current ghep chuyen based on N:M is not correct concept.

The core of ghep chuyen is to match  one (container, cont type) with route(pickup point, drop off point) from chuyen da di
with one (container, cont type) with route(pickup point, drop off point) from don hang

currently in business, one chuyen da di may have multiple containers, one don hang refer to one container only
the website must based on total number of containers in one chuyen da di
to decide how many don hang can match

if chuyen da di has 2 containers, then user cannot tick 3 don hang for matching
if chuyen da di has 1 container, then user can tick only 1 don hang for matching

currently I can see you allow user to tick multiple don hang and all can match to one chuyen da di (where only one container)
which is wrong

also the state of chuyen da di / don hang is either pending or matched, I am not sure what is use case for completed
we should simply to two state only, pending and matched, and add more if there is compelling use case

we should update integration tests to handle all issues I mention in this requiremnt

System & Logic Update: Container-Based Matching Validation
Objective:

Refactor the matching logic (ghep chuyen) to shift from an unrestricted N:M relationship to a strict capacity-based constraint driven by the physical container count of the "Chuyen Da Di" (Trip).

1. Core Business Logic Refinement

Capacity Constraint: A match is not between a Trip and an Order, but between a specific container slot on a Trip and an Order.

Validation Rule: The number of Orders (Don Hang) selected for matching must be less than or equal to the total number of Containers within a single Trip (Chuyen Da Di).

Example A: If Trip A has 1 Container, the system must block the user from selecting >1 Order.

Example B: If Trip B has 2 Containers, the system allows matching with exactly 1 or 2 Orders, but prevents selecting 3.

Route Matching: Validation must ensure the (Container Type, Pickup Point, Drop-off Point) of the Trip matches the requirements of the Don Hang.

2. UI/UX Requirements

Selection Logic: Implement a dynamic counter or validator on the matching interface. If the user exceeds the container capacity of the selected Trip, the "Match" button should be disabled, and a validation error should appear (e.g., "Trip capacity exceeded: This trip only supports X container(s)").

State Management: Simplify the entity states to a binary system to reduce complexity:

PENDING: Available for matching.

MATCHED: Successfully paired and locked.

Note: Remove COMPLETED unless a specific legal or financial audit trail requirement is identified.

3. Integration Testing Requirements
Update the integration test suite to cover the following scenarios:

Positive Test: Successfully matching 2 Orders to a 2-Container Trip.

Negative Test (Over-capacity): Attempting to match 2 Orders to a 1-Container Trip (Expect: 422 Unprocessable Entity or Validation Error).

State Transition Test: Verify that once a match is made, both the Trip and Order statuses transition from PENDING to MATCHED and are no longer available in the "Pending" pool.

Route Integrity Test: Verify that matching fails if the Pickup/Drop-off points do not align between the Trip container and the Order.

Summary of the Change
Current (Wrong): 1 Trip (N containers) → Can match Infinite Orders.

Proposed (Correct): 1 Trip (X containers) → Can match maximum X Orders.
