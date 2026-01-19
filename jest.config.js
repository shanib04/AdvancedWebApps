module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["./src/tests"],
  testMatch: ["**/tests/**/*.test.ts"],
  setupFilesAfterEnv: ["./jest.setup.ts"],
  testTimeout: 30000,
  maxWorkers: 1,
  collectCoverageFrom: ["src/**/comment*.ts", "src/**/post*.ts"],
  coverageDirectory: "coverage",
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },
};
