import { createApp } from "@nodude/code";

const app = await createApp({
  database: { type: "sqlite", filename: "./dev.db" },
  auth: { secret: process.env.JWT_SECRET || "dev-secret" },
  models: [
    {
      name: "User",
      auth: true,
      schema: {
        name: { type: "String", required: true },
        email: { type: "String", required: true, unique: true },
        password: { type: "String", required: true, private: true },
        role: { type: "String", default: "user", enum: ["user", "admin"] },
      },
    },
  ],
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
