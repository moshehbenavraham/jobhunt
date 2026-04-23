import {
	type CSSProperties,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import type { TocEntry } from "./extract-sections";

type ReportTocProps = {
	entries: TocEntry[];
	scrollContainerRef: React.RefObject<HTMLElement | null>;
};

const tocNavStyle: CSSProperties = {
	display: "grid",
	fontFamily: "var(--jh-font-body)",
	gap: "var(--jh-space-1)",
	maxHeight: "70vh",
	overflowY: "auto",
	padding: "var(--jh-space-2) 0",
};

const tocLabelStyle: CSSProperties = {
	color: "var(--jh-color-text-muted)",
	fontSize: "var(--jh-text-caption-size)",
	fontWeight: "var(--jh-text-label-weight)",
	letterSpacing: "var(--jh-text-label-letter-spacing)",
	margin: 0,
	padding: "0 var(--jh-space-3)",
	textTransform: "uppercase",
};

const tocItemBaseStyle: CSSProperties = {
	background: "transparent",
	border: "none",
	borderLeft: "2px solid transparent",
	color: "var(--jh-color-text-secondary)",
	cursor: "pointer",
	fontFamily: "var(--jh-font-body)",
	fontSize: "var(--jh-text-body-sm-size)",
	lineHeight: "var(--jh-text-body-sm-line-height)",
	padding: "var(--jh-space-1) var(--jh-space-3)",
	textAlign: "left",
	textDecoration: "none",
	transition: "background 150ms ease, border-color 150ms ease",
	width: "100%",
};

const tocItemActiveStyle: CSSProperties = {
	...tocItemBaseStyle,
	background: "var(--jh-color-report-toc-active-bg)",
	borderLeftColor: "var(--jh-color-report-toc-accent)",
	color: "var(--jh-color-text-primary)",
	fontWeight: "var(--jh-font-weight-medium)",
};

export function ReportToc({ entries, scrollContainerRef }: ReportTocProps) {
	const [activeId, setActiveId] = useState<string | null>(
		entries.length > 0 ? (entries[0]?.id ?? null) : null,
	);
	const observerRef = useRef<IntersectionObserver | null>(null);

	useEffect(() => {
		if (entries.length === 0) {
			return;
		}

		const headingElements = entries
			.map((entry) => document.getElementById(entry.id))
			.filter((el): el is HTMLElement => el !== null);

		if (headingElements.length === 0) {
			return;
		}

		observerRef.current?.disconnect();

		const observer = new IntersectionObserver(
			(intersections) => {
				for (const intersection of intersections) {
					if (intersection.isIntersecting) {
						setActiveId(intersection.target.id);
						break;
					}
				}
			},
			{
				root: scrollContainerRef.current,
				rootMargin: "-10% 0px -80% 0px",
				threshold: 0,
			},
		);

		observerRef.current = observer;

		for (const el of headingElements) {
			observer.observe(el);
		}

		return () => {
			observer.disconnect();
		};
	}, [entries, scrollContainerRef]);

	const handleClick = useCallback((id: string) => {
		const el = document.getElementById(id);

		if (!el) {
			return;
		}

		el.scrollIntoView({ behavior: "smooth", block: "start" });
		setActiveId(id);
		el.focus({ preventScroll: true });
	}, []);

	if (entries.length === 0) {
		return null;
	}

	return (
		<nav aria-label="Report sections" style={tocNavStyle}>
			<p style={tocLabelStyle}>Sections</p>
			{entries.map((entry) => (
				<button
					aria-current={activeId === entry.id ? "true" : undefined}
					key={entry.id}
					onClick={() => handleClick(entry.id)}
					style={activeId === entry.id ? tocItemActiveStyle : tocItemBaseStyle}
					type="button"
				>
					{entry.text}
				</button>
			))}
		</nav>
	);
}
