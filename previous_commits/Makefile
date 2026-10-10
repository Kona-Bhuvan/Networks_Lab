REPO   = https://github.com/Kona-Bhuvan/Networks_Lab.git
FOLDER = expserver
TMP    = .pull_tmp
COMMIT ?=

.PHONY: pull clean

pull:
ifeq ($(COMMIT),)
	$(error COMMIT is not set. Usage: make pull COMMIT=<full-commit-hash>)
endif
	rm -rf $(TMP)
	git init -q $(TMP)
	cd $(TMP) && git remote add origin $(REPO) \
		&& git sparse-checkout set $(FOLDER) \
		&& git fetch --depth 1 --filter=blob:none origin $(COMMIT) \
		&& git checkout -q FETCH_HEAD
	rm -rf $(FOLDER)
	cp -r $(TMP)/$(FOLDER) .
	rm -rf $(TMP)

clean:
	rm -rf $(FOLDER) $(TMP)