import { DimensionalAnalysis } from '../../models/analysis.model';

export const SCORING_WEIGHTS: Record<keyof DimensionalAnalysis, number> = {
  qualificationMatch: 0.15,
  capabilityConfidence: 0.15,
  situationalStability: 0.05,
  rewardPotential: 0.1,
  cultureFit: 0.15,
  careerTrajectory: 0.1,
  compensationFit: 0.1,
  learningVelocity: 0.1,
  techStackModernity: 0.1,
};
