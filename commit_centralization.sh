#!/bin/bash
# Commit script for bank centralization

cd /Users/ADMIN/EM1

# Set remote to HTTPS
git remote set-url origin https://github.com/mag8888/EM1.git

# Add all changes
git add -A

# Commit with message about centralization
git commit -m "Complete bank system centralization

- Moved all bank functions from table.html to bank-module-v3.js
- Centralized financial state management (balance, income, expenses, credit)
- Added synchronization functions between modules
- Eliminated function duplication and conflicts
- Improved architecture with single source of truth
- All bank operations now handled by centralized module
- Maintained backward compatibility with existing code"

# Push to main branch
git push -u origin main

echo "Centralization commit completed!"
