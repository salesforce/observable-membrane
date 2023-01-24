export default {
    testEnvironment: "jsdom",
    preset: "ts-jest",
    transform: {
        "'^.+\\.ts$'": [
            "ts-jest",
            {
                diagnostics: false
            }
        ]
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
