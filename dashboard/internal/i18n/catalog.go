package i18n

import (
	"fmt"
	"strings"
)

// Catalog is the complete set of operator-facing dashboard strings. Tracker
// values, report content, paths, and canonical status IDs are never translated.
type Catalog struct {
	Code string

	AppTitle            string
	ApplicationsSummary string
	NoApplications      string
	NoMatches           string
	LoadingPreview      string

	TabAll       string
	TabEvaluated string
	TabApplied   string
	TabInterview string
	TabTop       string
	TabSkip      string
	TabRejected  string
	TabDiscarded string

	AbbrevAll       string
	AbbrevEvaluated string
	AbbrevApplied   string
	AbbrevInterview string
	AbbrevTop       string
	AbbrevSkip      string
	AbbrevRejected  string
	AbbrevDiscarded string

	StatusHired     string
	StatusInterview string
	StatusOffer     string
	StatusResponded string
	StatusApplied   string
	StatusEvaluated string
	StatusSkip      string
	StatusRejected  string
	StatusDiscarded string

	SortFormat       string
	ViewFormat       string
	ShownFormat      string
	SearchIdle       string
	SearchActive     string
	SearchClosed     string
	ViewGrouped      string
	ViewFlat         string
	SortScore        string
	SortDate         string
	SortCompany      string
	SortStatus       string
	PDFMetricsFormat string

	LabelPDF          string
	LabelArchetype    string
	LabelTLDR         string
	LabelComp         string
	LabelRemote       string
	LabelLocation     string
	LabelCompensation string
	LabelContact      string
	ChangeStatus      string

	PDFFresh    string
	PDFStale    string
	PDFLegacy   string
	PDFInvalid  string
	PDFMissing  string
	PDFNotBuilt string

	HelpNavigate string
	HelpTabs     string
	HelpSort     string
	HelpSearch   string
	HelpRefresh  string
	HelpReport   string
	HelpOpenURL  string
	HelpChange   string
	HelpView     string
	HelpProgress string
	HelpQuit     string
	HelpConfirm  string
	HelpCancel   string
	HelpEdit     string
	HelpClear    string
	HelpClose    string
	HelpScroll   string
	HelpPage     string
	HelpTopEnd   string
	HelpBack     string

	ProgressTitle     string
	ProgressSummary   string
	PipelineFunnel    string
	ScoreDistribution string
	ConversionRates   string
	ResponseRate      string
	InterviewRate     string
	OfferRate         string
	ActiveSummary     string
	WeeklyActivity    string
	NoData            string
	ViewerTop         string
	ViewerEnd         string
	ViewerEmpty       string
	ViewerReadError   string
}

// StatusLabel returns a localized label for a canonical status ID.
func (c Catalog) StatusLabel(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "hired":
		return c.StatusHired
	case "interview":
		return c.StatusInterview
	case "offer":
		return c.StatusOffer
	case "responded":
		return c.StatusResponded
	case "applied":
		return c.StatusApplied
	case "evaluated":
		return c.StatusEvaluated
	case "skip":
		return c.StatusSkip
	case "rejected":
		return c.StatusRejected
	case "discarded":
		return c.StatusDiscarded
	default:
		return status
	}
}

// SortLabel returns a localized label without changing the canonical sort ID.
func (c Catalog) SortLabel(sortID string) string {
	switch sortID {
	case "score":
		return c.SortScore
	case "date":
		return c.SortDate
	case "company":
		return c.SortCompany
	case "status":
		return c.SortStatus
	default:
		return sortID
	}
}

// ViewLabel returns a localized label without changing the canonical view ID.
func (c Catalog) ViewLabel(viewID string) string {
	switch viewID {
	case "grouped":
		return c.ViewGrouped
	case "flat":
		return c.ViewFlat
	default:
		return viewID
	}
}

var En = Catalog{
	Code:     "en",
	AppTitle: "CAREER PIPELINE", ApplicationsSummary: "%d applications | Avg %.1f/5",
	NoApplications: "No applications tracked yet.\n\nPaste a job description or URL to get started.\nRun a portal scan to find opportunities.",
	NoMatches:      "No applications match this filter.", LoadingPreview: "Loading preview...",
	TabAll: "ALL", TabEvaluated: "EVALUATED", TabApplied: "APPLIED", TabInterview: "INTERVIEW",
	TabTop: "TOP ≥4", TabSkip: "SKIP", TabRejected: "REJECTED", TabDiscarded: "DISCARDED",
	AbbrevAll: "ALL", AbbrevEvaluated: "EVAL", AbbrevApplied: "APP", AbbrevInterview: "INT",
	AbbrevTop: "TOP", AbbrevSkip: "SKIP", AbbrevRejected: "REJ", AbbrevDiscarded: "DISC",
	StatusHired: "Hired", StatusInterview: "Interview", StatusOffer: "Offer",
	StatusResponded: "Responded", StatusApplied: "Applied", StatusEvaluated: "Evaluated",
	StatusSkip: "Skip", StatusRejected: "Rejected", StatusDiscarded: "Discarded",
	SortFormat: "[Sort: %s]", ViewFormat: "[View: %s]", ShownFormat: "%d shown",
	SearchIdle: "[/ search]", SearchActive: "[Search: %s▌]", SearchClosed: "[Search: %s]",
	ViewGrouped: "grouped", ViewFlat: "flat", SortScore: "score", SortDate: "date",
	SortCompany: "company", SortStatus: "status", PDFMetricsFormat: "PDF ✓%d !%d ?%d",
	LabelPDF: "PDF: ", LabelArchetype: "Archetype: ", LabelTLDR: "TL;DR: ",
	LabelComp: "Comp: ", LabelRemote: "Remote: ", LabelLocation: "Location: ",
	LabelCompensation: "Compensation: ", LabelContact: "Contact: ", ChangeStatus: "Change status:",
	PDFFresh: "Fresh and validated", PDFStale: "Stale — regenerate",
	PDFLegacy: "Legacy / unverified", PDFInvalid: "Invalid", PDFMissing: "Missing",
	PDFNotBuilt:  "Not generated",
	HelpNavigate: "navigate", HelpTabs: "tabs", HelpSort: "sort", HelpSearch: "search",
	HelpRefresh: "refresh", HelpReport: "report", HelpOpenURL: "open URL",
	HelpChange: "change", HelpView: "view", HelpProgress: "progress", HelpQuit: "quit",
	HelpConfirm: "confirm", HelpCancel: "cancel", HelpEdit: "edit", HelpClear: "clear",
	HelpClose: "close", HelpScroll: "scroll", HelpPage: "page", HelpTopEnd: "top/end", HelpBack: "back",
	ProgressTitle: "SEARCH PROGRESS", ProgressSummary: "%d evaluated | %.1f avg score",
	PipelineFunnel: "Pipeline Funnel", ScoreDistribution: "Score Distribution",
	ConversionRates: "Conversion Rates", ResponseRate: "Response Rate: ",
	InterviewRate: "Interview Rate: ", OfferRate: "Offer Rate: ",
	ActiveSummary: "%d active applications | %d total offers", WeeklyActivity: "Weekly Activity",
	NoData: "No data", ViewerTop: "Top", ViewerEnd: "End", ViewerEmpty: "(empty file)",
	ViewerReadError: "Error reading file: ",
}

var De = Catalog{
	Code:     "de",
	AppTitle: "BEWERBUNGS-PIPELINE", ApplicationsSummary: "%d Bewerbungen | Ø %.1f/5",
	NoApplications: "Noch keine Bewerbungen erfasst.\n\nFüge eine Stellenanzeige oder URL ein.\nStarte einen Portalscan, um Chancen zu finden.",
	NoMatches:      "Keine Bewerbung entspricht diesem Filter.", LoadingPreview: "Vorschau wird geladen...",
	TabAll: "ALLE", TabEvaluated: "BEWERTET", TabApplied: "BEWORBEN", TabInterview: "GESPRÄCH",
	TabTop: "TOP ≥4", TabSkip: "AUSLASSEN", TabRejected: "ABGELEHNT", TabDiscarded: "VERWORFEN",
	AbbrevAll: "ALL", AbbrevEvaluated: "BEW", AbbrevApplied: "BEW", AbbrevInterview: "GES",
	AbbrevTop: "TOP", AbbrevSkip: "AUS", AbbrevRejected: "ABG", AbbrevDiscarded: "VERW",
	StatusHired: "Eingestellt", StatusInterview: "Gespräch", StatusOffer: "Angebot",
	StatusResponded: "Antwort", StatusApplied: "Beworben", StatusEvaluated: "Bewertet",
	StatusSkip: "Auslassen", StatusRejected: "Abgelehnt", StatusDiscarded: "Verworfen",
	SortFormat: "[Sortierung: %s]", ViewFormat: "[Ansicht: %s]", ShownFormat: "%d angezeigt",
	SearchIdle: "[/ suchen]", SearchActive: "[Suche: %s▌]", SearchClosed: "[Suche: %s]",
	ViewGrouped: "gruppiert", ViewFlat: "flach", SortScore: "Punktzahl", SortDate: "Datum",
	SortCompany: "Unternehmen", SortStatus: "Status", PDFMetricsFormat: "PDF ✓%d !%d ?%d",
	LabelPDF: "PDF: ", LabelArchetype: "Archetyp: ", LabelTLDR: "Kurzfassung: ",
	LabelComp: "Vergütung: ", LabelRemote: "Remote: ", LabelLocation: "Ort: ",
	LabelCompensation: "Vergütung: ", LabelContact: "Kontakt: ", ChangeStatus: "Status ändern:",
	PDFFresh: "Aktuell und validiert", PDFStale: "Veraltet — neu erzeugen",
	PDFLegacy: "Alt / ungeprüft", PDFInvalid: "Ungültig", PDFMissing: "Fehlt",
	PDFNotBuilt:  "Nicht erzeugt",
	HelpNavigate: "navigieren", HelpTabs: "Tabs", HelpSort: "sortieren", HelpSearch: "suchen",
	HelpRefresh: "neu laden", HelpReport: "Bericht", HelpOpenURL: "URL öffnen",
	HelpChange: "ändern", HelpView: "Ansicht", HelpProgress: "Fortschritt", HelpQuit: "beenden",
	HelpConfirm: "bestätigen", HelpCancel: "abbrechen", HelpEdit: "bearbeiten", HelpClear: "leeren",
	HelpClose: "schließen", HelpScroll: "scrollen", HelpPage: "Seite", HelpTopEnd: "Anfang/Ende", HelpBack: "zurück",
	ProgressTitle: "SUCHFORTSCHRITT", ProgressSummary: "%d bewertet | Ø %.1f Punkte",
	PipelineFunnel: "Pipeline-Trichter", ScoreDistribution: "Punktverteilung",
	ConversionRates: "Konversionsraten", ResponseRate: "Antwortrate: ",
	InterviewRate: "Gesprächsrate: ", OfferRate: "Angebotsrate: ",
	ActiveSummary: "%d aktive Bewerbungen | %d Angebote", WeeklyActivity: "Wöchentliche Aktivität",
	NoData: "Keine Daten", ViewerTop: "Anfang", ViewerEnd: "Ende", ViewerEmpty: "(leere Datei)",
	ViewerReadError: "Fehler beim Lesen: ",
}

var Fr = Catalog{
	Code:     "fr",
	AppTitle: "PIPELINE DE CANDIDATURES", ApplicationsSummary: "%d candidatures | Moy. %.1f/5",
	NoApplications: "Aucune candidature suivie.\n\nCollez une offre ou une URL pour commencer.\nLancez un scan des portails pour trouver des opportunités.",
	NoMatches:      "Aucune candidature ne correspond à ce filtre.", LoadingPreview: "Chargement de l’aperçu...",
	TabAll: "TOUT", TabEvaluated: "ÉVALUÉ", TabApplied: "POSTULÉ", TabInterview: "ENTRETIEN",
	TabTop: "TOP ≥4", TabSkip: "PASSER", TabRejected: "REFUSÉ", TabDiscarded: "ÉCARTÉ",
	AbbrevAll: "TOUT", AbbrevEvaluated: "ÉVAL", AbbrevApplied: "POST", AbbrevInterview: "ENT",
	AbbrevTop: "TOP", AbbrevSkip: "PASS", AbbrevRejected: "REF", AbbrevDiscarded: "ÉCAR",
	StatusHired: "Embauché", StatusInterview: "Entretien", StatusOffer: "Offre",
	StatusResponded: "Réponse", StatusApplied: "Postulé", StatusEvaluated: "Évalué",
	StatusSkip: "Passer", StatusRejected: "Refusé", StatusDiscarded: "Écarté",
	SortFormat: "[Tri : %s]", ViewFormat: "[Vue : %s]", ShownFormat: "%d affichées",
	SearchIdle: "[/ chercher]", SearchActive: "[Recherche : %s▌]", SearchClosed: "[Recherche : %s]",
	ViewGrouped: "groupée", ViewFlat: "plate", SortScore: "score", SortDate: "date",
	SortCompany: "entreprise", SortStatus: "statut", PDFMetricsFormat: "PDF ✓%d !%d ?%d",
	LabelPDF: "PDF : ", LabelArchetype: "Archétype : ", LabelTLDR: "Résumé : ",
	LabelComp: "Rémunération : ", LabelRemote: "Télétravail : ", LabelLocation: "Lieu : ",
	LabelCompensation: "Rémunération : ", LabelContact: "Contact : ", ChangeStatus: "Modifier le statut :",
	PDFFresh: "À jour et validé", PDFStale: "Obsolète — régénérer",
	PDFLegacy: "Ancien / non vérifié", PDFInvalid: "Invalide", PDFMissing: "Absent",
	PDFNotBuilt:  "Non généré",
	HelpNavigate: "naviguer", HelpTabs: "onglets", HelpSort: "trier", HelpSearch: "chercher",
	HelpRefresh: "actualiser", HelpReport: "rapport", HelpOpenURL: "ouvrir URL",
	HelpChange: "modifier", HelpView: "vue", HelpProgress: "progression", HelpQuit: "quitter",
	HelpConfirm: "confirmer", HelpCancel: "annuler", HelpEdit: "éditer", HelpClear: "effacer",
	HelpClose: "fermer", HelpScroll: "défiler", HelpPage: "page", HelpTopEnd: "début/fin", HelpBack: "retour",
	ProgressTitle: "PROGRESSION DE LA RECHERCHE", ProgressSummary: "%d évaluées | score moy. %.1f",
	PipelineFunnel: "Entonnoir du pipeline", ScoreDistribution: "Répartition des scores",
	ConversionRates: "Taux de conversion", ResponseRate: "Taux de réponse : ",
	InterviewRate: "Taux d’entretien : ", OfferRate: "Taux d’offre : ",
	ActiveSummary: "%d candidatures actives | %d offres", WeeklyActivity: "Activité hebdomadaire",
	NoData: "Aucune donnée", ViewerTop: "Début", ViewerEnd: "Fin", ViewerEmpty: "(fichier vide)",
	ViewerReadError: "Erreur de lecture : ",
}

var Ja = Catalog{
	Code:     "ja",
	AppTitle: "応募パイプライン", ApplicationsSummary: "%d件の応募 | 平均 %.1f/5",
	NoApplications: "応募はまだ登録されていません。\n\n求人票またはURLを貼り付けて開始します。\nポータルをスキャンして求人を探せます。",
	NoMatches:      "このフィルターに一致する応募はありません。", LoadingPreview: "プレビューを読み込み中...",
	TabAll: "すべて", TabEvaluated: "評価済み", TabApplied: "応募済み", TabInterview: "面接",
	TabTop: "上位 ≥4", TabSkip: "見送り", TabRejected: "不採用", TabDiscarded: "除外",
	AbbrevAll: "全件", AbbrevEvaluated: "評価", AbbrevApplied: "応募", AbbrevInterview: "面接",
	AbbrevTop: "上位", AbbrevSkip: "見送", AbbrevRejected: "不採", AbbrevDiscarded: "除外",
	StatusHired: "採用", StatusInterview: "面接", StatusOffer: "オファー",
	StatusResponded: "返信あり", StatusApplied: "応募済み", StatusEvaluated: "評価済み",
	StatusSkip: "見送り", StatusRejected: "不採用", StatusDiscarded: "除外",
	SortFormat: "[並び順: %s]", ViewFormat: "[表示: %s]", ShownFormat: "%d件表示",
	SearchIdle: "[/ 検索]", SearchActive: "[検索: %s▌]", SearchClosed: "[検索: %s]",
	ViewGrouped: "グループ", ViewFlat: "一覧", SortScore: "スコア", SortDate: "日付",
	SortCompany: "会社", SortStatus: "状態", PDFMetricsFormat: "PDF ✓%d !%d ?%d",
	LabelPDF: "PDF: ", LabelArchetype: "アーキタイプ: ", LabelTLDR: "要約: ",
	LabelComp: "報酬: ", LabelRemote: "リモート: ", LabelLocation: "勤務地: ",
	LabelCompensation: "報酬: ", LabelContact: "連絡先: ", ChangeStatus: "ステータス変更:",
	PDFFresh: "最新・検証済み", PDFStale: "古い — 再生成が必要",
	PDFLegacy: "旧形式 / 未検証", PDFInvalid: "無効", PDFMissing: "なし",
	PDFNotBuilt:  "未生成",
	HelpNavigate: "移動", HelpTabs: "タブ", HelpSort: "並べ替え", HelpSearch: "検索",
	HelpRefresh: "更新", HelpReport: "レポート", HelpOpenURL: "URLを開く",
	HelpChange: "変更", HelpView: "表示", HelpProgress: "進捗", HelpQuit: "終了",
	HelpConfirm: "確定", HelpCancel: "取消", HelpEdit: "編集", HelpClear: "消去",
	HelpClose: "閉じる", HelpScroll: "スクロール", HelpPage: "ページ", HelpTopEnd: "先頭/末尾", HelpBack: "戻る",
	ProgressTitle: "求職活動の進捗", ProgressSummary: "%d件評価 | 平均スコア %.1f",
	PipelineFunnel: "パイプライン", ScoreDistribution: "スコア分布",
	ConversionRates: "移行率", ResponseRate: "返信率: ",
	InterviewRate: "面接率: ", OfferRate: "オファー率: ",
	ActiveSummary: "進行中 %d件 | オファー %d件", WeeklyActivity: "週次アクティビティ",
	NoData: "データなし", ViewerTop: "先頭", ViewerEnd: "末尾", ViewerEmpty: "(空のファイル)",
	ViewerReadError: "ファイル読み込みエラー: ",
}

// Supported returns stable language codes in display-cycle order.
func Supported() []string {
	return []string{"en", "de", "fr", "ja"}
}

// Resolve returns a complete catalog for an exact or regional language tag.
func Resolve(value string) (Catalog, error) {
	code := strings.ToLower(strings.TrimSpace(strings.ReplaceAll(value, "_", "-")))
	if index := strings.IndexByte(code, '-'); index >= 0 {
		code = code[:index]
	}
	switch code {
	case "", "en":
		return En, nil
	case "de":
		return De, nil
	case "fr":
		return Fr, nil
	case "ja":
		return Ja, nil
	default:
		return Catalog{}, fmt.Errorf("unsupported dashboard language %q (choose en, de, fr, or ja)", value)
	}
}
