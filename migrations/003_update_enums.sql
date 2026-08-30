-- PDR-4.1: Update activity_type enum
-- The old enum had: focus, repetition, timer, evidence, hybrid
-- The new enum needs: repetition, focus, timer, visual_result, external_result, simple

-- Step 1: Add new values to the existing enum
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'visual_result';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'external_result';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'simple';

-- Step 2: Update verification_mode enum
-- Old: self_reported, timed, focus, pose, repetition, interactive, evidence, hybrid
-- New: adds activity_signal, review, photo
ALTER TYPE verification_mode ADD VALUE IF NOT EXISTS 'activity_signal';
ALTER TYPE verification_mode ADD VALUE IF NOT EXISTS 'review';
ALTER TYPE verification_mode ADD VALUE IF NOT EXISTS 'photo';

-- Step 3: Update confidence_class enum
-- Old: high, medium, insufficient
-- New: high, medium, low
ALTER TYPE confidence_class ADD VALUE IF NOT EXISTS 'low';
