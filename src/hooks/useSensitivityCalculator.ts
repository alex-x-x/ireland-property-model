import { useState, useEffect, useRef } from 'react';
import { SimulationConfig } from '../engine/types';
import { computeSensitivityMatrix, SensitivityRow } from '../engine/sensitivity';
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
  horizonMonths: number = 60,
  debounceMs: number = 150
): UseSensitivityCalculatorResult {
  const [gridData, setGridData] = useState<SensitivityRow[]>(() =>
    computeSensitivityMatrix(config, horizonMonths)
  );
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  const workerRef = useRef<Worker | null>(null);
  const currentRequestIdRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            const fallbackGrid = computeSensitivityMatrix(config, horizonMonths);
            setGridData(fallbackGrid);
          } catch {
            // Ignore fallback error
          }
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

  // Dispatch calculation when config or horizon changes
  useEffect(() => {
    setIsCalculating(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const requestId = ++currentRequestIdRef.current;

      if (workerRef.current) {
        const message: SensitivityWorkerRequest = {
          type: 'COMPUTE_MATRIX',
          requestId,
          config,
          horizonMonths,
        };
        workerRef.current.postMessage(message);
      } else {
        // Synchronous fallback if no worker is available
        const result = computeSensitivityMatrix(config, horizonMonths);
        if (requestId === currentRequestIdRef.current) {
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
  }, [config, horizonMonths, debounceMs]);

  return { gridData, isCalculating };
}
