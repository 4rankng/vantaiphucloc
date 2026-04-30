# Load environment variables from .env file
include .env
export

.PHONY: push deploy

IMAGE_NAME  := $(DOCKERHUB_USERNAME)/phucloc-backend
GIT_SHA     := $(shell git rev-parse --short HEAD)
BUILDER     := bb
PROD_SERVER := phucloc.tingting.vip

push:
	@docker buildx inspect $(BUILDER) >/dev/null 2>&1 || docker buildx create --name $(BUILDER) --driver docker-container --use
	@docker buildx use $(BUILDER)
	@docker buildx inspect --bootstrap >/dev/null
	@echo "Logging into DockerHub..."
	@echo "$(DOCKERHUB_PASSWORD)" | docker login -u "$(DOCKERHUB_USERNAME)" --password-stdin
	@echo "Building & pushing AMD64 image (with inline cache)..."
	docker buildx build \
		--platform linux/amd64 \
		--tag $(IMAGE_NAME):latest \
		--tag $(IMAGE_NAME):$(GIT_SHA) \
		--cache-from type=registry,ref=$(IMAGE_NAME):latest \
		--build-arg BUILDKIT_INLINE_CACHE=1 \
		--push \
		.
	@echo "Push complete: $(IMAGE_NAME):latest ($(GIT_SHA))"

deploy:
	@echo "Deploying backend + worker on production..."
	@echo "Pulling latest images..."
	ssh root@$(PROD_SERVER) "cd /opt/vantaiphucloc && docker compose -f deploy/docker-compose.prod.yml pull backend worker"
	@echo "Restarting backend + worker services..."
	ssh root@$(PROD_SERVER) "cd /opt/vantaiphucloc && docker compose -f deploy/docker-compose.prod.yml up -d --force-recreate --no-deps backend worker"
	@echo "Cleaning up unused images..."
	ssh root@$(PROD_SERVER) "docker image prune -f"
	@echo "Backend deployment complete!"
	@echo "API: https://$(PROD_SERVER)/api"
