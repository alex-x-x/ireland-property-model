import { computeSensitivityMatrix, SensitivityRow, SensitivityWaitMode } from '../engine/sensitivity';
import { SimulationConfig } from '../engine/types';

export interface SensitivityWorkerRequest {
  type: 'COMPUTE_MATRIX';
  requestId: number;
  config: SimulationConfig;
  waitMode?: SensitivityWaitMode;
  stockRates?: number[];
  propRates?: number[];
}

export interface SensitivityWorkerResponse {
  type: 'MATRIX_RESULT';
  requestId: number;
  gridData: SensitivityRow[];
}

self.onmessage = (e: MessageEvent<SensitivityWorkerRequest>) => {
  const { type, requestId, config, waitMode, stockRates, propRates } = e.data;
  if (type === 'COMPUTE_MATRIX') {
    const gridData = computeSensitivityMatrix(
      config,
      waitMode ?? 'optimal',
      stockRates,
      propRates
    );
    const response: SensitivityWorkerResponse = {
      type: 'MATRIX_RESULT',
      requestId,
      gridData,
    };
    self.postMessage(response);
  }
};
