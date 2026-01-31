---
name: workspace-setup
description: Ensures the IDE workspace has the necessary terminal windows running for development.
---

# Workspace Setup Skill

This skill provides the necessary instructions to ensure the `path-logic` development environment is properly configured.

## Overview

The `path-logic` project requires several background processes to be running during development. This skill helps you verify and, if necessary, start these processes.

## Terminal Configuration

The following terminals should be available and running:

### 1. Dev Server

- **Name**: Dev Server
- **Directory**: Root (`/home/pete/projects/path-logic`)
- **Command**: `npm run dev`
- **Purpose**: Main Next.js application development server.

### 2. Storybook

- **Name**: storybook
- **Directory**: `./apps/web`
- **Command**: `npm run storybook`
- **Purpose**: Component library development and documentation.

### 3. End-to-End Tests

- **Name**: e2e
- **Directory**: `./apps/web`
- **Command**: `npm run test`
- **Purpose**: Playwright E2E test suite.

## Instructions

1.  **Verify Existing Terminals**: Use `read_terminal` or `run_command` (to list processes) to check if the named terminals are already running.
2.  **Inspect Status**: If a terminal is running, check its output to ensure there are no errors (e.g., port conflicts, build errors).
3.  **Start Missing Terminals**: If a required terminal is missing, use `run_command` with the specified `Cwd` and `CommandLine`.
4.  **Do Not Duplicate**: Do not attempt to start a terminal that is already running and healthy.
5.  **Report**: Inform the user if you started any new processes or if everything was already correctly configured.
