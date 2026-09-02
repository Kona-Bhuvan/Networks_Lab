### Initialisation

```bash
git init
git remote add origin https://github.com/Kona-Bhuvan/Networks_Lab/
```

### Pull a stage
- Go to GitHub repo -> Code -> Commits ([link](https://github.com/Kona-Bhuvan/Networks_Lab/commits/master/))
  
```bash
git fetch origin <COMMIT_HASH>
```

```bash
git switch --detach FETCH_HEAD
```