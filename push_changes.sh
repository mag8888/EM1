#!/bin/bash
# Push changes script for bank centralization

cd /Users/ADMIN/EM1

# Set remote to HTTPS
git remote set-url origin https://github.com/mag8888/EM1.git

# Force add all files including modified ones
git add -f table.html
git add -f bank-module-v3/bank-module-v3.js

# Commit with message about centralization
git commit -m "Complete bank system centralization - Phase 2

- Removed all duplicate bank functions from table.html
- Added centralized bank functions to bank-module-v3.js
- Implemented global variable synchronization system
- Added initializeGlobalVariables() and syncVariablesToTable() functions
- All bank operations now centralized in single module
- Eliminated conflicts between table.html and bank module
- Improved maintainability and debugging capabilities"

# Push to main branch
git push -u origin main

echo "Bank centralization changes pushed successfully!"
