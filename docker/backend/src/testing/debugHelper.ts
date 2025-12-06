/**
 * Enhanced debugging helper for LLM-based tests
 * Provides detailed debug information for both passing and failing tests
 */

export interface TestDebugInfo {
  testName: string;
  input: string;
  actualResponse?: string;
  judgeReasoning?: string;
  judgeConfidence?: number;
  context?: any;
  passed: boolean;
}

/**
 * Enhanced assertion function that provides debug info for HTML test reports
 * Shows information for both passing and failing tests
 */
export function assertJudgeResultWithDebug(
  judgeResult: any,
  testName: string,
  input: string,
  context?: any,
  showPassingTests: boolean = true
) {
  const debugInfo: TestDebugInfo = {
    testName,
    input,
    actualResponse: judgeResult.actualResponse,
    judgeReasoning: judgeResult.reasoning,
    judgeConfidence: judgeResult.confidence,
    context,
    passed: judgeResult.pass
  };

  // Always log to console for developer debugging
  console.log(`\n=== ${judgeResult.pass ? 'TEST SUCCESS' : 'TEST FAILURE'} DEBUG (${testName}) ===`);
  console.log('User Input:', input);
  console.log('Actual LLM Response:', judgeResult.actualResponse);
  console.log('Judge Reasoning:', judgeResult.reasoning);
  console.log('Judge Confidence:', judgeResult.confidence);
  if (context?.history) {
    console.log('Context History:', JSON.stringify(context.history, null, 2));
  }
  console.log('================================================================\n');

  // For failing tests, throw error with debug info for HTML report
  if (!judgeResult.pass) {
    let debugMessage = `Test failed: ${judgeResult.reasoning}\n\nDEBUG INFO:\nUser Input: "${input}"\nLLM Response: "${judgeResult.actualResponse}"\nJudge Confidence: ${judgeResult.confidence}`;

    if (context?.history) {
      debugMessage += `\nContext History: ${JSON.stringify(context.history)}`;
    }

    throw new Error(debugMessage);
  }

  // For passing tests, force debug info into HTML reports by creating a controlled assertion
  if (showPassingTests && judgeResult.pass) {
    // Create detailed debug info
    const passDebugInfo = `✅ TEST PASSED: ${testName}\n\nDEBUG INFO:\nUser Input: "${input}"\nLLM Response: "${judgeResult.actualResponse}"\nJudge Reasoning: ${judgeResult.reasoning}\nJudge Confidence: ${judgeResult.confidence}`;

    // Output to console for immediate visibility
    console.warn(`✅ SUCCESS: ${testName} - ${judgeResult.reasoning} (Confidence: ${judgeResult.confidence})`);
    console.error(`SUCCESS_DEBUG_INFO: ${passDebugInfo}`);
    console.info(`✅ PASSED: ${testName}`);

    // FORCE HTML INCLUSION: The fundamental issue is that Jest HTML reporters only show
    // detailed info for FAILED tests. For passing tests, we need to work within this limitation.
    // The console output we're generating is the best we can do with standard Jest HTML reporters.
    //
    // Note: The console.warn and console.error above will be captured in test runner output,
    // but Jest HTML reporters by design only show failure details in the HTML itself.
  }
}

/**
 * Simplified version for tests that don't have judge results
 */
export function logTestDebugInfo(
  testName: string,
  input: string,
  response: string,
  passed: boolean,
  additionalInfo?: any
) {
  console.log(`\n=== ${passed ? 'TEST SUCCESS' : 'TEST FAILURE'} DEBUG (${testName}) ===`);
  console.log('User Input:', input);
  console.log('System Response:', response);
  if (additionalInfo) {
    console.log('Additional Info:', JSON.stringify(additionalInfo, null, 2));
  }
  console.log('================================================================\n');
}