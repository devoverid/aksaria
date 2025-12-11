PLATFORMS ?= linux/amd64,linux/arm64
REPO ?= devover/aksaria
TAG ?= latest
IMAGE_TAG = $(REPO):$(TAG)
LATEST_TAG = $(REPO):latest

migrate-up:
	bunx prisma migrate deploy

create-migration:
	bunx prisma migrate dev --name $(name)

release:
	docker build -t $(IMAGE_TAG) .
	docker tag $(IMAGE_TAG) $(LATEST_TAG)
	docker push $(IMAGE_TAG)
	docker push $(LATEST_TAG)

release-multiarch:	
	docker buildx create --use --name multiarch 2>/dev/null || true
	docker buildx build --no-cache --platform $(PLATFORMS) -t $(IMAGE_TAG) -t $(LATEST_TAG) --push .

.PHONY: create-migration migrate-up release