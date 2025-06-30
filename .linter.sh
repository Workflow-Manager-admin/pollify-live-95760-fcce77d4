#!/bin/bash
cd /home/kavia/workspace/code-generation/pollify-live-95760-fcce77d4/express_backend
source venv/bin/activate
flake8 .
LINT_EXIT_CODE=$?
if [ $LINT_EXIT_CODE -ne 0 ]; then
  exit 1
fi

