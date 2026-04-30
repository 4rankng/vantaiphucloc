# Load environment variables from .env file
include .env
export

.PHONY: push deploy

IMAGE_NAME  := $(DOCKERHUB_USERNAME)/phucloc-frontend
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
	@echo "Deploying frontend on production..."
	@echo "Pulling latest image..."
	ssh root@$(PROD_SERVER) "cd /opt/vantaiphucloc && docker compose -f deploy/docker-compose.prod.yml pull frontend"
	@echo "Restarting frontend service..."
	ssh root@$(PROD_SERVER) "cd /opt/vantaiphucloc && docker compose -f deploy/docker-compose.prod.yml up -d --force-recreate --no-deps frontend"
	@echo "Cleaning up unused images..."
	ssh root@$(PROD_SERVER) "docker image prune -f"
	@echo "Frontend deployment complete!"
	@echo "https://$(PROD_SERVER)"
