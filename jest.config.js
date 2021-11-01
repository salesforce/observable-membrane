module.exports = {
    testEnvironment: "jsdom",
    preset: "ts-jest",
    globals: {
        "ts-jest": {
            diagnostics: false
        }
    },
    coverageThreshold: {
        global: {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100
        }
    }
};
