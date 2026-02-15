# Dexter Evaluations - Quick Reference

## Quick Commands

```bash
# Run all 236 questions (30-60 minutes)
bun run src/evals/run.ts

# Run sample of 10 questions (3-5 minutes)
bun run src/evals/run.ts --sample 10

# Run sample of 5 questions (1-2 minutes)
bun run src/evals/run.ts --sample 5

# Run sample of 50 questions (15-20 minutes)
bun run src/evals/run.ts --sample 50
```

---

## Required Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...        # For agent and evaluator (GPT-5.2)

# Optional but recommended
LANGSMITH_API_KEY=lsv2_...   # For logging results

# Optional tool keys
EXA_API_KEY=...              # For web search
PERPLEXITY_API_KEY=...       # For web search
TAVILY_API_KEY=...           # For web search
```

---

## Terminal UI Legend

```
Evaluating ████████░░░░░░░░░░░░ 40% (6/15)

⠋ Evaluating: Question being processed...

Stats ─────────────────────────────────────
✓ Correct:   4 (80.0%)     ← Binary score (1.0 or 0.0)
✗ Incorrect: 1 (20.0%)     ← Answer missing key facts
⏱ Avg time:  18.3s         ← Per question
⏱ Elapsed:   1m 32s         ← Total elapsed

Recent Results ────────────────────────────
✓ [1.0] Question text...    ← Correct answer
✗ [0.0] Question text...    ← Incorrect answer
  └─ Reason for failure      ← Evaluator comment
```

---

## Dataset Information

| Metric | Value |
|--------|-------|
| **Total questions** | 236 |
| **Location** | `src/evals/dataset/finance_agent.csv` |
| **Question types** | Market Analysis, Trends, Beat/Miss, Complex Retrieval |
| **Expert time** | 10-30 minutes per question |
| **Format** | CSV with Question, Answer, Type, Time, Rubric |

---

## Scoring System

| Score | Meaning |
|-------|---------|
| **1.0** | ✓ Correct - Answer contains key information |
| **0.0** | ✗ Incorrect - Missing key facts or wrong |

**Evaluator:** GPT-5.2 (LLM-as-judge)
- Compares actual answer to expected answer
- Minor wording differences are acceptable
- Core facts must match

---

## Common Use Cases

### During Development
```bash
# Quick test before commit
bun run src/evals/run.ts --sample 10

# Make changes, test again
bun run src/evals/run.ts --sample 10

# Full evaluation before merge
bun run src/evals/run.ts
```

### Testing Specific Changes
```bash
# Test tool improvements
bun run src/evals/run.ts --sample 20

# Test prompt changes
bun run src/evals/run.ts --sample 20

# Verify no regression
bun run src/evals/run.ts
```

### A/B Testing Models
```bash
# Baseline with current model
bun run src/evals/run.ts --sample 50
# Note: 82% accuracy

# Edit run.ts to use different model
# Run again
bun run src/evals/run.ts --sample 50
# Note: 85% accuracy → Model B is better!
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/evals/run.ts` | Main runner (modify model, max iterations) |
| `src/evals/components/EvalApp.tsx` | Terminal UI |
| `src/evals/dataset/finance_agent.csv` | 236 Q&A pairs |

---

## LangSmith URLs

- **Dashboard:** https://smith.langchain.com
- **Your experiments:** Projects → `dexter-eval-*`
- **Individual traces:** Click on any run to see tool calls
- **Compare runs:** Select multiple experiments

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Missing API key | Add `OPENAI_API_KEY=...` to `.env` |
| LangSmith auth error | Add `LANGSMITH_API_KEY=...` to `.env` |
| Low accuracy | Check tool availability, review failures in LangSmith |
| Agent timeout | Increase `maxIterations` in `run.ts` |
| CSV parse error | Check file encoding (UTF-8), proper quoting |

---

## Interpreting Results

### Good Accuracy Ranges

| Score | Interpretation |
|-------|---------------|
| **90%+** | Excellent - Production ready |
| **80-89%** | Good - Minor improvements needed |
| **70-79%** | Fair - Significant improvements needed |
| **<70%** | Poor - Major issues, investigate failures |

### Common Failure Patterns

- **Missing tool calls** - Agent not using right tools
- **Incorrect data extraction** - Tool parsing issues
- **Incomplete answers** - Agent stopping too early
- **Wrong calculations** - Math errors in response
- **Formatting issues** - Not matching expected format

---

## Performance Tips

### Speed Up Evaluations

1. Use `--sample` for quick tests
2. Use faster model (gpt-4o-mini)
3. Reduce `maxIterations` to 5
4. Disable expensive tools for testing

### Reduce Costs

1. Use sampling during development
2. Switch to cheaper models (gpt-4o-mini, claude-haiku)
3. Disable paid tools (web_search)
4. Review LangSmith before full runs

---

## Customization

### Change Agent Model

Edit `src/evals/run.ts`:
```typescript
const agent = Agent.create({
  model: 'claude-sonnet-4',  // Change here
  maxIterations: 10
});
```

### Change Evaluator Model

Edit `src/evals/run.ts`:
```typescript
const llm = new ChatOpenAI({
  model: 'gpt-4o',  // Change here
  apiKey: process.env.OPENAI_API_KEY,
});
```

### Add Custom Questions

Edit `src/evals/dataset/finance_agent.csv`:
```csv
"New question?","Expected answer",Question Type,15,"[]"
```

---

## Example Workflow

```bash
# 1. Establish baseline
bun run src/evals/run.ts --sample 20
# → 75% accuracy

# 2. Make improvements to code

# 3. Test changes
bun run src/evals/run.ts --sample 20
# → 85% accuracy (+10 points!)

# 4. Full evaluation
bun run src/evals/run.ts
# → 83% accuracy (confirmed)

# 5. Review failures in LangSmith
# 6. Iterate and improve
```

---

## Architecture Overview

```
Dataset (236 Q&A) → Runner → Agent (Dexter)
                          ↓
                    Evaluator (GPT-5.2)
                          ↓
                    LangSmith (Logging)
                          ↓
                    Terminal UI (Ink)
```

---

## Events Flow

```
init          → Dataset loaded, show total count
question_start → Display current question with spinner
question_end   → Update progress, show score, add to recent
complete       → Show final summary with all results
```

---

## Useful LangSmith Queries

Once in LangSmith, you can:

- **Filter by score:** Show only failed evaluations (score = 0)
- **Search by question:** Find specific question types
- **Compare runs:** Side-by-side comparison of experiments
- **Export data:** Download CSV of all results
- **Trace debugging:** Click any run to see full agent trace

---

## Best Practices

1. ✅ Always run sample (`--sample 10`) before full run
2. ✅ Use LangSmith to track improvements over time
3. ✅ Review failed evaluations to understand issues
4. ✅ Run full evaluation before merging PRs
5. ✅ Document baseline accuracy in commit messages
6. ✅ Create custom datasets for specific features
7. ✅ A/B test different models and configurations

---

## Next Steps

- 📖 Read full guide: [RUNNING_EVALS.md](RUNNING_EVALS.md)
- 🏗️ See architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
- 🔧 Customize tools: [src/tools/](src/tools/)
- 📊 View results: https://smith.langchain.com

---

**Quick Links:**
- Main eval runner: [src/evals/run.ts](src/evals/run.ts)
- Dataset: [src/evals/dataset/finance_agent.csv](src/evals/dataset/finance_agent.csv)
- Terminal UI: [src/evals/components/EvalApp.tsx](src/evals/components/EvalApp.tsx)

**Last Updated:** 2026-02-14
