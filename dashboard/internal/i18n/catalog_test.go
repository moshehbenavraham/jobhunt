package i18n

import (
	"fmt"
	"reflect"
	"strings"
	"testing"
)

func TestCatalogCompletenessAndFormatParity(t *testing.T) {
	base := reflect.ValueOf(En)
	for _, code := range Supported() {
		catalog, err := Resolve(code)
		if err != nil {
			t.Fatalf("Resolve(%q): %v", code, err)
		}
		value := reflect.ValueOf(catalog)
		for i := 0; i < value.NumField(); i++ {
			field := value.Type().Field(i)
			if field.Type.Kind() != reflect.String {
				continue
			}
			got := value.Field(i).String()
			if strings.TrimSpace(got) == "" {
				t.Errorf("%s.%s is blank", code, field.Name)
			}
			wantMarkers := strings.Count(base.Field(i).String(), "%")
			if gotMarkers := strings.Count(got, "%"); gotMarkers != wantMarkers {
				t.Errorf("%s.%s has %d format markers; English has %d", code, field.Name, gotMarkers, wantMarkers)
			}
		}
		_ = fmt.Sprintf(catalog.ApplicationsSummary, 3, 4.2)
		_ = fmt.Sprintf(catalog.ProgressSummary, 3, 4.2)
		_ = fmt.Sprintf(catalog.ActiveSummary, 2, 1)
	}
}

func TestLanguageResolutionAndCanonicalLabels(t *testing.T) {
	german, err := Resolve("de-DE")
	if err != nil {
		t.Fatal(err)
	}
	if german.Code != "de" || german.StatusLabel("applied") != "Beworben" {
		t.Fatalf("unexpected German catalog: %#v", german)
	}
	japanese, err := Resolve("ja_JP")
	if err != nil {
		t.Fatal(err)
	}
	if japanese.StatusLabel("custom") != "custom" {
		t.Fatal("unknown canonical status must pass through unchanged")
	}
	if _, err := Resolve("es"); err == nil {
		t.Fatal("unsupported language should fail explicitly")
	}
}
