import { computeSensitivityMatrix, SensitivityRow } from '../engine/sensitivity';
import { SimulationConfig } from '../engine/types';

export interface SensitivityWorkerRequest {
  type: 'COMPUTE_MATRIX';
  requestId: number;
  config: SimulationConfig;
  horizonMonths: number;
}

export interface SensitivityWorkerResponse {
  type: 'MATRIX_RESULT';
  requestId: number;
  gridData: SensitivityRow[];
}

self.onmessage = (e: MessageEvent<SensitivityWorkerRequest>) => {
  const { type, requestId, config, horizonMonths } = e.data;
  if (type === 'COMPUTE_MATRIX') {
    const gridData = computeSensitivityMatrix(config, horizonMonths);
    const response: SensitivityWorkerResponse = {
      type: 'MATRIX_RESULT',
      requestId,
      gridData,
    };
    self.postMessage(response);
  }
};
