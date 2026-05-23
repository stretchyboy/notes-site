import { registerEscapeHandler, removeAllChildren } from "./util"

interface Position {
  x: number
  y: number
}

class DiagramPanZoom {
  private isDragging = false
  private startPan: Position = { x: 0, y: 0 }
  private currentPan: Position = { x: 0, y: 0 }
  private scale = 1
  private readonly MIN_SCALE = 0.5
  private readonly MAX_SCALE = 3

  cleanups: (() => void)[] = []

  constructor(
    private container: HTMLElement,
    private content: HTMLElement,
  ) {
    this.setupEventListeners()
    this.setupNavigationControls()
    this.resetTransform()
  }

  private setupEventListeners() {
    // Mouse drag events
    const mouseDownHandler = this.onMouseDown.bind(this)
    const mouseMoveHandler = this.onMouseMove.bind(this)
    const mouseUpHandler = this.onMouseUp.bind(this)
    const resizeHandler = this.resetTransform.bind(this)

    this.container.addEventListener("mousedown", mouseDownHandler)
    document.addEventListener("mousemove", mouseMoveHandler)
    document.addEventListener("mouseup", mouseUpHandler)
    window.addEventListener("resize", resizeHandler)

    this.cleanups.push(
      () => this.container.removeEventListener("mousedown", mouseDownHandler),
      () => document.removeEventListener("mousemove", mouseMoveHandler),
      () => document.removeEventListener("mouseup", mouseUpHandler),
      () => window.removeEventListener("resize", resizeHandler),
    )
  }

  cleanup() {
    for (const cleanup of this.cleanups) {
      cleanup()
    }
  }

  private setupNavigationControls() {
    const controls = document.createElement("div")
    controls.className = "mermaid-controls"

    // Zoom controls
    const zoomIn = this.createButton("+", () => this.zoom(0.1))
    const zoomOut = this.createButton("-", () => this.zoom(-0.1))
    const resetBtn = this.createButton("Reset", () => this.resetTransform())

    controls.appendChild(zoomOut)
    controls.appendChild(resetBtn)
    controls.appendChild(zoomIn)

    this.container.appendChild(controls)
  }

  private createButton(text: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button")
    button.textContent = text
    button.className = "mermaid-control-button"
    button.addEventListener("click", onClick)
    window.addCleanup(() => button.removeEventListener("click", onClick))
    return button
  }

  private onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return // Only handle left click
    this.isDragging = true
    this.startPan = { x: e.clientX - this.currentPan.x, y: e.clientY - this.currentPan.y }
    this.container.style.cursor = "grabbing"
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.isDragging) return
    e.preventDefault()

    this.currentPan = {
      x: e.clientX - this.startPan.x,
      y: e.clientY - this.startPan.y,
    }

    this.updateTransform()
  }

  private onMouseUp() {
    this.isDragging = false
    this.container.style.cursor = "grab"
  }

  private zoom(delta: number) {
    const newScale = Math.min(Math.max(this.scale + delta, this.MIN_SCALE), this.MAX_SCALE)

    // Zoom around center
    const rect = this.content.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const scaleDiff = newScale - this.scale
    this.currentPan.x -= centerX * scaleDiff
    this.currentPan.y -= centerY * scaleDiff

    this.scale = newScale
    this.updateTransform()
  }

  private updateTransform() {
    this.content.style.transform = `translate(${this.currentPan.x}px, ${this.currentPan.y}px) scale(${this.scale})`
  }

  private resetTransform() {
    this.scale = 1
    const svg = this.content.querySelector("svg")!
    this.currentPan = {
      x: svg.getBoundingClientRect().width / 2,
      y: svg.getBoundingClientRect().height / 2,
    }
    this.updateTransform()
  }
}

const cssVars = [
  "--secondary",
  "--tertiary",
  "--gray",
  "--light",
  "--lightgray",
  "--highlight",
  "--dark",
  "--darkgray",
  "--codeFont",
] as const

interface RgbColor {
  r: number
  g: number
  b: number
}

interface ContrastIssue {
  variable: string
  foreground: string
  background: string
  contrastRatio: string
  minRatio: number
  fallback: string
}

let lastMermaidContrastWarning = ""

function hexToRgb(value: string): RgbColor | null {
  const normalized = value.trim().replace("#", "")

  if (![3, 4, 6, 8].includes(normalized.length)) {
    return null
  }

  const expanded =
    normalized.length <= 4
      ? normalized
          .slice(0, 3)
          .split("")
          .map((channel) => channel + channel)
          .join("")
      : normalized.slice(0, 6)

  const r = parseInt(expanded.slice(0, 2), 16)
  const g = parseInt(expanded.slice(2, 4), 16)
  const b = parseInt(expanded.slice(4, 6), 16)

  if ([r, g, b].some((component) => Number.isNaN(component))) {
    return null
  }

  return { r, g, b }
}

function rgbStringToRgb(value: string): RgbColor | null {
  const match = value
    .trim()
    .match(/^rgba?\(\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*([0-9]+(?:\.[0-9]+)?)/i)

  if (!match) {
    return null
  }

  const r = Number(match[1])
  const g = Number(match[2])
  const b = Number(match[3])

  if ([r, g, b].some((component) => Number.isNaN(component) || component < 0 || component > 255)) {
    return null
  }

  return { r, g, b }
}

function parseColor(value: string): RgbColor | null {
  if (!value) return null
  return value.trim().startsWith("#") ? hexToRgb(value) : rgbStringToRgb(value)
}

function relativeLuminance(color: RgbColor): number {
  const toLinear = (channel: number): number => {
    const normalized = channel / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4)
  }

  const r = toLinear(color.r)
  const g = toLinear(color.g)
  const b = toLinear(color.b)

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function getContrastRatio(foreground: string, background: string): number | null {
  const fg = parseColor(foreground)
  const bg = parseColor(background)
  if (!fg || !bg) return null

  const lighter = Math.max(relativeLuminance(fg), relativeLuminance(bg))
  const darker = Math.min(relativeLuminance(fg), relativeLuminance(bg))
  return (lighter + 0.05) / (darker + 0.05)
}

function ensureContrast(params: {
  variable: string
  foreground: string
  background: string
  minRatio: number
  fallback: string
  issues: ContrastIssue[]
}): string {
  const { variable, foreground, background, minRatio, fallback, issues } = params
  const contrastRatio = getContrastRatio(foreground, background)

  if (contrastRatio !== null && contrastRatio < minRatio) {
    issues.push({
      variable,
      foreground,
      background,
      contrastRatio: contrastRatio.toFixed(2),
      minRatio,
      fallback,
    })
    return fallback
  }

  return foreground
}

function pickContrastingColor(params: {
  variable: string
  currentColor: string
  textColor: string
  minRatio: number
  candidates: string[]
  issues: ContrastIssue[]
}): string {
  const { variable, currentColor, textColor, minRatio, candidates, issues } = params
  const validCandidates = candidates.map((value) => value.trim()).filter((value) => value.length > 0)
  const currentContrast = getContrastRatio(textColor, currentColor)

  if (currentContrast !== null && currentContrast >= minRatio) {
    return currentColor
  }

  for (const candidate of validCandidates) {
    const candidateContrast = getContrastRatio(textColor, candidate)
    if (candidateContrast !== null && candidateContrast >= minRatio) {
      issues.push({
        variable,
        foreground: textColor,
        background: currentColor,
        contrastRatio: currentContrast?.toFixed(2) ?? "unknown",
        minRatio,
        fallback: candidate,
      })
      return candidate
    }
  }

  const fallback = validCandidates.at(-1) ?? currentColor
  issues.push({
    variable,
    foreground: textColor,
    background: currentColor,
    contrastRatio: currentContrast?.toFixed(2) ?? "unknown",
    minRatio,
    fallback,
  })
  return fallback
}

function pickReadableTextColor(params: {
  variable: string
  currentText: string
  background: string
  minRatio: number
  candidates: string[]
  issues: ContrastIssue[]
}): string {
  const { variable, currentText, background, minRatio, candidates, issues } = params
  const validCandidates = candidates.map((value) => value.trim()).filter((value) => value.length > 0)
  const currentContrast = getContrastRatio(currentText, background)

  if (currentContrast !== null && currentContrast >= minRatio) {
    return currentText
  }

  let bestCandidate = currentText
  let bestContrast = currentContrast ?? -1
  for (const candidate of validCandidates) {
    const contrastRatio = getContrastRatio(candidate, background)
    if (contrastRatio !== null && contrastRatio > bestContrast) {
      bestContrast = contrastRatio
      bestCandidate = candidate
    }
  }

  issues.push({
    variable,
    foreground: currentText,
    background,
    contrastRatio: currentContrast?.toFixed(2) ?? "unknown",
    minRatio,
    fallback: bestCandidate,
  })

  return bestCandidate
}

let mermaidImport = undefined
document.addEventListener("nav", async () => {
  const center = document.querySelector(".center") as HTMLElement
  const nodes = center.querySelectorAll("code.mermaid") as NodeListOf<HTMLElement>
  if (nodes.length === 0) return

  mermaidImport ||= await import(
    // @ts-ignore
    "https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.4.0/mermaid.esm.min.mjs"
  )
  const mermaid = mermaidImport.default

  const textMapping: WeakMap<HTMLElement, string> = new WeakMap()
  for (const node of nodes) {
    textMapping.set(node, node.innerText)
  }

  async function renderMermaid() {
    // de-init any other diagrams
    for (const node of nodes) {
      node.removeAttribute("data-processed")
      const oldText = textMapping.get(node)
      if (oldText) {
        node.innerHTML = oldText
      }
    }

    const computedStyleMap = cssVars.reduce(
      (acc, key) => {
        acc[key] = window.getComputedStyle(document.documentElement).getPropertyValue(key).trim()
        return acc
      },
      {} as Record<(typeof cssVars)[number], string>,
    )

    const darkMode = document.documentElement.getAttribute("saved-theme") === "dark"
    const contrastIssues: ContrastIssue[] = []
    const lightFallbackText = "#1f1f1f"
    const darkFallbackText = "#f0f0f0"
    const lightFallbackStroke = "#444444"
    const darkFallbackStroke = "#d0d0d0"
    const textCandidates = [
      computedStyleMap["--dark"],
      computedStyleMap["--darkgray"],
      computedStyleMap["--light"],
      computedStyleMap["--lightgray"],
      lightFallbackText,
      darkFallbackText,
    ]
    const primaryColor = computedStyleMap["--light"]
    const primaryTextColor = ensureContrast({
      variable: "primaryTextColor",
      foreground: computedStyleMap["--darkgray"],
      background: primaryColor,
      minRatio: 4.5,
      fallback: darkMode ? darkFallbackText : lightFallbackText,
      issues: contrastIssues,
    })
    const primaryBorderColor = ensureContrast({
      variable: "primaryBorderColor",
      foreground: computedStyleMap["--tertiary"],
      background: primaryColor,
      minRatio: 3,
      fallback: darkMode ? darkFallbackStroke : lightFallbackStroke,
      issues: contrastIssues,
    })
    const secondaryColor = pickContrastingColor({
      variable: "secondaryColor",
      currentColor: computedStyleMap["--secondary"],
      textColor: primaryTextColor,
      minRatio: 4.5,
      candidates: darkMode
        ? [computedStyleMap["--gray"], computedStyleMap["--darkgray"], "#3a3a3a"]
        : [computedStyleMap["--lightgray"], computedStyleMap["--gray"], "#e0e0e0"],
      issues: contrastIssues,
    })
    const tertiaryColor = pickContrastingColor({
      variable: "tertiaryColor",
      currentColor: computedStyleMap["--tertiary"],
      textColor: primaryTextColor,
      minRatio: 4.5,
      candidates: darkMode
        ? [computedStyleMap["--gray"], computedStyleMap["--darkgray"], "#3a3a3a"]
        : [computedStyleMap["--lightgray"], computedStyleMap["--gray"], "#e0e0e0"],
      issues: contrastIssues,
    })
    const secondaryTextColor = pickReadableTextColor({
      variable: "secondaryTextColor",
      currentText: primaryTextColor,
      background: secondaryColor,
      minRatio: 4.5,
      candidates: textCandidates,
      issues: contrastIssues,
    })
    const tertiaryTextColor = pickReadableTextColor({
      variable: "tertiaryTextColor",
      currentText: primaryTextColor,
      background: tertiaryColor,
      minRatio: 4.5,
      candidates: textCandidates,
      issues: contrastIssues,
    })
    const lineColor = ensureContrast({
      variable: "lineColor",
      foreground: computedStyleMap["--darkgray"],
      background: primaryColor,
      minRatio: 3,
      fallback: darkMode ? darkFallbackStroke : lightFallbackStroke,
      issues: contrastIssues,
    })
    const edgeLabelBackground = pickContrastingColor({
      variable: "edgeLabelBackground",
      currentColor: computedStyleMap["--highlight"],
      textColor: primaryTextColor,
      minRatio: 4.5,
      candidates: [primaryColor, secondaryColor, tertiaryColor, computedStyleMap["--lightgray"]],
      issues: contrastIssues,
    })

    if (contrastIssues.length > 0) {
      const issueKey = JSON.stringify({ darkMode, contrastIssues })
      if (issueKey !== lastMermaidContrastWarning) {
        lastMermaidContrastWarning = issueKey
        console.warn("[Quartz Mermaid] Applied contrast-safe fallback colors.", {
          mode: darkMode ? "dark" : "light",
          issues: contrastIssues,
          recommendation:
            "Adjust theme colors in quartz.config.ts to improve Mermaid readability and remove fallback substitutions.",
        })
      }
    }

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: darkMode ? "dark" : "base",
      themeVariables: {
        fontFamily: computedStyleMap["--codeFont"],
        textColor: primaryTextColor,
        titleColor: primaryTextColor,
        primaryColor,
        primaryTextColor,
        primaryBorderColor,
        secondaryTextColor,
        tertiaryTextColor,
        lineColor,
        secondaryColor,
        tertiaryColor,
        mainBkg: primaryColor,
        secondBkg: secondaryColor,
        tertiaryBkg: tertiaryColor,
        nodeBorder: primaryBorderColor,
        clusterBorder: primaryBorderColor,
        clusterBkg: primaryColor,
        edgeLabelBackground,
      },
    })

    await mermaid.run({ nodes })
  }

  await renderMermaid()
  document.addEventListener("themechange", renderMermaid)
  window.addCleanup(() => document.removeEventListener("themechange", renderMermaid))

  for (let i = 0; i < nodes.length; i++) {
    const codeBlock = nodes[i] as HTMLElement
    const pre = codeBlock.parentElement as HTMLPreElement
    const clipboardBtn = pre.querySelector(".clipboard-button") as HTMLButtonElement
    const expandBtn = pre.querySelector(".expand-button") as HTMLButtonElement

    const clipboardStyle = window.getComputedStyle(clipboardBtn)
    const clipboardWidth =
      clipboardBtn.offsetWidth +
      parseFloat(clipboardStyle.marginLeft || "0") +
      parseFloat(clipboardStyle.marginRight || "0")

    // Set expand button position
    expandBtn.style.right = `calc(${clipboardWidth}px + 0.3rem)`
    pre.prepend(expandBtn)

    // query popup container
    const popupContainer = pre.querySelector("#mermaid-container") as HTMLElement
    if (!popupContainer) return

    let panZoom: DiagramPanZoom | null = null
    function showMermaid() {
      const container = popupContainer.querySelector("#mermaid-space") as HTMLElement
      const content = popupContainer.querySelector(".mermaid-content") as HTMLElement
      if (!content) return
      removeAllChildren(content)

      // Clone the mermaid content
      const mermaidContent = codeBlock.querySelector("svg")!.cloneNode(true) as SVGElement
      content.appendChild(mermaidContent)

      // Show container
      popupContainer.classList.add("active")
      container.style.cursor = "grab"

      // Initialize pan-zoom after showing the popup
      panZoom = new DiagramPanZoom(container, content)
    }

    function hideMermaid() {
      popupContainer.classList.remove("active")
      panZoom?.cleanup()
      panZoom = null
    }

    expandBtn.addEventListener("click", showMermaid)
    registerEscapeHandler(popupContainer, hideMermaid)

    window.addCleanup(() => {
      panZoom?.cleanup()
      expandBtn.removeEventListener("click", showMermaid)
    })
  }
})
