import { defineModel } from "@nodude/code";

export default defineModel("{{Name}}", {
  schema: {
    name: { type: "String", required: true },
    active: { type: "Boolean", default: true },
  },
  timestamps: true,
  roles: {
    create: ["user", "admin"],
    read: ["*"],
    update: ["owner", "admin"],
    delete: ["admin"],
  },
});
