Feature: AImee Memory and Personalization
AImee should remember useful information across sessions without inventing or misusing memory.
She must separate trip memory from long-term memory and respect user privacy.

##################################################################
SECTION 1 — USER IDENTITY AND NAME MEMORY
##################################################################

Scenario: Storing user name on first session
Given there is no stored profile for the user
And the user greets AImee for the first time
When AImee asks "What should I call you?"
And the user says "Jeff"
Then AImee should store the name "Jeff" using the Memory Agent
And AImee should use "Jeff" in this session when addressing the user

Scenario: Greeting returning user by name
Given the user's name is stored as "Jeff"
And the user starts a new session
When AImee responds to the first greeting
Then AImee should greet the user by name
And AImee should not repeat the first-time onboarding explanation

Scenario: Respecting user refusal to share a name
Given there is no stored profile for the user
And the user greets AImee for the first time
When AImee asks "What should I call you?"
And the user declines to give a name
Then AImee should accept the refusal gracefully
And AImee should not ask for the name again in this session
And AImee should continue normally without using a stored name

##################################################################
SECTION 2 — TRIP MEMORY VS LONG-TERM MEMORY
##################################################################

Scenario: Using trip memory within a session
Given the user is on a road trip with an active route
And the user tells AImee "We only have about two hours today"
When the user later asks "What else can we see today?"
Then AImee should use the two-hour constraint from trip memory
And AImee should suggest options that respect this time limit

Scenario: Clearing trip memory between trips
Given the user completed a trip earlier today
And AImee stored trip-specific details for that route
When the user starts a new trip in a different region
Then AImee should not assume the previous route or stops are still active
And AImee should ask for or infer the new trip context instead

Scenario: Preserving long-term preferences across trips
Given the user has previously preferred scenic overlooks over museums
And this preference is stored in long-term memory
When the user starts a new trip and asks "What should we see around here?"
Then AImee should gently bias suggestions toward scenic locations
And AImee should still respect any explicit request the user gives

##################################################################
SECTION 3 — VISITED MARKERS AND HISTORY
##################################################################

Scenario: Logging a visited marker after departure
Given the user stops at a marker called "Old Depot"
And the user departs that location
When AImee processes the visit
Then AImee should mark "Old Depot" as visited in the user's history

Scenario: Avoiding repeat suggestions for recent visits
Given "Old Depot" is marked as visited for this user
And the user is driving near "Old Depot" again
When the user asks "What should we see nearby?"
Then AImee should not promote "Old Depot" as a primary new suggestion
And AImee may mention it only as a place they have already visited

Scenario: Never inventing visit history
Given "Old Depot" is not recorded as visited in the user's history
When the user asks "Have we been here before?"
Then AImee must not claim that the user has visited "Old Depot"
And AImee should say that she does not have a record of a visit

##################################################################
SECTION 4 — PREFERENCE LEARNING AND PERSONALIZATION
##################################################################

Scenario: Learning preferences from repeated choices
Given the user has chosen small towns and back roads several times
And these choices have been stored as preference signals
When the user asks "What kind of route would you suggest today?"
Then AImee should suggest a route that emphasizes small towns and back roads
And AImee should present it as a preference-based suggestion, not a rule

Scenario: Personalization must not override explicit commands
Given the user has a stored preference for scenic routes
When the user says "Take us the fastest way to the interstate"
Then AImee must prioritize speed over scenic preferences
And AImee must not argue with or override the explicit request

##################################################################
SECTION 5 — PRIVACY AND NO-MEMORY MODE
##################################################################

Scenario: Enabling privacy or no-memory mode
Given the user is concerned about stored data
When the user says "Do not remember anything I say today"
Then AImee should confirm that she will not update long-term memory
And AImee should limit storage to trip memory only for functionality

Scenario: Behavior while privacy mode is active
Given privacy mode is active for this session
And the user shares preferences such as "We love lighthouses"
When the session ends
Then AImee must not store "We love lighthouses" in long-term memory
And AImee must not use that preference in future sessions

Scenario: Disabling privacy or no-memory mode
Given privacy mode is currently active
When the user says "It is fine to remember my trips again"
Then AImee should confirm that long-term memory is re-enabled
And AImee may resume updating long-term preferences and history

##################################################################
SECTION 6 — MEMORY UNCERTAINTY AND HONESTY
##################################################################

Scenario: Acknowledging missing memory gracefully
Given the user asks "Do you remember where we stopped last weekend?"
And there is no stored record for that specific stop
When AImee responds
Then she should say that she does not have that exact stop recorded
And she may offer to help rebuild the memory from the user's description
And she must not pretend to recall details that are not stored

Scenario: Avoiding overconfident personalization
Given AImee has partial or incomplete preference data
When the user asks "What do you think we like best?"
Then AImee should frame preferences as observations, not absolute facts
And she should avoid strong claims that are not clearly supported by memory