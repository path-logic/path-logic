# Path Logic - Development Makefile
# Tooling and utility commands (keeps package.json clean)

.PHONY: help format format-check typecheck lint clean install

# Default target
help:
	@echo "Path Logic - Available Commands"
	@echo ""
	@echo "  make install      Install dependencies"
	@echo "  make format       Format all files with Prettier"
	@echo "  make format-check Check formatting (CI)"
	@echo "  make typecheck    Run TypeScript type checking"
	@echo "  make lint         Run all linters"
	@echo "  make clean        Remove build artifacts"
	@echo ""
	@echo "For app commands, use npm scripts:"
	@echo "  npm run dev       Start development server"
	@echo "  npm run build     Build for production"
	@echo "  npm run start     Start production server"

# === DEPENDENCIES ===

install:
	npm ci

# === CODE QUALITY ===

format:
	npm run format

format-check:
	npm run format-check

typecheck:
	npm run typecheck

lint:
	npm run lint
	@echo "✅ All checks passed"

# === CLEANUP ===

clean:
	rm -rf .next out dist node_modules/.cache
	@echo "✅ Cleaned build artifacts"
