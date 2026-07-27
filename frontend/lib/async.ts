/**
 * Process items in parallel batches with all-or-nothing semantics.
 * If any item in a batch rejects, the entire batch fails immediately.
 * Progress callback fires as each item completes (even within a batch).
 */
export async function parallelBatches<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  onProgress?: (completed: number, total: number) => void,
  batchSize = 3,
): Promise<R[]> {
  const results: R[] = []
  let completed = 0

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)

    // Wrap each item in a function that updates progress on completion
    const batchResults = await Promise.all(
      batch.map(async (item, batchIndex) => {
        const index = i + batchIndex
        const result = await fn(item, index)
        completed++
        onProgress?.(completed, items.length)
        return result
      }),
    )

    results.push(...batchResults)
  }

  return results
}
