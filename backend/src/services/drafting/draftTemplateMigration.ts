import type { ContractTemplate } from './templates';

export function migrateTemplateInput(template: ContractTemplate, oldInput: Record<string, string>) {
  const input = Object.fromEntries(
    template.fields
      .filter(
        (field) =>
          oldInput[field.key] !== undefined &&
          (!field.options || field.options.some((option) => option.value === oldInput[field.key])),
      )
      .map((field) => [field.key, oldInput[field.key]]),
  );
  // v1 stored the stage and preconditions as prose; v2 uses a discrete stage.
  // Preserve that prose for review while leaving the new stage at its explicit default.
  if (
    template.code === 'housing_purchase' &&
    template.version >= 2 &&
    oldInput.transactionStage &&
    !input.transactionStage &&
    !input.transactionConditions
  )
    input.transactionConditions = oldInput.transactionStage;
  return input;
}
