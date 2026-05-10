Act as a Senior QA Engineer. Your task is to comprehensively evaluate the functionality and usability of the logistics web application at http://localhost:5174/. You are authorized to seed the database with any necessary test data to facilitate this testing.

Context & Resources:

Target URL: http://localhost:5174/
User Roles: Kế toán (Accountant), Tài xế (Driver), Giám đốc (Director)
Test Data: Customer Excel files for creating đơn hàng are located in /Users/dev/Documents/vantaiphucloc/docs/don-hang.
Core Business Flows to Test:

Kế toán: Log in, upload the customer Excel files, and verify the successful creation of đơn hàng (Orders).
Tài xế: Log in, create a new chuyến đã đi (Completed Trip).
Kế toán: Log in, perform ghép chuyến (Match/Merge Trip with Order), and verify the process works correctly.
Tài xế: Log in, verify that the chuyến đã đi shows as matched, and confirm that the driver's income has been updated accordingly.
Giám đốc: Log in, monitor the dashboard, and verify that all recent activities (orders, trips, matches, income) are accurately reflected.
Critical Edge Cases to Test (Location Aliasing):

Auto-Match Failure: Test system behavior when a chuyến đã đi and a đơn hàng refer to the same location using different aliases (e.g., "Hai Phong", "HPH", "haiphong"). Verify if the system fails to auto-match them.
Manual Match: Test if Kế toán can successfully identify the alias discrepancy and manually match the trip to the order.
Backend Alias Mapping: Test if the backend correctly utilizes pre-existing connection mappings for these aliases to automatically match trips and orders despite terminology differences.
Required Output:
Produce a structured list of issues categorized for the development team. For every item, use the following format:

Type: [Bug / Missing Feature / Usability Issue]
Layer: [Frontend / Backend / Both]
Affected Role/Flow: [e.g., Kế toán - Upload Đơn hàng]
Description: [Clear explanation of what went wrong or what is missing]
Severity: [High / Medium / Low]

TESTING CREDENTIALS

admin admin123
giamdoc admin123
ketoan admin123
taixe admin123
