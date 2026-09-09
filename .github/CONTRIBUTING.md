# Contributing to Node.js Tutorial

Welcome to the Node.js Tutorial project! We're excited that you're interested in contributing to this educational resource. This document provides guidelines for developers who wish to contribute to the project, outlining the standards and procedures for code contributions, issue reporting, and pull requests to ensure a smooth and effective development process.

Thank you for taking the time to contribute! Every contribution, whether it's reporting a bug, suggesting an enhancement, or submitting code changes, helps improve this tutorial for the Node.js learning community.

## How to Contribute

There are several ways you can contribute to the Node.js Tutorial project:

### Reporting Bugs

If you encounter any bugs or issues while using the tutorial application, please help us by reporting them. To report a bug:

1. **Check existing issues** - Search through existing issues to avoid duplicates
2. **Use the bug report template** - Create a new issue using our bug report template (`.github/ISSUE_TEMPLATE/bug_report.md`)
3. **Provide detailed information** - Include:
   - Node.js version (we recommend v22.16.0 LTS)
   - Express.js version (should be 5.1.0)
   - Operating system and version
   - Steps to reproduce the issue
   - Expected vs. actual behavior
   - Any error messages or logs

### Suggesting Enhancements

We welcome suggestions for new features or improvements to the tutorial application. To suggest an enhancement:

1. **Check existing feature requests** - Review existing issues to avoid duplicates
2. **Use the feature request template** - Create a new issue using our feature request template (`.github/ISSUE_TEMPLATE/feature_request.md`)
3. **Describe your suggestion** - Include:
   - Clear description of the proposed feature
   - Educational value for Node.js learners
   - Implementation considerations
   - Any relevant examples or references

### Pull Requests

Pull requests are the primary method for code contributions. We encourage you to contribute code that:
- Improves the educational value of the tutorial
- Fixes bugs or security issues
- Enhances code quality and readability
- Adds useful comments and documentation

## Getting Started

Follow these step-by-step instructions to set up your local development environment:

### Prerequisites

- **Node.js v22.16.0 LTS** - This tutorial uses the Long Term Support release with codename 'Jod'
- **npm** - Comes bundled with Node.js (version 11.4.1 or later)
- **Git** - For version control

### Setup Instructions

1. **Fork the repository on GitHub**
   - Click the "Fork" button in the top-right corner of the repository page

2. **Clone the forked repository to your local machine**
   ```bash
   FORK_URL="https://github.com/YOUR-USERNAME/YOUR-FORK-NAME.git"
   git clone "$FORK_URL"
   cd "$(basename "$FORK_URL" .git)"
   ```
   Replace the two placeholders with your own values before running the block — copy the exact address from the green **Code** button on your fork's GitHub page. This repository publishes no canonical clone URL (the `repository.url` field in `src/backend/package.json` is empty), so your fork's page is the authoritative source for it. Keep the quotes: an unquoted `<placeholder>` is read by the shell as an input redirection rather than as part of the URL, which is why the address is assigned to `FORK_URL` first. The final `cd` leaves you at the repository root, which is where the next step starts from.

3. **Navigate to the backend directory**
   ```bash
   cd src/backend
   ```

4. **Install the required dependencies using npm**
   ```bash
   npm install
   ```
   This reads the `package.json` file and installs Express.js 5.1.0 and other dependencies.

5. **Optional — create a local environment file to override the defaults**

   This step is not required. The application needs no environment variables to run: `config/index.js` is the only module that reads `process.env`, and every value it reads has a built-in default — port `3000`, host `localhost`, environment `development` and application name `node-tutorial-app`. No `.env` file is committed, and the server starts correctly without one.

   Create one only when you want different values, for example a different port:
   ```bash
   cp .env.example .env
   ```
   `.env` is ignored by Git (see `.gitignore` and `src/backend/.gitignore`) and must never be committed. For a one-off override you do not need a file at all — `PORT=3001 npm run dev` works just as well.

6. **Start the development server**
   ```bash
   npm run dev
   ```
   This uses `nodemon` as configured in `nodemon.json` for automatic server restarts during development.

### Verify Your Setup

After starting the development server, verify everything is working:

1. Open your browser and navigate to `http://localhost:3000/hello`
2. You should see "Hello world" response
3. Check the console for any error messages

## Pull Request Process

Before submitting a pull request, please ensure you follow these guidelines:

### Pre-submission Checklist

1. **Clean up dependencies**
   - Ensure that any install or build dependencies are removed before the end of the layer when doing a build

2. **Update documentation**
   - Update the README.md with details of changes to the interface
   - Include new environment variables, exposed ports, useful file locations and container parameters

3. **Version management**
   - Increase the version numbers in any examples and the README.md to the new version that this Pull Request would represent

4. **Testing requirements**
   - Ensure your code passes all tests by running:
     ```bash
     npm test
     ```
   - Tests are executed using the configuration defined in `jest.config.js`

5. **Code quality standards**
   - Ensure your code adheres to the linting rules defined in `.eslintrc.js`
   - Follow formatting rules specified in `.prettierrc`
   - Between them these two files codify the project's style standard: two-space indentation (`tabWidth: 2` in `.prettierrc`, `indent: ['error', 2, ...]` in `.eslintrc.js`), single quotes (`singleQuote: true` / `quotes: ['error', 'single', ...]`), mandatory semicolons (`semi: true` / `semi: ['error', 'always']`), and an 80-column line width (`printWidth: 80`)
   - ESLint and Prettier are deliberately not declared as dependencies of this project, and neither are the `security`, `node` and `jsdoc` plugins that `.eslintrc.js` references, so the standard is followed by convention rather than enforced by a command. Read both configuration files and match your changes to them by hand before submitting

### Submission Process

1. **Create your pull request**
   - Use the pull request template (`.github/PULL_REQUEST_TEMPLATE.md`)
   - Provide a clear description of your changes
   - Reference any related issues using keywords like "Fixes #123"

2. **CI Pipeline validation**
   - The CI pipeline defined in `.github/workflows/ci.yml` must pass
   - It runs three steps in `src/backend` on Node.js 22.x, and nothing else: `npm ci` installs exactly what the lockfile pins, `npm audit` scans those dependencies, and `npm test` runs the suites with coverage collected and the 90% threshold enforced
   - The audit step runs bare, with no `--audit-level`, so any advisory at any severity fails the job
   - There is no lint or format step: as noted in the checklist above, `.eslintrc.js` and `.prettierrc` are followed by convention, not checked by a command, so run through them by hand instead of expecting CI to catch style

3. **Code review process**
   - A project maintainer reviews your pull request. This repository defines no code-owner file, so GitHub assigns no reviewer automatically — if nobody has picked your pull request up, ask for a review in a comment on it
   - Address any feedback or requested changes
   - Ensure all conversations are resolved before merge

### Branch Naming

Use descriptive branch names that clearly indicate the purpose of your changes:
- `feature/add-error-handling`
- `fix/security-vulnerability`
- `docs/update-readme`
- `test/improve-coverage`

## Coding Standards

This project follows strict coding standards to ensure code quality, maintainability, and educational value:

### Code Style

- **JavaScript Standard**: We use ES2022+ features supported by Node.js v22
- **Async/Await**: Prefer modern async/await syntax over callbacks
- **Error Handling**: Implement comprehensive error handling with proper HTTP status codes
- **Comments**: Include meaningful comments that explain the "why" behind complex logic

### Framework Guidelines

- **Express.js 5.1.0**: Leverage the latest features including automatic promise rejection handling
- **Middleware**: Use Express middleware patterns for request processing
- **Route Organization**: Keep routes simple and focused for educational clarity
- **Security**: Follow security best practices using Helmet.js and input validation

### Performance Considerations

- **Response Time**: Maintain response times under 100ms for the `/hello` endpoint
- **Memory Usage**: Keep memory footprint below 50MB during operation
- **Startup Time**: Ensure server startup completes within 5 seconds

### Educational Value

Remember that this is a tutorial project designed to teach Node.js concepts:
- **Clarity over Complexity**: Choose clear, readable code over complex optimizations
- **Documentation**: Include extensive comments explaining Node.js concepts
- **Best Practices**: Demonstrate production-ready patterns while maintaining simplicity

## Testing Guidelines

All contributions must include appropriate testing:

### Test Requirements

- **Unit Tests**: Test individual functions and modules
- **Integration Tests**: Test the `/hello` endpoint using Supertest
- **Coverage**: Maintain at least 90% code coverage
- **Performance**: Ensure tests complete within 30 seconds

### Running Tests

Coverage is not opt-in: `jest.config.js` sets `collectCoverage: true`, so every run collects coverage and applies the 90% threshold above. Plain `npm test` is therefore the gate, and it is the same command the CI pipeline runs; `test:coverage` is a convenience for writing the report on demand.

```bash
# Run all tests, with coverage collected and the 90% threshold enforced
npm test

# Run the same suite and write the coverage report explicitly
npm run test:coverage

# Re-run the affected suites as you edit; press Ctrl+C to stop the watcher
# On a clean checkout nothing runs until a tracked file changes or you press a
npm run test:watch

# The same watcher for a tree that is not under version control
npm test -- --watchAll
```

`test:watch` runs `jest --watch`, which selects the suites affected by your uncommitted changes and therefore requires the project to be a Git (or Mercurial) working copy. Inside a clone that is always true. On a clean tree, though, nothing is uncommitted, so watch mode starts by running no tests at all and prints `No tests found related to files changed since last commit.` — that is expected behaviour, not a broken setup. Change a tracked file to have it run the affected suites, or press `a` at its `Watch Usage` menu to run every suite straight away. Outside a clone — if you downloaded the sources as an archive instead of cloning them — it exits immediately with `--watch is not supported without git/hg, please use --watchAll`; use `npm test -- --watchAll` in that case, which re-runs every suite on each change. Both watchers hold the terminal until you stop them with Ctrl+C, so run them in their own terminal and never in a script or CI job, which would hang.

## Security Guidelines

Security is important even in tutorial applications:

### Security Practices

- **Input Validation**: Validate all inputs, even for simple endpoints
- **Error Handling**: Never expose sensitive information in error messages
- **Dependencies**: Keep dependencies updated and run `npm audit` regularly
- **Headers**: Use Helmet.js for security headers
- **Logging**: Log security events appropriately

### Vulnerability Reporting

This repository publishes no security contact of its own: there is no security policy file, and the `author` field in `src/backend/package.json` is empty, so there is no maintainer address to write to. Report through GitHub's private channel instead.

If you discover a security vulnerability:
1. **Do not** open a public issue, and do not put details in any public comment, commit message or pull request
2. Use GitHub's private vulnerability reporting on this repository — the **Security** tab, then **Report a vulnerability** — which opens a draft advisory visible only to you and the maintainers
3. If that form is not offered, private reporting has not been enabled and this repository has no destination that can receive a report privately. Hold the report rather than filing it anywhere: open an issue asking the maintainers to enable GitHub's private vulnerability reporting or to publish a private security contact, as a plain process request that names no file, component or behaviour and does not say that a vulnerability is outstanding. Send anything about the vulnerability itself only once one of those channels exists
4. Allow time for the vulnerability to be addressed before public disclosure

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project. The project's license is ISC, as declared by the `license` field in `src/backend/package.json`.

Your contributions help make Node.js more accessible to developers worldwide. Thank you for being part of our learning community!

---

## Questions or Need Help?

- **Issues**: Use GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions and general discussion
- **Documentation**: Check the README.md for additional setup and usage information

Happy coding! 🚀