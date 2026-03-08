import { body, param } from "express-validator";

export class ValidationEngine {
  buildRules(schema, requiredFields = []) {
    const rules = [];

    for (const [field, def] of Object.entries(schema)) {
      if (!def || typeof def === "string") continue;
      if (def.private) continue;

      // Only treat a field as required if it's explicitly in requiredFields or has required: true AND is in requiredFields
      const isRequired = requiredFields.includes(field);

      let chain = body(field);

      if (!isRequired) {
        chain = chain.optional({ nullable: true });
      }

      if (def.type === "String" || !def.type) {
        chain = chain
          .isString()
          .withMessage(`${field} must be a string`)
          .trim();
        if (def.minLength)
          chain = chain
            .isLength({ min: def.minLength })
            .withMessage(
              `${field} must be at least ${def.minLength} characters`,
            );
        if (def.maxLength)
          chain = chain
            .isLength({ max: def.maxLength })
            .withMessage(
              `${field} must not exceed ${def.maxLength} characters`,
            );
        if (def.enum)
          chain = chain
            .isIn(def.enum)
            .withMessage(`${field} must be one of: ${def.enum.join(", ")}`);
        if (field === "email")
          chain = chain
            .isEmail()
            .normalizeEmail()
            .withMessage("Invalid email address");
        if (field === "password")
          chain = chain
            .isLength({ min: 6 })
            .withMessage("Password must be at least 6 characters");
      }

      if (def.type === "Number") {
        chain = chain.isNumeric().withMessage(`${field} must be a number`);
        if (def.min !== undefined)
          chain = chain
            .custom((v) => v >= def.min)
            .withMessage(`${field} must be at least ${def.min}`);
        if (def.max !== undefined)
          chain = chain
            .custom((v) => v <= def.max)
            .withMessage(`${field} must not exceed ${def.max}`);
      }

      if (def.type === "Boolean") {
        chain = chain.isBoolean().withMessage(`${field} must be a boolean`);
      }

      if (isRequired) {
        chain = chain.notEmpty().withMessage(`${field} is required`);
      }

      rules.push(chain);
    }

    return rules;
  }

  buildIdRule() {
    return [param("id").notEmpty().withMessage("ID is required")];
  }
}
