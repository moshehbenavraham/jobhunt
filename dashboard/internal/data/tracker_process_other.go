//go:build !aix && !darwin && !dragonfly && !freebsd && !linux && !netbsd && !openbsd && !solaris && !windows

package data

func getProcessStatus(pid int) processStatus {
	if pid <= 0 {
		return processDead
	}
	return processUnknown
}
