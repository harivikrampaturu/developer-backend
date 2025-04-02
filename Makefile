# Default goal
.DEFAULT_GOAL := start-all

# VERSION management
VERSION ?= $(shell date +%Y%m%d%H%M%S)  # Default to timestamp if VERSION is not set

# Install dependencies
install-auth-service:
	cd auth-service && npm install --loglevel=silent

install-upload-service:
	cd upload-service && npm install --loglevel=silent

install-gateway-service:
	cd api-gateway && npm install --loglevel=silent

install-logger-service:
	cd logger && npm install --loglevel=silent

# Installs node packages in all the services (runs in parallel)
install-all:
	make -j2 install-logger-service install-auth-service install-upload-service install-gateway-service

# Build services
build-auth-service:
	cd auth-service && npm run build --loglevel=silent

build-upload-service:
	cd upload-service && npm run build --loglevel=silent

build-gateway-service:
	cd api-gateway && npm run build --loglevel=silent

# Builds all services (runs in parallel)
build-all:
	make -j2 build-auth-service build-upload-service build-gateway-service

# Stop services
stop-auth-service:
	pm2 delete auth-service --silent || echo "auth-service is not running"

stop-upload-service:
	pm2 delete upload-service --silent || echo "upload-service is not running"

stop-gateway-service:
	pm2 delete api-gateway --silent || echo "api-gateway Service is not running"

# Stop all services
stop-all: stop-auth-service stop-upload-service stop-gateway-service

# Start services
start-auth-service: stop-auth-service build-auth-service
	cd auth-service && pm2 start --name auth-service --silent --namespace backend --env NODE_ENV=production "node --trace-warnings dist/index.js"

start-upload-service: stop-upload-service build-upload-service
	cd upload-service && pm2 start --name upload-service --silent --namespace backend --env NODE_ENV=production "node --trace-warnings dist/index.js"

start-gateway-service: stop-gateway-service build-gateway-service
	cd api-gateway && pm2 start --name api-gateway --silent --namespace backend --env NODE_ENV=production "node --trace-warnings dist/index.js"

# Start all services
start-all: start-auth-service start-upload-service start-gateway-service

# Release services
release-svc:
	echo "Releasing version $(VERSION) of $(REPO) into ./releases/$(VERSION)/$(REPO).zip"
	mkdir -p "./releases/$(VERSION)"
	rm -f "./releases/$(VERSION)/$(REPO).zip"  # Clean previous releases
	zip -r -qq "./releases/$(VERSION)/$(REPO).zip" "./dist" "./node_modules" "./package.json" "./package-lock.json"

release-auth-service:
	make release-svc REPO="auth-service"

release-upload-service:
	make release-svc REPO="upload-service"

release-gateway-service:
	make release-svc REPO="api-gateway"

release-all:
	echo "VERSION=$(VERSION)"
	make build-all
	make release-auth-service
	make release-upload-service
	make release-gateway-service
