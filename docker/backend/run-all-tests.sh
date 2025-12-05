#!/bin/bash

# Generate a timestamp for the test run folder
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
TEST_RUN_FOLDER="./test-reports/test-run_$TIMESTAMP"

# Create the test run folder
mkdir -p "$TEST_RUN_FOLDER"

# Export the folder path for Jest configs to use
export TEST_RUN_FOLDER="$TEST_RUN_FOLDER"

echo "=========================================="
echo "Starting Complete Test Suite"
echo "Test results will be saved in: $TEST_RUN_FOLDER"
echo "=========================================="
echo ""

# Track overall test status
ALL_TESTS_PASSED=true

# Function to run a test suite
run_test_suite() {
    local CONFIG=$1
    local NAME=$2
    local ENV_VARS=$3

    echo "Running $NAME..."
    echo "------------------------------------------"

    if [ -n "$ENV_VARS" ]; then
        eval "$ENV_VARS npx jest --config=$CONFIG"
    else
        npx jest --config=$CONFIG
    fi

    if [ $? -eq 0 ]; then
        echo "✅ $NAME PASSED"
    else
        echo "❌ $NAME FAILED"
        ALL_TESTS_PASSED=false
    fi
    echo ""
}

# Run Unit Tests
run_test_suite "jest.config.unit.js" "Unit Tests"

# Run LLM-as-Judge Tests
run_test_suite "jest.config.llm.js" "LLM-as-Judge Tests" "RUN_LLM_TESTS=true"

# Run AImee Core Feature Tests
run_test_suite "jest.config.core.js" "AImee Core Feature Tests" "RUN_LLM_TESTS=true"

# Run AImee Personality Tests
run_test_suite "jest.config.personality.js" "AImee Personality Tests" "RUN_LLM_TESTS=true"

echo "=========================================="
echo "Test Suite Complete"
echo "=========================================="

# List generated reports
echo ""
echo "Generated test reports:"
ls -la "$TEST_RUN_FOLDER"/*.html 2>/dev/null | awk '{print "  - " $9}'

# Summary
echo ""
if [ "$ALL_TESTS_PASSED" = true ]; then
    echo "✅ All test suites passed!"
    exit 0
else
    echo "❌ Some test suites failed. Check the reports for details."
    exit 1
fi