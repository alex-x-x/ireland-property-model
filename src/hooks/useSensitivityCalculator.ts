import { useState, useEffect, useRef } from 'react';
import { SimulationConfig } from '../engine/types';
import { computeSensitivityMatrix, SensitivityRow, SensitivityWaitMode } from '../engine/sensitivity';
import { SensitivityWorkerRequest, SensitivityWorkerResponse } from '../workers/sensitivity.worker';

export interface UseSensitivityCalculatorResult {
  gridData: SensitivityRow[];
  isCalculating: boolean;
}

/**
 * Hook to compute the 55-permutation sensitivity matrix off the main thread
 * using a dedicated Web Worker, with debouncing and synchronous fallback.
 */
export function useSensitivityCalculator(
  config: SimulationConfig,
  waitMode: SensitivityWaitMode = 'optimal',
  stockRates?: number[],
  propRates?: number[],
  debounceMs: number = 50
): UseSensitivityCalculatorResult {
  const [gridData, setGridData] = useState<SensitivityRow[]>(() =>
    computeSensitivityMatrix(config, waitMode, stockRates, propRates)
  );
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  const workerRef = useRef<Worker | null>(null);
  const currentRequestIdRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMountRef = useRef<boolean>(true);

  // Keep ref of latest params to avoid stale closures in worker.onerror
  const latestParamsRef = useRef({ config, waitMode, stockRates, propRates });
  latestParamsRef.current = { config, waitMode, stockRates, propRates };

  // Initialize Web Worker once
  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      try {
        const worker = new Worker(
          new URL('../workers/sensitivity.worker.ts', import.meta.url),
          { type: 'module' }
        );

        worker.onmessage = (e: MessageEvent<SensitivityWorkerResponse>) => {
          const { requestId, gridData: resultGrid } = e.data;
          // Discard stale responses if a newer request was dispatched
          if (requestId === currentRequestIdRef.current) {
            setGridData(resultGrid);
            setIsCalculating(false);
          }
        };

        worker.onerror = (_err) => {
          // If worker fails, gracefully fall back to synchronous calculation
          try {
            const fallbackGrid = computeSensitivityMatrix(
              latestParamsRef.current.config,
              latestParamsRef.current.waitMode,
              latestParamsRef.current.stockRates,
              latestParamsRef.current.propRates
            );
            setGridData(fallbackGrid);
          } catch {
            // Ignore fallback error
          }
          workerRef.current = null;
          setIsCalculating(false);
        };

        workerRef.current = worker;
      } catch {
        // Fallback for environments where Web Workers are not supported (e.g. some test environments)
        workerRef.current = null;
      }
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Dispatch calculation when config, waitMode, or custom rates change
  useEffect(() => {
    // Skip duplicate dispatch on initial mount since useState already computed it
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    setIsCalculating(true);
    // Immediately increment request ID to invalidate any currently in-flight responses
    const nextRequestId = ++currentRequestIdRef.current;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (workerRef.current) {
        const message: SensitivityWorkerRequest = {
          type: 'COMPUTE_MATRIX',
          requestId: nextRequestId,
          config,
          waitMode,
          stockRates,
          propRates,
        };
        workerRef.current.postMessage(message);
      } else {
        // Synchronous fallback if no worker is available
        const result = computeSensitivityMatrix(config, waitMode, stockRates, propRates);
        if (nextRequestId === currentRequestIdRef.current) {
          setGridData(result);
          setIsCalculating(false);
        }
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [config, waitMode, stockRates, propRates, debounceMs]);

  return { gridData, isCalculating };
}
