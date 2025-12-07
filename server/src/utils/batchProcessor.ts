// server/src/utils/batchProcessor.ts

/**
 * Batch processing utilities for parallel job processing
 * Enables concurrent processing with rate limiting
 */

/**
 * Process items in parallel batches
 * @param items - Array of items to process
 * @param batchSize - Number of items to process concurrently
 * @param processFn - Async function to process each item
 * @param delayMs - Delay between batches in milliseconds
 * @returns Array of results
 */
export async function processBatch<T, R>(
    items: T[],
    batchSize: number,
    processFn: (item: T, index: number) => Promise<R>,
    delayMs: number = 0
): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(items.length / batchSize);

        console.log(`  Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`);

        // Process batch in parallel
        const batchResults = await Promise.all(
            batch.map((item, batchIndex) => {
                const globalIndex = i + batchIndex;
                return processFn(item, globalIndex);
            })
        );

        results.push(...batchResults);

        // Add delay between batches if specified (for rate limiting)
        if (delayMs > 0 && i + batchSize < items.length) {
            console.log(`  Waiting ${delayMs}ms before next batch...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    return results;
}

/**
 * Process items in parallel batches with error handling
 * Failed items are collected and can be retried
 * @param items - Array of items to process
 * @param batchSize - Number of items to process concurrently
 * @param processFn - Async function to process each item
 * @param delayMs - Delay between batches in milliseconds
 * @returns Object with successful results and failed items
 */
export async function processBatchWithErrors<T, R>(
    items: T[],
    batchSize: number,
    processFn: (item: T, index: number) => Promise<R>,
    delayMs: number = 0
): Promise<{
    results: R[];
    errors: Array<{ item: T; index: number; error: Error }>;
}> {
    const results: R[] = [];
    const errors: Array<{ item: T; index: number; error: Error }> = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(items.length / batchSize);

        console.log(`  Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`);

        // Process batch in parallel with individual error handling
        const batchPromises = batch.map(async (item, batchIndex) => {
            const globalIndex = i + batchIndex;
            try {
                const result = await processFn(item, globalIndex);
                return { success: true, result, item, index: globalIndex };
            } catch (error) {
                return {
                    success: false,
                    error: error as Error,
                    item,
                    index: globalIndex
                };
            }
        });

        const batchResults = await Promise.all(batchPromises);

        // Separate successful results from errors
        batchResults.forEach(result => {
            if (result.success) {
                results.push(result.result);
            } else {
                errors.push({
                    item: result.item,
                    index: result.index,
                    error: result.error
                });
            }
        });

        // Add delay between batches if specified
        if (delayMs > 0 && i + batchSize < items.length) {
            console.log(`  Waiting ${delayMs}ms before next batch...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    return { results, errors };
}

/**
 * Calculate optimal delay between batches based on rate limit
 * @param rateLimitPerMinute - Maximum requests per minute
 * @param batchSize - Number of concurrent requests
 * @returns Delay in milliseconds
 */
export function calculateBatchDelay(
    rateLimitPerMinute: number,
    batchSize: number
): number {
    // Calculate time per batch in milliseconds
    const timePerBatch = (60 * 1000 * batchSize) / rateLimitPerMinute;

    // Add 10% buffer for safety
    return Math.ceil(timePerBatch * 1.1);
}
