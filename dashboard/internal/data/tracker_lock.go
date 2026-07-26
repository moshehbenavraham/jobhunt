package data

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

const trackerLockPrefix = "jobhunt-tracker-"

type trackerLockOptions struct {
	timeout time.Duration
	retry   time.Duration
	stale   time.Duration
}

type trackerLockOwner struct {
	PID        int    `json:"pid"`
	Token      string `json:"token"`
	AcquiredAt string `json:"acquiredAt"`
	Tracker    string `json:"tracker"`
}

type trackerLock struct {
	dir      string
	token    string
	mu       sync.Mutex
	released bool
}

type processStatus uint8

const (
	processUnknown processStatus = iota
	processDead
	processAlive
)

func envMilliseconds(names []string, fallback time.Duration) time.Duration {
	for _, name := range names {
		value, err := strconv.Atoi(os.Getenv(name))
		if err == nil && value > 0 {
			return time.Duration(value) * time.Millisecond
		}
	}
	return fallback
}

func defaultTrackerLockOptions() trackerLockOptions {
	return trackerLockOptions{
		timeout: envMilliseconds(
			[]string{"JOBHUNT_TRACKER_LOCK_TIMEOUT_MS", "CAREER_OPS_TRACKER_LOCK_TIMEOUT_MS"},
			60*time.Second,
		),
		retry: envMilliseconds(
			[]string{"JOBHUNT_TRACKER_LOCK_RETRY_MS", "CAREER_OPS_TRACKER_LOCK_RETRY_MS"},
			75*time.Millisecond,
		),
		stale: envMilliseconds(
			[]string{"JOBHUNT_TRACKER_LOCK_STALE_MS", "CAREER_OPS_TRACKER_LOCK_STALE_MS"},
			10*time.Minute,
		),
	}
}

func canonicalPath(path string) (string, error) {
	absolute, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	if canonical, err := filepath.EvalSymlinks(absolute); err == nil {
		return canonical, nil
	}
	parent, err := filepath.EvalSymlinks(filepath.Dir(absolute))
	if err == nil {
		return filepath.Join(parent, filepath.Base(absolute)), nil
	}
	return filepath.Clean(absolute), nil
}

func pathWithin(path, parent string) bool {
	relative, err := filepath.Rel(parent, path)
	if err != nil {
		return false
	}
	return relative == "." ||
		(relative != ".." &&
			!strings.HasPrefix(relative, ".."+string(filepath.Separator)) &&
			!filepath.IsAbs(relative))
}

func trackerLockDirFor(trackerPath string) (string, error) {
	canonicalTracker, err := canonicalPath(trackerPath)
	if err != nil {
		return "", err
	}
	canonicalTemp, err := canonicalPath(os.TempDir())
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256([]byte(canonicalTracker))
	fallback := filepath.Join(
		canonicalTemp,
		fmt.Sprintf("%s%x.lock", trackerLockPrefix, sum[:10]),
	)

	override := os.Getenv("JOBHUNT_TRACKER_LOCK")
	if override == "" {
		override = os.Getenv("CAREER_OPS_TRACKER_LOCK")
	}
	if override == "" || !filepath.IsAbs(override) {
		return fallback, nil
	}
	candidate := filepath.Clean(override)
	canonicalParent, err := canonicalPath(filepath.Dir(candidate))
	if err != nil || !pathWithin(canonicalParent, canonicalTemp) {
		return fallback, nil
	}
	base := filepath.Base(candidate)
	if !strings.HasPrefix(base, trackerLockPrefix) &&
		!strings.HasPrefix(base, "career-ops-merge-tracker-") {
		return fallback, nil
	}
	return candidate, nil
}

func randomLockToken() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func readTrackerLockOwner(lockDir string) (trackerLockOwner, error) {
	content, err := os.ReadFile(filepath.Join(lockDir, "owner.json"))
	if err != nil {
		return trackerLockOwner{}, err
	}
	var owner trackerLockOwner
	if err := json.Unmarshal(content, &owner); err != nil {
		return trackerLockOwner{}, err
	}
	return owner, nil
}

func trackerLockCanRecover(lockDir string, stale time.Duration) bool {
	if owner, err := readTrackerLockOwner(lockDir); err == nil && owner.PID > 0 {
		switch getProcessStatus(owner.PID) {
		case processDead:
			return true
		case processAlive:
			return false
		}
	}
	info, err := os.Stat(lockDir)
	if err != nil {
		return errors.Is(err, fs.ErrNotExist)
	}
	return time.Since(info.ModTime()) > stale
}

func quarantineTrackerLock(lockDir, expectedToken string) (bool, error) {
	if expectedToken != "" {
		owner, err := readTrackerLockOwner(lockDir)
		if err != nil {
			if errors.Is(err, fs.ErrNotExist) {
				return false, nil
			}
			return false, err
		}
		if owner.Token != expectedToken {
			return false, nil
		}
	}
	token, err := randomLockToken()
	if err != nil {
		return false, err
	}
	quarantine := fmt.Sprintf("%s.remove-%d-%s", lockDir, os.Getpid(), token)
	if err := os.Rename(lockDir, quarantine); err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return false, nil
		}
		return false, err
	}
	if expectedToken != "" {
		owner, ownerErr := readTrackerLockOwner(quarantine)
		if ownerErr != nil || owner.Token != expectedToken {
			if _, statErr := os.Stat(lockDir); errors.Is(statErr, fs.ErrNotExist) {
				_ = os.Rename(quarantine, lockDir)
			}
			if ownerErr != nil {
				return false, ownerErr
			}
			return false, nil
		}
	}
	return true, os.RemoveAll(quarantine)
}

func acquireTrackerLock(trackerPath string, options trackerLockOptions) (*trackerLock, error) {
	defaults := defaultTrackerLockOptions()
	if options.timeout <= 0 {
		options.timeout = defaults.timeout
	}
	if options.retry <= 0 {
		options.retry = defaults.retry
	}
	if options.stale <= 0 {
		options.stale = defaults.stale
	}
	canonicalTracker, err := canonicalPath(trackerPath)
	if err != nil {
		return nil, err
	}
	lockDir, err := trackerLockDirFor(canonicalTracker)
	if err != nil {
		return nil, err
	}
	token, err := randomLockToken()
	if err != nil {
		return nil, err
	}
	recoverGuard := lockDir + ".recover"
	deadline := time.Now().Add(options.timeout)

	for !time.Now().After(deadline) {
		if err := os.Mkdir(lockDir, 0o700); err == nil {
			owner := trackerLockOwner{
				PID:        os.Getpid(),
				Token:      token,
				AcquiredAt: time.Now().UTC().Format(time.RFC3339Nano),
				Tracker:    canonicalTracker,
			}
			content, marshalErr := json.Marshal(owner)
			if marshalErr == nil {
				var file *os.File
				file, marshalErr = os.OpenFile(
					filepath.Join(lockDir, "owner.json"),
					os.O_WRONLY|os.O_CREATE|os.O_EXCL,
					0o600,
				)
				if marshalErr == nil {
					_, marshalErr = file.Write(append(content, '\n'))
					closeErr := file.Close()
					if marshalErr == nil {
						marshalErr = closeErr
					}
				}
			}
			if marshalErr != nil {
				_, _ = quarantineTrackerLock(lockDir, token)
				return nil, marshalErr
			}
			return &trackerLock{dir: lockDir, token: token}, nil
		} else if !errors.Is(err, fs.ErrExist) {
			return nil, err
		}

		guardOwned := false
		if err := os.Mkdir(recoverGuard, 0o700); err == nil {
			guardOwned = true
		} else if !errors.Is(err, fs.ErrExist) {
			return nil, err
		} else if trackerLockCanRecover(recoverGuard, options.stale) {
			_, _ = quarantineTrackerLock(recoverGuard, "")
		}
		if guardOwned {
			if trackerLockCanRecover(lockDir, options.stale) {
				_, _ = quarantineTrackerLock(lockDir, "")
			}
			_, _ = quarantineTrackerLock(recoverGuard, "")
		}
		time.Sleep(options.retry)
	}
	return nil, fmt.Errorf("timed out waiting for tracker lock at %s", lockDir)
}

func (lock *trackerLock) release() error {
	if lock == nil {
		return nil
	}
	lock.mu.Lock()
	defer lock.mu.Unlock()
	if lock.released {
		return nil
	}
	removed, err := quarantineTrackerLock(lock.dir, lock.token)
	if err != nil {
		return fmt.Errorf("release tracker lock: %w", err)
	}
	if removed {
		lock.released = true
	}
	return nil
}

func writeFileAtomic(filePath string, content []byte) error {
	directory := filepath.Dir(filePath)
	temp, err := os.CreateTemp(directory, "."+filepath.Base(filePath)+".*.tmp")
	if err != nil {
		return err
	}
	tempPath := temp.Name()
	defer os.Remove(tempPath)
	mode := os.FileMode(0o644)
	if info, statErr := os.Stat(filePath); statErr == nil {
		mode = info.Mode().Perm()
	}
	if err := temp.Chmod(mode); err != nil {
		temp.Close()
		return err
	}
	if _, err := temp.Write(content); err != nil {
		temp.Close()
		return err
	}
	if err := temp.Sync(); err != nil {
		temp.Close()
		return err
	}
	if err := temp.Close(); err != nil {
		return err
	}
	return replaceFileAtomic(tempPath, filePath)
}
