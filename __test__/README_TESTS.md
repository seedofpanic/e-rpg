# Running Tests

This document outlines how to run and maintain the tests for the E-RPG application.

## Setting Up the Test Environment

A separate Conda environment is used for testing to avoid conflicts with the main development environment.

1. Create and activate the test environment:

```bash
conda env create -f conda-test-env.yml
conda activate erpg-test
```

2. Install test dependencies:

```bash
pip install pytest pytest-cov
```

3. Run the tests manually:

```bash
pytest -v __test__/test_app.py __test__/test_character.py __test__/test_game_state.py
```

## Test Coverage

To generate a test coverage report:

```bash
pytest -v --cov=. --cov-report=term --cov-report=html:coverage_report __test__/test_app.py __test__/test_character.py __test__/test_game_state.py
```

This will:
- Run all tests with verbose output
- Calculate test coverage for the codebase
- Display coverage statistics in the terminal
- Generate an HTML coverage report in the `coverage_report` directory

Open `coverage_report/index.html` in a web browser to view the detailed coverage report.

## Test Structure

The test suite is organized as follows:

- `__test__/test_app.py`: Tests for the Flask routes and SocketIO events
- `__test__/test_character.py`: Tests for the Character class and related functionality
- `__test__/test_game_state.py`: Tests for game state management

## Running Individual Test Files

You can run specific test files or test functions:

```bash
# Run a specific test file
pytest -v __test__/test_app.py

# Run a specific test class
pytest -v __test__/test_app.py::TestRoutes

# Run a specific test function
pytest -v __test__/test_app.py::TestRoutes::test_index_route
```

## Troubleshooting

If you encounter issues:

1. Make sure Conda is installed and in your PATH
2. Try recreating the environment with the `--force` flag:
   ```bash
   conda env create -f conda-test-env.yml --force
   ```
3. Check that you have the correct Python version (3.9) in the environment
4. Ensure all dependencies are correctly installed 