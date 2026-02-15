# Running Evaluations in Dexter

This guide explains how to run automated evaluations (evals) to measure the quality and accuracy of Dexter's agent responses.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Understanding the Evaluation System](#understanding-the-evaluation-system)
5. [Running Evaluations](#running-evaluations)
6. [Interpreting Results](#interpreting-results)
7. [The Evaluation Dataset](#the-evaluation-dataset)
8. [How It Works](#how-it-works)
9. [LangSmith Integration](#langsmith-integration)
10. [Customizing Evaluations](#customizing-evaluations)
11. [Troubleshooting](#troubleshooting)

---

## Overview

Dexter's evaluation system:
- ✅ Tests the agent against a curated dataset of 236 financial questions
- ✅ Uses **LLM-as-judge** (GPT-5.2) to evaluate answer correctness
- ✅ Provides real-time progress feedback with a terminal UI
- ✅ Logs results to LangSmith for tracking and analysis
- ✅ Supports sampling for quick tests during development

### What Gets Evaluated?

The evaluation tests Dexter's ability to:
- **Retrieve financial data** from SEC filings and financial APIs
- **Analyze market trends** and company performance
- **Answer complex questions** requiring multiple tool calls
- **Provide accurate numerical data** with proper formatting
- **Synthesize information** from multiple sources

---

## Prerequisites

### 1. Environment Setup

You need the following environment variables configured:

```bash
# Required: OpenAI API key for running the agent and evaluator
OPENAI_API_KEY=sk-...

# Optional: LangSmith API key for logging results (recommended)
LANGSMITH_API_KEY=lsv2_...

# Optional: Other API keys for tools
EXA_API_KEY=...           # For web search
PERPLEXITY_API_KEY=...    # Alternative search
TAVILY_API_KEY=...        # Alternative search
```

**Note:** The evaluation system uses **GPT-5.2** by default. You can modify the model in [src/evals/run.ts](src/evals/run.ts) if needed.

### 2. Install Dependencies

Ensure all dependencies are installed:

```bash
bun install
```

### 3. LangSmith Account (Optional but Recommended)

LangSmith provides:
- 📊 Detailed trace logs for each evaluation
- 📈 Aggregate metrics and trends over time
- 🔍 Debugging tools for failed evaluations
- 📉 Comparison between different runs

**Sign up:** https://smith.langchain.com

After signing up, copy your API key and add it to `.env`:

```bash
LANGSMITH_API_KEY=lsv2_pt_your_key_here
```

---

## Quick Start

### Run All Evaluations (236 questions)

```bash
bun run src/evals/run.ts
```

This will:
1. Load all 236 questions from the dataset
2. Run Dexter agent on each question
3. Evaluate each answer using GPT-5.2 as a judge
4. Display real-time progress in the terminal
5. Log results to LangSmith (if configured)

**Expected duration:** ~30-60 minutes (depending on tool usage per question)

### Run Sample Evaluation (Quick Test)

For development and quick testing, run a random sample:

```bash
# Test with 10 random questions
bun run src/evals/run.ts --sample 10

# Test with 5 questions
bun run src/evals/run.ts --sample 5

# Test with 50 questions
bun run src/evals/run.ts --sample 50
```

**Expected duration:** ~3-5 minutes for 10 questions

---

## Understanding the Evaluation System

### Architecture

```
┌─────────────────┐
│  Dataset        │ finance_agent.csv (236 questions)
│  236 Questions  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Evaluation     │ run.ts (orchestrator)
│  Runner         │
└────────┬────────┘
         │
         ├──────────────────┐
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│  Target         │  │  Evaluator      │
│  (Dexter Agent) │  │  (GPT-5.2)      │
│                 │  │                 │
│  Runs agent on  │  │  Compares agent │
│  each question  │  │  answer to      │
│                 │  │  expected answer│
└────────┬────────┘  └────────┬────────┘
         │                    │
         └──────────┬─────────┘
                    ▼
         ┌─────────────────┐
         │  LangSmith      │
         │  (Logging)      │
         └─────────────────┘
                    │
                    ▼
         ┌─────────────────┐
         │  Terminal UI    │
         │  (Ink/React)    │
         └─────────────────┘
```

### Components

1. **[run.ts](src/evals/run.ts)** - Main evaluation orchestrator
2. **[EvalApp.tsx](src/evals/components/EvalApp.tsx)** - Terminal UI component (React Ink)
3. **[finance_agent.csv](src/evals/dataset/finance_agent.csv)** - Dataset with 236 Q&A pairs
4. **Target function** - Wraps Dexter agent to answer questions
5. **Correctness evaluator** - LLM-as-judge using GPT-5.2

---

## Running Evaluations

### Basic Usage

```bash
# Full evaluation (all questions)
bun run src/evals/run.ts

# Sample evaluation (quick test)
bun run src/evals/run.ts --sample 10
```

### During Development

When working on improvements:

1. **Before making changes:**
   ```bash
   bun run src/evals/run.ts --sample 20
   # Note the accuracy score
   ```

2. **Make your changes** to tools, prompts, or agent logic

3. **After making changes:**
   ```bash
   bun run src/evals/run.ts --sample 20
   # Compare the new accuracy score
   ```

4. **Run full evaluation** when satisfied:
   ```bash
   bun run src/evals/run.ts
   # Get comprehensive accuracy metrics
   ```

### Terminal UI During Evaluation

While running, you'll see:

```
Dexter Eval • finance_agent

Evaluating ████████░░░░░░░░░░░░ 40% (6/15)

⠋ Evaluating: How has Netflix's Average Revenue Per Paying User Changed...

Stats ─────────────────────────────────────
✓ Correct:   4 (80.0%)
✗ Incorrect: 1 (20.0%)
⏱ Avg time:  18.3s per question
⏱ Elapsed:   1m 32s

Recent Results ────────────────────────────
✓ [1.0] How has US Steel addressed its planned merger...
✓ [1.0] How has Netflix's (NASDAQ: NFLX) Average Revenue...
✗ [0.0] Did TJX beat or miss its Q4 FY 2025 pre-tax...
  └─ Missing specific BPS calculation
✓ [1.0] How large was the range for AMD's revenue...
```

---

## Interpreting Results

### During Execution

The UI shows:
- **Progress bar** - Visual progress (e.g., 40% complete)
- **Current question** - Question being evaluated with spinner
- **Stats** - Running accuracy, success rate, and timing
- **Recent results** - Last 5 results with ✓/✗ indicators

### Final Summary

After completion:

```
═══════════════════════════════════════════════════════════════════
EVALUATION COMPLETE
═══════════════════════════════════════════════════════════════════
Experiment: dexter-eval-lq8x3k9
Examples evaluated: 236
Average correctness score: 82.6%

Results by question:
──────────────────────────────────────────────────────────────────
✓ [1.0] How has US Steel addressed its planned merger with Nippon...
✓ [1.0] How has Netflix's (NASDAQ: NFLX) Average Revenue Per Pay...
✗ [0.0] Did TJX beat or miss its Q4 FY 2025 pre-tax margin guida...
    Missing specific BPS calculation in answer
✓ [1.0] How large was the range (in % terms) for AMD's revenue g...
...

──────────────────────────────────────────────────────────────────
View full results: https://smith.langchain.com
```

### Understanding Scores

Each question receives a **binary score**:
- **1.0** = Correct (answer contains key information)
- **0.0** = Incorrect (answer missing key facts or wrong)

The evaluator uses GPT-5.2 to compare:
- **Expected answer** (from dataset)
- **Actual answer** (from Dexter)

Minor differences in wording are acceptable as long as the core facts are correct.

---

## The Evaluation Dataset

### Location
[src/evals/dataset/finance_agent.csv](src/evals/dataset/finance_agent.csv)

### Format

```csv
Question,Answer,Question Type,Expert time (mins),Rubric
"How has US Steel addressed...","The proposed merger between...",Market Analysis,30,"[...]"
"How has Netflix's Revenue...","2019: 10.82, 2020: 10.91...",Trends,15,"[...]"
```

### Dataset Statistics

- **Total questions:** 236
- **Question types:**
  - Market Analysis
  - Trends
  - Beat or Miss
  - Complex Retrieval
  - Financial Metrics
  - Company Information

### Question Difficulty

Questions are designed to test:
1. **Simple retrieval** - Single fact from recent 10-K
2. **Multi-step analysis** - Combining data from multiple sources
3. **Numerical calculations** - Computing percentages, deltas, BPS
4. **Time-series data** - Tracking metrics over multiple years
5. **Complex reasoning** - Synthesizing information

**Expert time estimates:** 10-30 minutes per question (for human analysts)

---

## How It Works

### 1. CSV Parsing

The evaluation runner loads the CSV dataset and parses it:

```typescript
// Handles multi-line quoted fields
const examples = parseCSV(csvContent);
// Returns: [{ inputs: { question }, outputs: { answer } }, ...]
```

### 2. Sampling (Optional)

If `--sample N` is provided:

```typescript
// Randomly shuffle and take first N examples
examples = shuffleArray(examples).slice(0, sampleSize);
```

### 3. Agent Execution (Target Function)

For each question:

```typescript
async function target(inputs: { question: string }): Promise<{ answer: string }> {
  const agent = Agent.create({ model: 'gpt-5.2', maxIterations: 10 });
  let answer = '';

  for await (const event of agent.run(inputs.question)) {
    if (event.type === 'done') {
      answer = event.answer;
    }
  }

  return { answer };
}
```

The agent:
- Receives the question
- Executes up to 10 iterations (tool calls)
- Uses available tools (web_search, browser, financial tools)
- Returns the final answer

### 4. Correctness Evaluation (LLM-as-Judge)

After the agent answers:

```typescript
async function correctnessEvaluator({ outputs, referenceOutputs }) {
  const prompt = `You are evaluating the correctness of an AI assistant's answer.

  Expected Answer: ${expectedAnswer}
  Actual Answer: ${actualAnswer}

  Provide:
  - score: 1 if correct (key info present), 0 if incorrect
  - comment: brief explanation`;

  const result = await structuredLlm.invoke(prompt);
  return { key: 'correctness', score: result.score, comment: result.comment };
}
```

Uses GPT-5.2 with structured output (Zod schema) to ensure consistent scoring.

### 5. LangSmith Logging

Each evaluation is logged to LangSmith:

```typescript
await client.createRun({
  name: 'dexter-eval-run',
  run_type: 'chain',
  inputs: example.inputs,
  outputs,
  project_name: experimentName,
  extra: {
    evaluation: { score, comment },
    reference_outputs: example.outputs,
  },
});
```

### 6. Progress Events

The evaluation runner is an **async generator** that yields events:

```typescript
type EvalProgressEvent =
  | { type: 'init'; total: number; datasetName: string }
  | { type: 'question_start'; question: string }
  | { type: 'question_end'; question: string; score: number; comment: string }
  | { type: 'complete'; experimentName: string };
```

The UI component consumes these events and updates the display in real-time.

---

## LangSmith Integration

### Viewing Results in LangSmith

1. Go to https://smith.langchain.com
2. Navigate to **Projects**
3. Find your experiment (e.g., `dexter-eval-lq8x3k9`)
4. View:
   - Individual traces for each question
   - Aggregate metrics (average score, p50, p90)
   - Failed evaluations with explanations
   - Tool usage patterns

### Experiment Naming

Each evaluation run creates a unique experiment:

```typescript
const experimentName = `dexter-eval-${Date.now().toString(36)}`;
```

This allows you to:
- Compare different runs
- Track improvements over time
- A/B test changes

### Dataset Management

**Full evaluations** reuse the same dataset:
```
Dataset name: dexter-finance-eval
```

**Sample evaluations** create new datasets:
```
Dataset name: dexter-finance-eval-sample-10-1708012345
```

This prevents polluting the main dataset with partial runs.

---

## Customizing Evaluations

### Change the LLM Model

Edit [src/evals/run.ts](src/evals/run.ts):

```typescript
// Target function (agent)
const agent = Agent.create({
  model: 'claude-sonnet-4', // Change model here
  maxIterations: 10
});

// Evaluator (judge)
const llm = new ChatOpenAI({
  model: 'gpt-4o', // Change evaluator model
  apiKey: process.env.OPENAI_API_KEY,
});
```

### Adjust Max Iterations

```typescript
const agent = Agent.create({
  model: 'gpt-5.2',
  maxIterations: 15  // Increase for complex questions
});
```

### Modify Evaluator Prompt

Edit the correctness evaluator prompt in [run.ts](src/evals/run.ts):

```typescript
const prompt = `You are evaluating...

[Customize evaluation criteria here]

Expected Answer: ${expectedAnswer}
Actual Answer: ${actualAnswer}

Provide:
- score: 1 if correct, 0 if incorrect
- comment: brief explanation`;
```

### Add Custom Metrics

You can add additional evaluators:

```typescript
async function lengthEvaluator({ outputs }) {
  const answer = outputs?.answer as string;
  return {
    key: 'answer_length',
    score: answer.length,
    comment: `Answer has ${answer.length} characters`,
  };
}

// Run both evaluators
const correctnessResult = await correctnessEvaluator({...});
const lengthResult = await lengthEvaluator({...});
```

### Create a Custom Dataset

1. Create a new CSV file in `src/evals/dataset/`:

```csv
Question,Answer
"What is Apple's market cap?","$3.2 trillion as of Feb 2025"
"What is Microsoft's PE ratio?","36.5 as of Q4 2024"
```

2. Update the CSV path in [run.ts](src/evals/run.ts):

```typescript
const csvPath = path.join(__dirname, 'dataset', 'my_custom_dataset.csv');
```

---

## Troubleshooting

### Common Issues

#### 1. Missing API Keys

**Error:**
```
Error: OPENAI_API_KEY is not set
```

**Solution:**
```bash
# Add to .env file
OPENAI_API_KEY=sk-...
```

#### 2. LangSmith Connection Failed

**Error:**
```
Failed to create dataset: Unauthorized
```

**Solution:**
```bash
# Add LangSmith API key to .env
LANGSMITH_API_KEY=lsv2_pt_...
```

Or run without LangSmith by commenting out the logging code.

#### 3. Agent Timeout

**Error:**
```
Agent execution timed out after 120s
```

**Solution:**
Increase the timeout or max iterations in [Agent.create()](src/agent/agent.ts).

#### 4. CSV Parsing Error

**Error:**
```
Error parsing CSV: Unexpected format
```

**Solution:**
Ensure the CSV file:
- Has headers: `Question,Answer,Question Type,Expert time (mins),Rubric`
- Uses proper quoting for multi-line fields
- Has UTF-8 encoding

#### 5. Low Accuracy Scores

If you're getting unexpectedly low scores:

1. **Review failed evaluations** in LangSmith
2. **Check tool availability** - Are all required tools working?
3. **Verify API keys** - Do you have keys for web_search, financial tools?
4. **Test individual questions:**
   ```bash
   # Run the agent manually on a failed question
   bun run start
   # Type the question and see what happens
   ```

---

## Performance Tips

### Speed Up Evaluations

1. **Use sampling** for development:
   ```bash
   bun run src/evals/run.ts --sample 10
   ```

2. **Use a faster model** for quick tests:
   ```typescript
   const agent = Agent.create({ model: 'gpt-4o-mini' });
   ```

3. **Reduce max iterations**:
   ```typescript
   const agent = Agent.create({ maxIterations: 5 });
   ```

4. **Run parallel evaluations** (advanced):
   Modify the runner to process multiple questions concurrently.

### Reduce Costs

1. **Use sampling** instead of full runs during development
2. **Use cheaper models** (gpt-4o-mini, claude-haiku) for testing
3. **Disable tools** that cost money (web_search) for non-essential tests
4. **Cache LangSmith results** - reuse previous runs when code hasn't changed

---

## Best Practices

### During Development

1. **Start with small samples**:
   ```bash
   bun run src/evals/run.ts --sample 5
   ```

2. **Run full evaluation before commits**:
   ```bash
   bun run src/evals/run.ts
   ```

3. **Track baseline metrics**:
   - Record accuracy before making changes
   - Compare after changes to ensure no regression

4. **Use LangSmith**:
   - Log all evaluation runs
   - Review failed cases to understand why
   - Track improvements over time

### Creating New Evaluations

1. **Add realistic questions** to the dataset
2. **Include edge cases** (missing data, ambiguous questions)
3. **Provide clear expected answers**
4. **Test the question manually** first to ensure it's answerable
5. **Run evaluation** to get baseline before changes

---

## Example Workflow

### Scenario: Improving Financial Tool Accuracy

1. **Establish baseline**:
   ```bash
   bun run src/evals/run.ts --sample 20
   # Result: 75% accuracy
   ```

2. **Identify failure patterns** in LangSmith:
   - Failed questions related to SEC filings
   - Agent not using `read_filings` tool correctly

3. **Make improvements**:
   - Update tool description in [src/tools/read-filings.ts](src/tools/read-filings.ts)
   - Improve prompt in [src/agent/prompts.ts](src/agent/prompts.ts)

4. **Test with sample**:
   ```bash
   bun run src/evals/run.ts --sample 20
   # Result: 85% accuracy (+10 points!)
   ```

5. **Run full evaluation**:
   ```bash
   bun run src/evals/run.ts
   # Result: 83% accuracy
   ```

6. **Review and iterate**:
   - Check which questions still fail
   - Make further improvements
   - Repeat until satisfied

---

## Related Files

| File | Purpose |
|------|---------|
| [src/evals/run.ts](src/evals/run.ts) | Main evaluation orchestrator |
| [src/evals/components/EvalApp.tsx](src/evals/components/EvalApp.tsx) | Terminal UI (React Ink) |
| [src/evals/components/EvalProgress.tsx](src/evals/components/EvalProgress.tsx) | Progress bar component |
| [src/evals/components/EvalStats.tsx](src/evals/components/EvalStats.tsx) | Live stats display |
| [src/evals/components/EvalRecentResults.tsx](src/evals/components/EvalRecentResults.tsx) | Recent results list |
| [src/evals/components/EvalCurrentQuestion.tsx](src/evals/components/EvalCurrentQuestion.tsx) | Current question display |
| [src/evals/dataset/finance_agent.csv](src/evals/dataset/finance_agent.csv) | 236 financial Q&A pairs |

---

## Additional Resources

- **LangSmith Documentation:** https://docs.smith.langchain.com/
- **LangChain Evaluation Guide:** https://python.langchain.com/docs/guides/evaluation
- **Dexter Agent Documentation:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Tool Development Guide:** [src/tools/README.md](src/tools/README.md) (if exists)

---

## FAQ

### Q: Can I run evaluations without LangSmith?

**A:** Yes! The evaluation will work without LangSmith, but results won't be logged. You'll still see the terminal UI with accuracy scores.

### Q: How long does a full evaluation take?

**A:** Approximately 30-60 minutes for all 236 questions. This varies based on:
- Model speed
- Number of tool calls per question
- API rate limits

### Q: Can I pause and resume an evaluation?

**A:** No, evaluations run to completion. Use `--sample` for shorter runs during development.

### Q: What if an evaluation fails midway?

**A:** The results logged to LangSmith are saved. You can review partial results there. Restart the evaluation to continue.

### Q: Can I compare two different models?

**A:** Yes! Run evaluations with different models and compare the experiment results in LangSmith.

### Q: How do I add new questions?

**A:** Edit [finance_agent.csv](src/evals/dataset/finance_agent.csv) and add rows:
```csv
"My new question","Expected answer",Question Type,20,"[]"
```

Then run the evaluation again.

---

**Last Updated:** 2026-02-14
**Version:** 1.0.0
