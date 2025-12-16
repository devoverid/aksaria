PLATFORMS ?= linux/amd64,linux/arm64
REPO ?= devover/aksaria
TAG ?= latest
IMAGE_TAG = $(REPO):$(TAG)
LATEST_TAG = $(REPO):latest

create-migration:
	bunx prisma migrate dev --name $(name)

migrate-up:
	bunx prisma migrate deploy

migrate-reset:
	bunx prisma migrate reset

release:
	docker build -t $(IMAGE_TAG) -f ./docker/Dockerfile .
	docker tag $(IMAGE_TAG) $(LATEST_TAG)
	docker push $(IMAGE_TAG)
	docker push $(LATEST_TAG)

release-multiarch:
	docker buildx rm multiarch 2>/dev/null || true
	docker buildx create --use --name multiarch 2>/dev/null || true
	docker buildx build --no-cache --platform $(PLATFORMS) -f ./docker/Dockerfile -t $(REPO):$(TAG) --push .

.PHONY: create-migration migrate-up release