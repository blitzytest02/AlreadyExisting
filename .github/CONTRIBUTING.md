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

- **Node.js v22.16.0 LTS** - This tutorial uses the latest Long Term Support version with codename 'Jod'
- **npm** - Comes bundled with Node.js (version 11.4.1 or later)
- **Git** - For version control

### Setup Instructions

1. **Fork the repository on GitHub**
   - Click the "Fork" button in the top-right corner of the repository page

2. **Clone the forked repository to your local machine**
   ```bash
   git clone https://github.com/<your-username>/nodejs-tutorial.git
   ```

3. **Navigate to the backend directory**
   ```bash
   cd nodejs-tutorial/src/backend
   ```
   `git clone` leaves you in the directory you ran it from, so enter the clone itself before
   changing into the package directory. Substitute the clone's actual name if you renamed it.

4. **Install the required dependencies using npm**
   ```bash
   npm install
   ```
   This reads the `package.json` file and installs Express.js 5.1.0 and other dependencies.

5. **Create a local environment file from the example**
   ```bash
   cp .env.example .env
   ```

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
   - From the `src/backend` package directory, ensure your code passes all tests by running:
     ```bash
     npm test
     ```
   - Tests are executed using the configuration defined in `jest.config.js`

5. **Code quality standards**
   - Follow the code style conventions documented in `.eslintrc.js`
   - Follow the formatting conventions documented in `.prettierrc`

### Submission Process

1. **Create your pull request**
   - Use the pull request template (`.github/PULL_REQUEST_TEMPLATE.md`)
   - Provide a clear description of your changes
   - Reference any related issues using keywords like "Fixes #123"

2. **CI Pipeline validation**
   - The CI pipeline defined in `.github/workflows/ci.yml` must pass
   - On Node 22.x, it runs `npm ci`, `npm audit`, and `npm test` from the `src/backend` package directory

3. **Code review process**
   - A maintainer will review your pull request
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
- **Security**: This tutorial deliberately ships no security middleware. Helmet, CORS, rate limiting, authentication and input-validation layers are none of them dependencies here, so do not write guidance or code that assumes one is present — propose adding one as its own change rather than folding it into an unrelated pull request

### Performance Considerations

- **Response Time**: Maintain response times under 100ms for the `/hello` endpoint
- **Memory Usage**: The server sits at ≈ 65MB resident today, ~44MB of which is a bare Node.js process; keep changes from growing that materially rather than aiming at a lower absolute figure
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
- **Performance**: Keep each individual test within Jest's configured 30-second timeout

### Running Tests

```bash
npm test

npm run test:coverage

npm run test:watch
```

Coverage is collected on every Jest run, so the watcher prints a coverage table too. It lists no
files and reads `0%` in every column, even after you press `a` to run all the tests — judge the
90% requirement above by what `npm test` or `npm run test:coverage` reports.

## Security Guidelines

Security is important even in tutorial applications. The list below is what to aim for in code you
contribute. It is not a description of what this project already does — `src/backend/README.md`
records the shipped middleware's known limitations, and the two middleware modules are frozen by
the current plan, so do not change them to satisfy an item here without that scope being agreed
first.

### Security Practices

- **Input Validation**: Validate all inputs, even for simple endpoints. Nothing in this project
  validates input today, and no body parser is mounted, so there is no existing pattern to copy
- **Error Handling**: Never expose sensitive information in error messages. Note that the shipped
  500 envelope does return the request's own path, query string included
- **Dependencies**: Keep dependencies updated and run `npm audit` regularly. It currently reports
  zero advisories, but `npm ci` warns about four deprecated dev-only packages and one gated install
  script; `src/backend/README.md` inventories all five and which of them can actually be fixed.
  One action is outstanding and belongs to a pull request that owns dependency policy: move
  `supertest` off the deprecated `7.1.1` pin to `7.1.3` or later, regenerate the lockfile, and
  re-run `npm ci` and `npm audit`
- **Headers**: Add security headers deliberately if you need them; no header middleware is a
  dependency here, and the app sets exactly two header behaviours of its own — `x-powered-by` is
  disabled in `app.js`, and `errorHandler` marks its 500 response `X-Content-Type-Options:
  nosniff` because that response echoes the caller's request target. The successful `/hello`
  response carries neither a CSP nor any other hardening header
- **Logging**: Log security events appropriately, and log the minimum that makes them useful — the
  shipped request log records the target verbatim, and the shipped error diagnostic records the
  request's target, query and client address but takes its headers from a fixed allow-list
  (`host`, `content-type`, `accept`) so credentials stay out of the log, and adds the error's
  stack in development only. Follow that pattern rather than logging `req.headers` wholesale

### Vulnerability Reporting

If you discover a security vulnerability:
1. **Do not** create a public issue
2. Email the maintainers directly with details
3. Allow time for the vulnerability to be addressed before public disclosure

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project. See the `LICENSE` file in the repository root for complete license terms.

Your contributions help make Node.js more accessible to developers worldwide. Thank you for being part of our learning community!

---

## Questions or Need Help?

- **Issues**: Use GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub Discussions for questions and general discussion
- **Documentation**: Check the README.md for additional setup and usage information

Happy coding! 🚀
