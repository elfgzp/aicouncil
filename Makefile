.PHONY: build test clean install lint fmt

BINARY_NAME=aicouncil
BUILD_DIR=./build
MAIN_FILE=./cmd/main.go

LDFLAGS=-ldflags "-s -w -X main.version=$(shell git describe --tags --always --dirty 2>/dev/null || echo 'dev')"

build:
	@echo "Building $(BINARY_NAME)..."
	@mkdir -p $(BUILD_DIR)
	go build $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY_NAME) $(MAIN_FILE)

test:
	@echo "Running tests..."
	go test -v ./...

clean:
	@echo "Cleaning..."
	@rm -rf $(BUILD_DIR)
	go clean

install: build
	@echo "Installing $(BINARY_NAME)..."
	@cp $(BUILD_DIR)/$(BINARY_NAME) $(GOPATH)/bin/ 2>/dev/null || cp $(BUILD_DIR)/$(BINARY_NAME) /usr/local/bin/

lint:
	@echo "Running linter..."
	golangci-lint run ./...

fmt:
	@echo "Formatting code..."
	gofmt -w -s .

dev:
	@echo "Building for development..."
	go build -o $(BUILD_DIR)/$(BINARY_NAME) $(MAIN_FILE)

run: dev
	$(BUILD_DIR)/$(BINARY_NAME)
