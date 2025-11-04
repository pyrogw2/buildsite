# Trait Batching Implementation Plan

## Overview
Split the 972 traits into 10 batches of ~97 traits each, process them in parallel with staggered starts (like we did for skills).

## Performance Goals

### Current (1 worker)
- 972 traits × ~0.5s per trait = ~486s (8.1 minutes)
- Actual observed: ~10 minutes (with wiki delays)

### With Batching (10 workers)
- 10 batches of ~97 traits each
- ~97 traits × ~0.5s per trait = ~48s per batch
- All running in parallel = **~1-2 minutes total**

### Overall Pipeline Performance
- API fetching: ~30 seconds
- Skills (9 professions parallel): ~4-5 minutes
- Traits (10 batches parallel): ~1-2 minutes
- **Total: ~5-7 minutes** (down from original 30+ minutes!)

## Code Changes Needed

### 1. Update Enrichment Section in `fetch-static-data.js` (around line 226)

#### Current Approach
```javascript
// Single trait enrichment task
const traitTask = enrichTraitsWithSplits(traits, { delay: 500 });
enrichmentTasks.push(traitTask);
```

#### New Approach
```javascript
// Split traits into batches
const TRAIT_BATCH_SIZE = 100; // ~97 traits per batch for 972 total
const traitBatches = [];
for (let i = 0; i < traits.length; i += TRAIT_BATCH_SIZE) {
  traitBatches.push(traits.slice(i, i + TRAIT_BATCH_SIZE));
}

// Create parallel trait enrichment tasks
for (let batchIndex = 0; batchIndex < traitBatches.length; batchIndex++) {
  const batch = traitBatches[batchIndex];
  const startDelay = workerIndex * 100;
  workerIndex++;

  console.log(`  [Traits/Batch${batchIndex + 1}] Starting enrichment of ${batch.length} traits (delay: ${startDelay}ms)...`);

  const task = (async () => {
    await new Promise(resolve => setTimeout(resolve, startDelay));

    const startTime = Date.now();
    console.log(`  [Traits/Batch${batchIndex + 1}] Worker started at ${new Date().toISOString().split('T')[1]}`);

    const enriched = await enrichTraitsWithSplits(batch, {
      delay: 500,
      logProgress: false,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const stats = getSplitStats(enriched);
    console.log(`  ✓ [Traits/Batch${batchIndex + 1}] Completed in ${elapsed}s - ${stats.withAnySplit}/${batch.length} traits have competitive splits (PvE: ${stats.withPve}, PvP: ${stats.withPvp}, WvW: ${stats.withWvw})`);

    return { type: 'traits', batchIndex, enriched };
  })();

  enrichmentTasks.push(task);
}
```

### 2. Update Results Processing (around line 260)

#### Current Approach
```javascript
if (result.type === 'traits') {
  traits = result.enriched;
}
```

#### New Approach
```javascript
// Collect trait batches during result processing
const traitResults = [];

// In the results loop:
if (result.type === 'traits') {
  traitResults.push(result);
} else if (result.profession) {
  skillsByProfession[result.profession] = result.enriched;
}

// After the loop, merge all trait batches back together in order
if (traitResults.length > 0) {
  traitResults.sort((a, b) => a.batchIndex - b.batchIndex);
  traits = traitResults.flatMap(r => r.enriched);
}
```

### 3. Update Console Messages

Change from:
```javascript
console.log('Running 10 parallel workers: 9 professions × skills + traits...');
```

To:
```javascript
console.log('Running 19 parallel workers: 9 professions × skills + 10 trait batches...');
```

## Testing Checklist

After implementation, verify:

- [ ] All 972 traits are processed (check final count in metadata)
- [ ] No duplicate traits in final output
- [ ] Trait order doesn't matter for functionality
- [ ] Completion times show parallel execution (all batches finish within ~2 minutes)
- [ ] Console output shows all 10 batches starting with staggered delays
- [ ] Console output shows all 10 batches completing
- [ ] Final data files are valid JSON
- [ ] Skills still work correctly (not affected by trait changes)

## Optional Enhancements

### Command-Line Flags
- Add `--trait-batch-size=N` flag to control batch size
- Allow disabling trait batching with `--no-trait-batching`

### Logging Improvements
- Log individual batch completion times to verify parallelization
- Add summary showing min/max/avg batch completion times
- Export logs per batch to separate files

### Alternative Batching Strategies
- Consider profession-based trait batching instead of arbitrary splits
- Could group traits by specialization for better cache locality
- Adaptive batch sizing based on system resources

## Files to Modify

- `/home/will/gw2/buildsite/scripts/fetch-static-data.js`
  - Lines ~226-230: Add trait batching logic
  - Lines ~260-270: Update results merging logic
  - Line ~165: Update worker count message

## Implementation Notes

1. **Batch Size Selection**: 100 traits per batch gives us 10 batches (972 ÷ 100 ≈ 9.7), which matches our skill worker count for consistency.

2. **Worker Staggering**: Continue using 100ms stagger between worker starts to avoid overwhelming the wiki server.

3. **Result Ordering**: Traits are sorted by ID in the original array, so we preserve order by sorting batches by `batchIndex` before merging.

4. **Error Handling**: Each batch runs independently, so if one batch fails, others continue. Consider adding error tracking per batch.

5. **Memory Usage**: 10 concurrent workers will use more memory, but with ~97 traits per batch (vs 972 in single worker), peak memory per worker is actually lower.

## Rollback Plan

If issues arise:
1. Revert to single trait worker by commenting out batch creation loop
2. Use git to restore previous version: `git checkout HEAD -- scripts/fetch-static-data.js`
3. Original working version is preserved in git history

## Future Optimizations

- **Worker Pooling**: Reuse workers after skills complete to start trait batches
- **Dynamic Batching**: Adjust batch size based on CPU core count
- **Progress Bar**: Add real-time progress tracking across all workers
- **Checkpointing**: Save intermediate results to resume on failure
