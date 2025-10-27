
package validation

import (
    "fmt"
    "regexp"
    "strings"
    "unicode"
)

var (
    // Allowed command characters
    allowedCommandRegex = regexp.MustCompile("^[a-zA-Z0-9\\s\\-_.\\/~:]+$")

    // Dangerous commands to block
    blockedCommands = []string{
        "rm -rf /",
        "sudo rm -rf /*",
        "dd if=/dev/zero",
        "mkfs",
        "fdisk",
    }
)

func ValidateCommand(command string) error {
    if len(command) > 1000 {
        return fmt.Errorf("command too long")
    }

    if !allowedCommandRegex.MatchString(command) {
        return fmt.Errorf("command contains invalid characters")
    }

    commandLower := strings.ToLower(command)
    for _, blocked := range blockedCommands {
        if strings.Contains(commandLower, blocked) {
            return fmt.Errorf("blocked command detected")
        }
    }

    return nil
}

func SanitizeInput(input string) string {
    // Remove null bytes and control characters
    return strings.Map(func(r rune) rune {
        if unicode.IsControl(r) && r != '\n' && r != '\t' {
            return -1
        }
        return r
    }, input)
}
