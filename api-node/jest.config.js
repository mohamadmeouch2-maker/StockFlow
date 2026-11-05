/** Jest settings (guide 5.1). ts-jest lets Jest run the TypeScript test files directly. */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  transform: { "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }] },
};
