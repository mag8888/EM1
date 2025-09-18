#!/bin/bash
# Force commit script for bank centralization

cd /Users/ADMIN/EM1

# Set remote to HTTPS
git remote set-url origin https://github.com/mag8888/EM1.git

# Force add all files
git add -A

# Force commit with message
git commit -am "Force commit: Complete bank system centralization

- Removed all duplicate bank functions from table.html
- Added centralized bank functions to bank-module-v3.js  
- Implemented global variable synchronization system
- All bank operations now centralized in single module
- Eliminated conflicts and improved maintainability"

# Push to main branch
git push -u origin main

echo "Force commit completed!"
