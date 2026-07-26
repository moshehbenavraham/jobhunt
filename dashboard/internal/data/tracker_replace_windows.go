//go:build windows

package data

import "golang.org/x/sys/windows"

func replaceFileAtomic(oldPath, newPath string) error {
	oldPathPointer, err := windows.UTF16PtrFromString(oldPath)
	if err != nil {
		return err
	}
	newPathPointer, err := windows.UTF16PtrFromString(newPath)
	if err != nil {
		return err
	}
	return windows.MoveFileEx(
		oldPathPointer,
		newPathPointer,
		windows.MOVEFILE_REPLACE_EXISTING|windows.MOVEFILE_WRITE_THROUGH,
	)
}
